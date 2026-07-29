import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWelcomeEmail } from "../_shared/welcome-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseCaller.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller has role 'sst' or 'admin'
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (!callerRole || !["sst", "admin"].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: "Sem permissão. Apenas gestores SST ou admins podem criar usuários de empresa." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id, email, cnpj, company_name } = await req.json();

    if (!company_id || !email || !cnpj) {
      return new Response(
        JSON.stringify({ error: "company_id, email e cnpj são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      return new Response(
        JSON.stringify({ error: "CNPJ deve ter pelo menos 11 dígitos numéricos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === normalizedEmail);

    if (existingUser) {
      // User exists — check which companies they already have access to
      const { data: existingCompanies } = await supabaseAdmin
        .from("user_companies")
        .select("company_id, companies:company_id(name)")
        .eq("user_id", existingUser.id);

      const alreadyHasThisCompany = existingCompanies?.some(
        (uc: any) => uc.company_id === company_id
      );

      if (alreadyHasThisCompany) {
        return new Response(
          JSON.stringify({ error: "Este email já tem acesso a esta empresa." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get existing company names for the response
      const existingCompanyNames = existingCompanies
        ?.map((uc: any) => uc.companies?.name)
        .filter(Boolean) || [];

      // Add user_companies entry
      const { error: ucError } = await supabaseAdmin
        .from("user_companies")
        .insert({
          user_id: existingUser.id,
          company_id: company_id,
          is_default: false,
        });

      if (ucError) {
        console.error("Error inserting user_companies:", ucError);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular usuário à empresa." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profiles.company_id to the new company (active company)
      await supabaseAdmin
        .from("profiles")
        .update({ company_id: company_id })
        .eq("id", existingUser.id);

      await sendWelcomeEmail(supabaseAdmin, {
        email: normalizedEmail,
        name: company_name || "Empresa",
        accountType: "company",
        existingUser: true,
        context: "create-company-user",
      });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          existing_user: true,
          existing_companies: existingCompanyNames,
          message: `Usuário já existente. Empresa adicionada ao acesso. Este email já tinha acesso a: ${existingCompanyNames.join(", ")}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user — create auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: cnpjDigits,
      email_confirm: true,
      user_metadata: {
        full_name: company_name || "Empresa",
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Update profile
    await supabaseAdmin
      .from("profiles")
      .update({
        company_id: company_id,
        must_change_password: true,
        full_name: company_name || "Empresa",
      })
      .eq("id", userId);

    // Update role to 'company'
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "company" })
      .eq("user_id", userId);

    if (roleError) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "company" });
    }

    // Add user_companies entry
    await supabaseAdmin
      .from("user_companies")
      .insert({
        user_id: userId,
        company_id: company_id,
        is_default: true,
      });

    await sendWelcomeEmail(supabaseAdmin, {
      email: normalizedEmail,
      password: cnpjDigits,
      name: company_name || "Empresa",
      accountType: "company",
      context: "create-company-user",
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        existing_user: false,
        message: `Usuário criado com sucesso. Senha inicial: CNPJ (${cnpjDigits.substring(0, 4)}****)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
