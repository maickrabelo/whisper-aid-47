import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { sendAccessLog } from '@/hooks/useAccessLogger';

type UserRole = 'admin' | 'company' | 'sst' | 'pending' | 'partner' | 'affiliate' | 'sales' | null;

interface Profile {
  id: string;
  full_name: string | null;
  company_id: string | null;
  sst_manager_id: string | null;
  must_change_password: boolean | null;
  password_reset_reason: string | null;
}

export interface UserCompany {
  id: string;
  name: string;
  cnpj: string | null;
  logo_url: string | null;
}

export type PaymentStatus = 'ok' | 'overdue_warning' | 'overdue_critical' | 'blocked';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  availableRoles: UserRole[];
  switchRole: (newRole: UserRole) => void;
  isLoading: boolean;
  isTrialExpired: boolean;
  trialEndsAt: string | null;
  paymentStatus: PaymentStatus;
  daysOverdue: number;
  companies: UserCompany[];
  activeCompanyId: string | null;
  switchCompany: (companyId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  refreshTrialStatus: () => Promise<void>;
}


const ROLE_OVERRIDE_KEY = 'active_role_override';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const RealAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const hasInitializedRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserRole = async (userId: string): Promise<{ role: UserRole; all: UserRole[] }> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data || data.length === 0) return { role: null, all: [] };

      const roles = data.map((r: any) => r.role as UserRole);
      const meaningful = roles.filter(r => r !== 'pending');
      const all = (meaningful.length > 0 ? meaningful : roles);

      // Honor override if available
      const override = (typeof window !== 'undefined' ? window.localStorage.getItem(ROLE_OVERRIDE_KEY) : null) as UserRole | null;
      if (override && all.includes(override)) return { role: override, all };

      // Prefer sst over company when both exist so managers land on their main dashboard
      const priority: UserRole[] = ['admin', 'sst', 'company', 'sales', 'partner', 'affiliate'];
      const active = priority.find(r => all.includes(r)) ?? all[0] ?? null;
      return { role: active, all };
    } catch (error) {
      console.error('Error fetching user role:', error);
      return { role: null, all: [] };
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as any;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const fetchUserCompanies = async (userId: string): Promise<UserCompany[]> => {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id, companies:company_id(id, name, cnpj, logo_url)')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data) return [];

      return data
        .map((row: any) => row.companies)
        .filter(Boolean)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          cnpj: c.cnpj,
          logo_url: c.logo_url,
        }));
    } catch (error) {
      console.error('Error fetching user companies:', error);
      return [];
    }
  };

  const switchCompany = async (companyId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', user.id);

      if (error) throw error;

      setActiveCompanyId(companyId);
      setProfile(prev => prev ? { ...prev, company_id: companyId } : prev);
      await checkTrialStatus(companyId, profile?.sst_manager_id ?? null);
      
      const selected = companies.find(c => c.id === companyId);
      toast({
        title: "Empresa alterada",
        description: `Agora acessando: ${selected?.name || 'Empresa'}`,
      });
    } catch (error: any) {
      console.error('Error switching company:', error);
      toast({
        title: "Erro ao trocar empresa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkTrialStatus = async (companyId: string | null, sstManagerId: string | null) => {
    // Skip trial check if no company or SST manager linked
    if (!companyId && !sstManagerId) {
      setIsTrialExpired(false);
      setTrialEndsAt(null);
      return;
    }

    const [companyResult, sstResult] = await Promise.all([
      companyId
        ? supabase.from('companies').select('subscription_status, trial_ends_at').eq('id', companyId).single()
        : Promise.resolve({ data: null }),
      sstManagerId
        ? supabase.from('sst_managers').select('subscription_status, trial_ends_at').eq('id', sstManagerId).single()
        : Promise.resolve({ data: null }),
    ]);

    const trialStatuses = ['trial', 'trialing'];

    const company = companyResult?.data;
    if (company?.subscription_status && trialStatuses.includes(company.subscription_status) && company?.trial_ends_at) {
      setTrialEndsAt(company.trial_ends_at);
      setIsTrialExpired(new Date() > new Date(company.trial_ends_at));
      return;
    }

    const sstManager = sstResult?.data;
    if (sstManager?.subscription_status && trialStatuses.includes(sstManager.subscription_status) && sstManager?.trial_ends_at) {
      setTrialEndsAt(sstManager.trial_ends_at);
      setIsTrialExpired(new Date() > new Date(sstManager.trial_ends_at));
      return;
    }

    setIsTrialExpired(false);
    setTrialEndsAt(null);
  };

  const loadFullUserData = async (userId: string) => {
    const [roleResult, userProfile] = await Promise.all([
      fetchUserRole(userId),
      fetchProfile(userId),
    ]);
    const userRole = roleResult.role;
    const userAvailableRoles = roleResult.all;

    // Skip fetching companies for roles that don't need them
    const skipCompanies = userRole === 'affiliate' || userRole === 'partner' || userRole === 'admin' || userRole === 'pending';
    const userCompanies = skipCompanies ? [] : await fetchUserCompanies(userId);

    return { userRole, userAvailableRoles, userProfile, userCompanies };
  };

  const refreshRole = async () => {
    if (user) {
      const { userRole, userAvailableRoles, userProfile, userCompanies } = await loadFullUserData(user.id);
      setRole(userRole);
      setAvailableRoles(userAvailableRoles);
      setProfile(userProfile);
      setCompanies(userCompanies);
      setActiveCompanyId(userProfile?.company_id ?? null);
      await checkTrialStatus(userProfile?.company_id ?? null, userProfile?.sst_manager_id ?? null);
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!newRole || !availableRoles.includes(newRole)) return;
    try { window.localStorage.setItem(ROLE_OVERRIDE_KEY, String(newRole)); } catch {}
    setRole(newRole);
    hasRedirectedRef.current = true;
    if (newRole === 'sst') navigate('/sst-dashboard');
    else if (newRole === 'company') navigate('/dashboard');
    else if (newRole === 'admin') navigate('/master-dashboard');
    else if (newRole === 'partner') navigate('/parceiro/dashboard');
    else if (newRole === 'affiliate') navigate('/afiliado/dashboard');
    else if (newRole === 'sales') navigate('/sales-dashboard');
  };

  const navigateByRole = async (userRole: UserRole, userProfile: Profile | null, userCompanies: UserCompany[]) => {
    if (userProfile?.must_change_password) {
      navigate('/change-password');
      return;
    }
    // Hotmart users that haven't filled CPF/CNPJ/Phone/Address yet
    if (userProfile && (userRole === 'company' || userRole === 'sst')) {
      try {
        const { needsHotmartProfileCompletion } = await import('@/lib/profileCompletion');
        if (await needsHotmartProfileCompletion(userProfile.id)) {
          navigate('/completar-cadastro');
          return;
        }
      } catch {}
    }
    if (userRole === 'pending') {
      navigate('/');
    } else if (userRole === 'company' && userCompanies.length > 1) {
      navigate('/select-company');
    } else if (userRole === 'admin') {
      navigate('/master-dashboard');
    } else if (userRole === 'company') {
      navigate('/dashboard');
    } else if (userRole === 'sst') {
      navigate('/sst-dashboard');
    } else if (userRole === 'partner') {
      navigate('/parceiro/dashboard');
    } else if (userRole === 'affiliate') {
      navigate('/afiliado/dashboard');
    } else if ((userRole as string) === 'sales') {
      navigate('/sales-dashboard');
    } else if ((userRole as string) === 'sector_viewer') {
      navigate('/setor/dashboard');
    }
  };

  const isPublicEntryPage = (path: string) => {
    return (
      path === '/auth' ||
      path === '/sms/auth' ||
      path === '/sms' ||
      path === '/' ||
      path.startsWith('/sst/') ||
      path.startsWith('/i/') ||
      path.startsWith('/convite/') ||
      path === '/afiliado/cadastro' ||
      path === '/parceiro/cadastro'
    );
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        const nextUserId = session?.user?.id ?? null;
        const isSameUserSession = currentUserIdRef.current === nextUserId;

        if (event === 'TOKEN_REFRESHED' && isSameUserSession) {
          return;
        }

        if (event === 'SIGNED_IN' && hasInitializedRef.current && isSameUserSession) {
          // Even if same user, still redirect if on login page (re-login scenario)
          const currentPath = window.location.pathname;
          if (isPublicEntryPage(currentPath) && !hasRedirectedRef.current && role) {
            hasRedirectedRef.current = true;
            navigateByRole(role, profile, companies);
          }
          return;
        }

        setSession(prev => {
          if (prev?.user?.id === nextUserId) return prev;
          return session;
        });
        setUser(prev => {
          if (prev?.id === nextUserId) return prev;
          return session?.user ?? null;
        });
        currentUserIdRef.current = nextUserId;

        if (event === 'SIGNED_OUT') {
          sendAccessLog({
            event_type: 'logout',
            page_path: window.location.pathname,
            user_id: session?.user?.id ?? null,
            user_email: session?.user?.email ?? null,
          });
          setRole(null);
          setProfile(null);
          setCompanies([]);
          setActiveCompanyId(null);
          setIsTrialExpired(false);
          setTrialEndsAt(null);
          currentUserIdRef.current = null;
          hasRedirectedRef.current = false;
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            if (!isMounted) return;
            const { userRole, userAvailableRoles, userProfile, userCompanies } = await loadFullUserData(session.user.id);
            if (!isMounted) return;
            setRole(userRole);
            setAvailableRoles(userAvailableRoles);
            setProfile(userProfile);
            setCompanies(userCompanies);
            setActiveCompanyId(userProfile?.company_id ?? null);
            await checkTrialStatus(userProfile?.company_id ?? null, userProfile?.sst_manager_id ?? null);

            sendAccessLog({
              event_type: 'login',
              page_path: window.location.pathname,
              user_id: session.user.id,
              user_email: session.user.email ?? null,
              user_role: userRole ?? null,
            });

            const currentPath = window.location.pathname;
            if (hasInitializedRef.current && !hasRedirectedRef.current && isPublicEntryPage(currentPath)) {
              hasRedirectedRef.current = true;
              navigateByRole(userRole, userProfile, userCompanies);
            }
          }, 0);
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        currentUserIdRef.current = session?.user?.id ?? null;

        if (session?.user) {
          const { userRole, userAvailableRoles, userProfile, userCompanies } = await loadFullUserData(session.user.id);
          if (!isMounted) return;
          setRole(userRole);
          setAvailableRoles(userAvailableRoles);
          setProfile(userProfile);
          setCompanies(userCompanies);
          setActiveCompanyId(userProfile?.company_id ?? null);
          await checkTrialStatus(userProfile?.company_id ?? null, userProfile?.sst_manager_id ?? null);

          // Redirect if user is already logged in and on the login page
          const currentPath = window.location.pathname;
          if (isPublicEntryPage(currentPath)) {
            hasRedirectedRef.current = true;
            navigateByRole(userRole, userProfile, userCompanies);
          }
        }
      } finally {
        if (isMounted) {
          hasInitializedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Check if user has an SMS plan to redirect correctly after logout
      let isSmsPlan = false;
      try {
        const currentUser = user ?? (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          const { data } = await (supabase as any)
            .from('subscriptions')
            .select('subscription_plans!inner(slug)')
            .eq('owner_user_id', currentUser.id)
            .in('status', ['active', 'trial', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const slug = (data as any)?.subscription_plans?.slug as string | undefined;
          isSmsPlan = !!slug && slug.toLowerCase().includes('sms');
        }
      } catch {
        // ignore query errors and fallback to normal auth
      }

      try { window.localStorage.removeItem(ROLE_OVERRIDE_KEY); } catch {}
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setAvailableRoles([]);
      setProfile(null);
      setCompanies([]);
      setActiveCompanyId(null);
      setIsTrialExpired(false);
      setTrialEndsAt(null);
      hasRedirectedRef.current = false;
      navigate(isSmsPlan ? '/sms/auth' : '/auth');
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshTrialStatus = async () => {
    await checkTrialStatus(profile?.company_id ?? null, profile?.sst_manager_id ?? null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, profile, role, availableRoles, switchRole,
      isLoading, isTrialExpired, trialEndsAt, 
      companies, activeCompanyId, switchCompany,
      signOut, refreshRole, refreshTrialStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useRealAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useRealAuth must be used within a RealAuthProvider');
  }
  return context;
};
