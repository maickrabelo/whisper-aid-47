import { supabase } from '@/integrations/supabase/client';
import { needsHotmartProfileCompletion } from '@/lib/profileCompletion';

export type ResolvedRole =
  | 'admin'
  | 'sst'
  | 'company'
  | 'sales'
  | 'partner'
  | 'affiliate'
  | 'sector_viewer'
  | 'pending'
  | null;

const ROLE_HOME: Record<string, string> = {
  admin: '/master-dashboard',
  sst: '/sst-dashboard',
  company: '/dashboard',
  sales: '/sales-dashboard',
  partner: '/parceiro/dashboard',
  affiliate: '/afiliado/dashboard',
  sector_viewer: '/setor/dashboard',
  pending: '/',
};

export function homePathForRole(role: ResolvedRole): string {
  if (!role) return '/dashboard';
  return ROLE_HOME[role] ?? '/dashboard';
}

/**
 * Resolves where a freshly authenticated user should land, independently of
 * React context state. Every step is fault tolerant: if any lookup fails we
 * still return a usable destination so the user is never stuck on the login
 * screen ("Login realizado" with no navigation).
 */
export async function resolvePostLoginPath(userId: string): Promise<string> {
  let role: ResolvedRole = null;

  try {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const roles = (data ?? []).map((r: any) => r.role as string);
    const meaningful = roles.filter((r) => r !== 'pending');
    const all = meaningful.length > 0 ? meaningful : roles;
    const priority = ['admin', 'sst', 'company', 'sales', 'partner', 'affiliate', 'sector_viewer'];
    role = ((priority.find((r) => all.includes(r)) ?? all[0]) as ResolvedRole) ?? null;
  } catch (e) {
    console.error('resolvePostLoginPath: role lookup failed', e);
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('must_change_password, company_id')
      .eq('id', userId)
      .maybeSingle();

    if ((profile as any)?.must_change_password) return '/change-password';

    if (role === 'company' || role === 'sst') {
      if (await needsHotmartProfileCompletion(userId)) return '/completar-cadastro';
    }

    if (role === 'company') {
      const { data: companies } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId);
      if ((companies?.length ?? 0) > 1) return '/select-company';
    }
  } catch (e) {
    console.error('resolvePostLoginPath: profile lookup failed', e);
  }

  return homePathForRole(role);
}
