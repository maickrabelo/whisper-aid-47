import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2, Search, Shield, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAEPBetaAccess } from '@/hooks/useAEPBetaAccess';

interface CompanyRow {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
}

export default function AEPHub() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useRealAuth();
  const { toast } = useToast();
  const { allowed: aepAllowed, loading: aepLoading } = useAEPBetaAccess();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || aepLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!aepAllowed) {
      toast({ title: 'Acesso negado', description: 'Você não tem permissão para acessar a AEP.', variant: 'destructive' });
      navigate(role === 'admin' ? '/master-dashboard' : role === 'company' ? '/dashboard' : '/sst-dashboard');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        if (role === 'company') {
          const [{ data: profile }, { data: uc }] = await Promise.all([
            supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle(),
            supabase.from('user_companies').select('company_id').eq('user_id', user.id),
          ]);
          const ids = new Set<string>();
          if (profile?.company_id) ids.add(profile.company_id);
          (uc || []).forEach((r: any) => r.company_id && ids.add(r.company_id));
          if (ids.size === 0) { setCompanies([]); return; }
          const { data } = await supabase
            .from('companies')
            .select('id, name, logo_url, cnpj')
            .in('id', Array.from(ids));
          setCompanies((data || []) as CompanyRow[]);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('sst_manager_id')
            .eq('id', user.id)
            .maybeSingle();
          const sstId = profile?.sst_manager_id;
          if (!sstId) { setCompanies([]); return; }
          const { data: assignments } = await supabase
            .from('company_sst_assignments')
            .select('companies:company_id(id, name, logo_url, cnpj)')
            .eq('sst_manager_id', sstId)
            .limit(5000);
          const list = ((assignments || []).map((a: any) => a.companies).filter(Boolean)) as CompanyRow[];
          list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setCompanies(list);
        }
      } catch (e: any) {
        toast({ title: 'Erro ao carregar empresas', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role, authLoading, aepAllowed, aepLoading, navigate, toast]);

  const filtered = companies.filter(c => {
    const t = search.toLowerCase().trim();
    if (!t) return true;
    return c.name.toLowerCase().includes(t) || (c.cnpj || '').toLowerCase().includes(t);
  });

  const backPath =
    role === 'admin' ? '/master-dashboard'
    : role === 'company' ? '/dashboard'
    : '/sst-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-secondary py-10 md:py-14">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="mb-4 gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-4">
                <Shield className="h-4 w-4" />
                <span>AEP — NR-17</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                <ClipboardCheck className="h-8 w-8" />
                Avaliação Ergonômica Preliminar
              </h1>
              <p className="text-white/70 mt-2 max-w-2xl">
                Selecione uma empresa para acessar as AEPs, importar avaliações e alimentar o PGR.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
              <p className="text-muted-foreground text-sm">Clique para abrir a AEP da empresa</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma empresa encontrada.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c, idx) => (
                <Card
                  key={c.id}
                  className="overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 cursor-pointer border border-border animate-fade-in"
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onClick={() => navigate(`/aep/${c.id}`)}
                >
                  <div className="h-28 bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4 group-hover:from-primary/10 group-hover:to-secondary/10 transition-colors duration-500">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={`Logo ${c.name}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Building2 className="h-10 w-10 text-primary/40" />
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    {c.cnpj && <p className="text-xs text-muted-foreground mt-1">{c.cnpj}</p>}
                    <div className="flex items-center text-sm font-medium text-primary mt-4 group-hover:gap-2 transition-all">
                      Abrir AEP <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
