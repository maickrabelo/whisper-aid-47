import { useEffect, useState } from 'react';
import { Stethoscope, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Professional {
  id: string;
  professional_name: string | null;
  crm: string | null;
  crm_uf: string | null;
  clinical_role: string;
}

const ROLE_LABEL: Record<string, string> = {
  responsavel: 'Médico responsável',
  examinador: 'Médico examinador',
};

/** Médicos do PCMSO cadastrados pela própria gestora, por empresa. */
export function PcmsoProfessionalsCard({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const [items, setItems] = useState<Professional[]>([]);
  const [form, setForm] = useState({ name: '', email: '', crm: '', uf: '', role: 'responsavel' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('pcmso_professional_assignments')
      .select('id,professional_name,crm,crm_uf,clinical_role')
      .eq('company_id', companyId)
      .is('revoked_at', null)
      .order('created_at');
    setItems((data as Professional[]) ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).rpc('pcmso_register_professional', {
      _company_id: companyId,
      _email: form.email,
      _name: form.name,
      _crm: form.crm,
      _crm_uf: form.uf,
      _role: form.role,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.message?.includes('MEDICO_SEM_CONTA')
          ? 'Esse e-mail ainda não tem conta. Convide o médico em "Equipe da conta" e cadastre-o aqui depois.'
          : error.message || 'Não foi possível cadastrar o médico.',
      );
      return;
    }
    toast.success('Médico cadastrado.');
    setForm({ name: '', email: '', crm: '', uf: '', role: 'responsavel' });
    await load();
  };

  const revoke = async (id: string) => {
    const { error } = await (supabase as any).rpc('pcmso_revoke_professional', { _assignment_id: id });
    if (error) return toast.error('Não foi possível remover o médico.');
    toast.success('Acesso do médico removido.');
    await load();
  };

  const ready = form.name.trim() && form.email.trim() && form.crm.trim() && form.uf.trim().length === 2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="h-4 w-4 text-primary" /> Médicos desta empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum médico cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{p.professional_name || 'Médico'}</p>
                  <p className="text-xs text-muted-foreground">CRM {p.crm}/{p.crm_uf}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ROLE_LABEL[p.clinical_role] ?? p.clinical_role}</Badge>
                  {canManage && (
                    <Button size="icon" variant="ghost" aria-label="Remover médico" onClick={() => void revoke(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Nome do médico" value={form.name} maxLength={150}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="E-mail da conta do médico" type="email" value={form.email} maxLength={255}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="CRM" value={form.crm} maxLength={20}
                onChange={(e) => setForm({ ...form, crm: e.target.value })} />
              <Input placeholder="UF" className="w-20" value={form.uf} maxLength={2}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
            <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="responsavel">Médico responsável</SelectItem>
                <SelectItem value="examinador">Médico examinador</SelectItem>
              </SelectContent>
            </Select>
            <Button className="sm:col-span-2" onClick={() => void save()} disabled={saving || !ready}>
              Cadastrar médico
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
