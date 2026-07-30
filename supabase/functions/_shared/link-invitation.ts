// Vínculo padrão de colaboradores convidados.
// Garante SEMPRE: profile criado, role correta, vínculo (user_sst_managers /
// user_companies) e contexto ativo no profile. Usado tanto no aceite quanto no
// cadastro direto via convite, para nunca sobrar usuário sem vínculo.

export interface InvitationLike {
  id: string;
  account_type: string;
  sst_manager_id?: string | null;
  company_id?: string | null;
  email: string;
}

export async function linkInvitedUser(
  admin: any,
  userId: string,
  inv: InvitationLike,
  fullName?: string | null,
): Promise<void> {
  const targetRole = inv.account_type === "sst" ? "sst" : "company";

  // 1. Profile sempre existente
  const { data: prof } = await admin
    .from("profiles")
    .select("id, full_name, sst_manager_id, company_id")
    .eq("id", userId)
    .maybeSingle();

  if (!prof) {
    await admin.from("profiles").insert({
      id: userId,
      full_name: fullName ?? null,
      sst_manager_id: inv.account_type === "sst" ? inv.sst_manager_id ?? null : null,
      company_id: inv.account_type === "sst" ? null : inv.company_id ?? null,
      must_change_password: false,
    });
  }

  // 2. Role
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => r.role === targetRole)) {
    await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "pending");
    await admin.from("user_roles").insert({ user_id: userId, role: targetRole });
  }

  // 3. Vínculo + contexto ativo
  if (inv.account_type === "sst" && inv.sst_manager_id) {
    const { data: link } = await admin
      .from("user_sst_managers")
      .select("id")
      .eq("user_id", userId)
      .eq("sst_manager_id", inv.sst_manager_id)
      .maybeSingle();
    if (!link) {
      await admin
        .from("user_sst_managers")
        .insert({ user_id: userId, sst_manager_id: inv.sst_manager_id, is_default: false });
    }
    if (prof && !prof.sst_manager_id) {
      await admin.from("profiles").update({ sst_manager_id: inv.sst_manager_id }).eq("id", userId);
    }
  } else if (inv.company_id) {
    const { data: link } = await admin
      .from("user_companies")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", inv.company_id)
      .maybeSingle();
    if (!link) {
      await admin
        .from("user_companies")
        .insert({ user_id: userId, company_id: inv.company_id, is_default: false });
    }
    if (prof && !prof.company_id) {
      await admin.from("profiles").update({ company_id: inv.company_id }).eq("id", userId);
    }
  }
}

export async function markInvitationAccepted(admin: any, invId: string, userId: string) {
  await admin
    .from("account_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", invId);
}
