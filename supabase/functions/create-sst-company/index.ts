import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const extractCnpjDigits = (cnpj: string) => String(cnpj ?? "").replace(/\D/g, "");

const generateSlug = (name: string): string =>
  String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60) || `empresa-${Date.now().toString(36)}`;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const businessError = (body: Record<string, unknown>) =>
  json({ success: false, ...body });

const ensureCompanyAccess = async (
  supabase: any,
  company: { id: string; name: string; email: string; cnpj: string },
  initialPassword: string,
) => {
  const normalizedEmail = String(company.email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: existingList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuth = existingList?.users?.find(
    (u: any) => u.email?.toLowerCase() === normalizedEmail,
  );

  let companyUserId: string;
  if (existingAuth) {
    // Never attach a manager/admin/sales login to a company: a later company
    // password reset would reset the manager's own login.
    const { data: privRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", existingAuth.id)
      .in("role", ["sst", "admin", "sales", "partner", "affiliate"]);
    if (privRoles?.length) {
      console.log("Skipping company login: email belongs to a privileged account");
      return null;
    }
    companyUserId = existingAuth.id;
  } else {
    const { data: createdUser, error: createUserErr } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { full_name: company.name },
    });
    if (createUserErr) throw createUserErr;
    companyUserId = createdUser.user!.id;
  }

  await sendWelcomeEmail(supabase, {
    email: normalizedEmail,
    password: initialPassword,
    name: company.name,
    accountType: "company",
    existingUser: !!existingAuth,
    context: "create-sst-company",
  });

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("company_id, full_name, must_change_password")
    .eq("id", companyUserId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .upsert(
      {
        id: companyUserId,
        full_name: currentProfile?.full_name || company.name,
        company_id: currentProfile?.company_id || company.id,
        must_change_password: currentProfile?.must_change_password ?? true,
      },
      { onConflict: "id" },
    );

  // Ensure the user has the 'company' role for this company.
  // IMPORTANT: do NOT delete other roles (e.g. 'sst', 'admin'). A gestora SST may
  // reuse the same email for her own company; removing the 'sst' role here would
  // break her ability to manage assessments via SST policies.
  const { data: existingCompanyRoles } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", companyUserId)
    .eq("role", "company")
    .limit(1);
  if (!existingCompanyRoles?.length) {
    await supabase.from("user_roles").insert({ user_id: companyUserId, role: "company" });
  }

  const { data: existingCompanyLinks } = await supabase
    .from("user_companies")
    .select("id")
    .eq("user_id", companyUserId)
    .eq("company_id", company.id)
    .limit(1);
  if (!existingCompanyLinks?.length) {
    await supabase.from("user_companies").insert({ user_id: companyUserId, company_id: company.id });
  }

  return companyUserId;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida." }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const userId = userData.user.id;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = roles?.some((r: any) => r.role === "admin") ?? false;
    const isSst = roles?.some((r: any) => r.role === "sst") ?? false;
    if (!isAdmin && !isSst) {
      return json({ error: "Sem permissão para cadastrar empresas." }, 403);
    }

    const body = await req.json();
    const requestedSstManagerId = String(body.sst_manager_id ?? "");
    const name = String(body.name ?? "").trim();
    const cnpj = String(body.cnpj ?? "").trim();
    const cnpjDigits = extractCnpjDigits(cnpj);
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const address = body.address ? String(body.address).trim() : null;
    const logoUrl = body.logo_url ? String(body.logo_url) : null;
    const employeeCount = Number.parseInt(String(body.employee_count ?? ""), 10);

    if (!requestedSstManagerId) return json({ error: "Gestora SST não informada." }, 400);
    if (!name) return json({ error: "Nome da empresa obrigatório." }, 400);
    if (!email) return json({ error: "Email da empresa obrigatório." }, 400);
    if (cnpjDigits.length < 11) return json({ error: "CNPJ inválido." }, 400);
    if (!Number.isFinite(employeeCount) || employeeCount < 1) {
      return json({ error: "Quantidade de colaboradores inválida." }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("sst_manager_id")
      .eq("id", userId)
      .maybeSingle();

    const sstManagerId = isAdmin ? requestedSstManagerId : profile?.sst_manager_id;
    if (!sstManagerId || sstManagerId !== requestedSstManagerId) {
      return json({ error: "Usuário não vinculado a esta gestora SST." }, 403);
    }

    const { data: manager, error: managerErr } = await supabase
      .from("sst_managers")
      .select("id, max_companies, extra_company_slots")
      .eq("id", sstManagerId)
      .single();
    if (managerErr || !manager) return json({ error: "Gestora SST não encontrada." }, 404);

    // Descobrir flags do plano (alguns planos SMS não criam login por empresa)
    let planCreateCompanyLogin = true;
    let planOuvidoriaEnabled = true;
    try {
      const { data: managerProfiles } = await supabase
        .from("profiles").select("id").eq("sst_manager_id", sstManagerId);
      const ownerIds = (managerProfiles ?? []).map((p: any) => p.id);
      if (ownerIds.length > 0) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("subscription_plans(create_company_login, ouvidoria_enabled)")
          .in("owner_user_id", ownerIds)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const sp: any = (sub as any)?.subscription_plans;
        if (sp) {
          planCreateCompanyLogin = sp.create_company_login ?? true;
          planOuvidoriaEnabled = sp.ouvidoria_enabled ?? true;
        }
      }
    } catch (_e) { /* ignore, keep defaults */ }

    const { count: currentCount, error: countErr } = await supabase
      .from("company_sst_assignments")
      .select("company_id", { count: "exact", head: true })
      .eq("sst_manager_id", sstManagerId);
    if (countErr) throw countErr;

    const effectiveLimit = (manager.max_companies ?? 50) + (manager.extra_company_slots ?? 0);
    const hasAvailableSlot = (currentCount ?? 0) < effectiveLimit;

    const { data: candidateCompanies, error: candidateErr } = await supabase
      .from("companies")
      .select("id, name, cnpj")
      .in("cnpj", Array.from(new Set([cnpj, cnpjDigits])));
    if (candidateErr) throw candidateErr;

    const existingCompany = (candidateCompanies ?? []).find(
      (company: any) => extractCnpjDigits(company.cnpj) === cnpjDigits,
    );

    if (existingCompany) {
      const { data: assignments, error: assignmentsErr } = await supabase
        .from("company_sst_assignments")
        .select("sst_manager_id")
        .eq("company_id", existingCompany.id);
      if (assignmentsErr) throw assignmentsErr;

      if ((assignments ?? []).some((a: any) => a.sst_manager_id === sstManagerId)) {
        const { error: updateErr } = await supabase
          .from("companies")
          .update({
            name,
            email,
            phone,
            address,
            logo_url: logoUrl,
            subscription_status: "active",
            employee_count: employeeCount,
          })
          .eq("id", existingCompany.id);
        if (updateErr) throw updateErr;

        await supabase.from("company_feature_access").upsert({
          company_id: existingCompany.id,
          ouvidoria_enabled: planOuvidoriaEnabled,
          psicossocial_enabled: true,
          burnout_enabled: true,
          clima_enabled: true,
          treinamentos_enabled: true,
        });

        if (planCreateCompanyLogin) {
          await ensureCompanyAccess(
          supabase,
          { id: existingCompany.id, name, email, cnpj },
          cnpjDigits,
        );
        }

        return json({ success: true, company_id: existingCompany.id, already_linked: true });
      }

      if ((assignments ?? []).length > 0) {
        return businessError({ error: "Este CNPJ já está cadastrado e vinculado a outra gestora.", code: "linked_elsewhere" });
      }

      if (!hasAvailableSlot) {
        return businessError({
          error: `Limite de ${effectiveLimit} empresas atingido para este gestor SST`,
          code: "limit_reached",
          current_count: currentCount ?? 0,
          effective_limit: effectiveLimit,
          orphan_company_id: existingCompany.id,
        });
      }

      const { error: updateErr } = await supabase
        .from("companies")
        .update({
          name,
          email,
          phone,
          address,
          logo_url: logoUrl,
          subscription_status: "active",
          employee_count: employeeCount,
        })
        .eq("id", existingCompany.id);
      if (updateErr) throw updateErr;

      const { error: linkErr } = await supabase
        .from("company_sst_assignments")
        .insert({ company_id: existingCompany.id, sst_manager_id: sstManagerId });
      if (linkErr) throw linkErr;

      await supabase.from("company_feature_access").upsert({
        company_id: existingCompany.id,
        ouvidoria_enabled: planOuvidoriaEnabled,
        psicossocial_enabled: true,
        burnout_enabled: true,
        clima_enabled: true,
        treinamentos_enabled: true,
      });

      if (planCreateCompanyLogin) {
          await ensureCompanyAccess(
        supabase,
        { id: existingCompany.id, name, email, cnpj },
        cnpjDigits,
      );
        }

      return json({ success: true, company_id: existingCompany.id, recovered_orphan: true });
    }

    if (!hasAvailableSlot) {
      return businessError({
        error: `Limite de ${effectiveLimit} empresas atingido para este gestor SST`,
        code: "limit_reached",
        current_count: currentCount ?? 0,
        effective_limit: effectiveLimit,
      });
    }

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    for (let suffix = 1; suffix <= 100; suffix++) {
      const { data: slugExists, error: slugErr } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (slugErr) throw slugErr;
      if (!slugExists) break;
      slug = `${baseSlug}-${suffix}`;
      if (suffix === 100) return json({ error: "Não foi possível gerar um identificador único." }, 500);
    }

    const newCompanyId = crypto.randomUUID();
    const { error: companyErr } = await supabase.from("companies").insert({
      id: newCompanyId,
      name,
      cnpj,
      email,
      phone,
      address,
      logo_url: logoUrl,
      slug,
      subscription_status: "active",
      employee_count: employeeCount,
    });
    if (companyErr) throw companyErr;

    const { error: assignmentErr } = await supabase
      .from("company_sst_assignments")
      .insert({ company_id: newCompanyId, sst_manager_id: sstManagerId });
    if (assignmentErr) {
      await supabase.from("companies").delete().eq("id", newCompanyId);
      throw assignmentErr;
    }

    await supabase.from("company_feature_access").upsert({
      company_id: newCompanyId,
      ouvidoria_enabled: planOuvidoriaEnabled,
      psicossocial_enabled: true,
      burnout_enabled: true,
      clima_enabled: true,
      treinamentos_enabled: true,
    });

    // Create company access user (or link existing) using CNPJ-derived password
    try {
      // Initial password = full CNPJ digits (consistent with what is shown to user)
      const initialPassword = cnpjDigits;
      if (planCreateCompanyLogin) {
          await ensureCompanyAccess(
        supabase,
        { id: newCompanyId, name, email, cnpj },
        initialPassword,
      );
        }
    } catch (userCreationErr: any) {
      console.error("[CREATE-SST-COMPANY] User creation failed (company still created)", userCreationErr);
    }

    return json({ success: true, company_id: newCompanyId, recovered_orphan: false });
  } catch (error: any) {
    console.error("[CREATE-SST-COMPANY] ERROR", error);
    return json({ error: error?.message ?? "Erro interno ao cadastrar empresa." }, 500);
  }
});
