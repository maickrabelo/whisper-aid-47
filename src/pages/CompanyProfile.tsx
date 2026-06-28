import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { Upload, Loader2, Building2, Plus, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AddCompanyDialog from '@/components/AddCompanyDialog';
import TeamManagementCard from '@/components/collaborators/TeamManagementCard';
import { Link } from 'react-router-dom';

interface CompanyData {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  slug: string | null;
  trial_plan_slug: string | null;
}

const CompanyProfile = () => {
  const { profile, companies, activeCompanyId, switchCompany, refreshRole } = useRealAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  const companyId = activeCompanyId || profile?.company_id || null;

  const loadCompany = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, cnpj, email, phone, address, logo_url, slug, trial_plan_slug')
      .eq('id', companyId)
      .maybeSingle();
    if (!error && data) {
      setCompany(data as CompanyData);
      setForm({ name: data.name || '', phone: data.phone || '', address: data.address || '' });
    }
    setLoading(false);
  };

  useEffect(() => { loadCompany(); }, [companyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: form.name, phone: form.phone, address: form.address })
        .eq('id', company.id);
      if (error) throw error;
      toast({ title: 'Cadastro atualizado', description: 'Os dados foram salvos.' });
      await loadCompany();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    console.log('[Logo upload] file selected:', file?.name, 'company:', company?.id);
    if (!file) return;
    if (!company) {
      toast({ title: 'Empresa não carregada', description: 'Recarregue a página e tente novamente.', variant: 'destructive' });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo grande', description: 'Logo deve ter até 2MB.', variant: 'destructive' });
      input.value = '';
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `${company.id}/logo-${Date.now()}.${ext}`;
      console.log('[Logo upload] uploading to', path);
      const { error: upErr } = await supabase.storage
        .from('company-logos').upload(path, file, { upsert: true, contentType: file.type || 'image/png', cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('company-logos').getPublicUrl(path);
      const finalUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from('companies').update({ logo_url: finalUrl }).eq('id', company.id);
      if (updErr) throw updErr;
      toast({ title: 'Logo atualizada' });
      await loadCompany();
      await refreshRole();
    } catch (err: any) {
      console.error('[Logo upload] error', err);
      toast({ title: 'Erro no upload', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      input.value = '';
    }
  };

  const reportUrl = company?.slug
    ? `${window.location.origin}/report/${company.slug}`
    : '';

  const isCorporate = company?.trial_plan_slug === 'corporate';

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-muted/30 py-8">
        <div className="container mx-auto max-w-5xl px-4">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-primary mb-2">Perfil da Empresa</h1>
          <p className="text-muted-foreground mb-8">
            Complete o cadastro para personalizar a página pública do canal de denúncias.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Logo da empresa</CardTitle>
                <CardDescription>Aparece no canal de denúncias</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="bg-muted w-full aspect-square rounded-md flex items-center justify-center overflow-hidden border">
                  {company?.logo_url ? (
                    <img src={company.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-3" />
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center">
                      <Upload size={48} />
                      <span className="mt-2 text-sm">Sem logo</span>
                    </div>
                  )}
                </div>
                <Label htmlFor="logo" className="w-full cursor-pointer">
                  <div className="flex items-center justify-center py-2 px-4 border-2 border-dashed border-border rounded-md hover:border-primary transition-colors">
                    {uploadingLogo ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" /> {company?.logo_url ? 'Alterar logo' : 'Adicionar logo'}</>
                    )}
                  </div>
                  <input id="logo" type="file" accept="image/*" className="hidden"
                    onChange={handleLogoUpload} disabled={uploadingLogo} />
                </Label>
                <p className="text-xs text-muted-foreground text-center">
                  PNG/JPG até 2MB. Recomendado fundo transparente.
                </p>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informações da empresa</CardTitle>
                <CardDescription>Dados que aparecem na página pública de denúncias</CardDescription>
              </CardHeader>
              <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da empresa *</Label>
                    <Input id="name" value={form.name}
                      onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={company?.cnpj || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={company?.email || ''} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input id="phone" value={form.phone}
                      onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(11) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço completo *</Label>
                    <Textarea id="address" value={form.address}
                      onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Rua, número, bairro, cidade/UF, CEP" rows={3} />
                  </div>
                  {reportUrl && (
                    <div className="rounded-md border bg-muted/50 p-3 text-sm">
                      <p className="font-medium mb-1">Link público do canal de denúncias:</p>
                      <p className="text-primary break-all">{reportUrl}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar alterações'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Minhas empresas (Corporate) */}
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Minhas empresas
                  {isCorporate && <Badge variant="secondary">Corporate</Badge>}
                </CardTitle>
                <CardDescription>
                  {isCorporate
                    ? 'Você pode cadastrar múltiplos CNPJs no plano Corporate.'
                    : 'Para gerenciar múltiplos CNPJs, faça upgrade para o plano Corporate.'}
                </CardDescription>
              </div>
              {isCorporate && (
                <Button onClick={() => setAddOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar CNPJ
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {companies.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada.</p>
                )}
                {companies.map((c) => (
                  <div key={c.id}
                    className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/40 transition-colors">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name}
                        className="h-10 w-10 rounded object-contain border bg-background p-1 flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
                    </div>
                    {c.id === activeCompanyId ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" /> Ativa
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => switchCompany(c.id)}>
                        Acessar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {company && (
            <div className="mt-6">
              <TeamManagementCard
                accountType="company"
                accountId={company.id}
                accountName={company.name}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} onCreated={loadCompany} />
    </div>
  );
};

export default CompanyProfile;
