import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import type { LtcatGhe } from '@/pages/LTCATDetail';

interface RoleMeta { role: string; cbo?: string; activities?: string }

interface Props {
  ltcatId: string;
  companyId: string;
  ghes: LtcatGhe[];
  readOnly: boolean;
  onChanged: () => void;
}

interface PgrDoc { id: string; title: string | null; version: number; status: string | null }
interface PgrGhe {
  id: string; name: string; sector: string | null; role: string | null;
  roles_meta: RoleMeta[] | null; activities_description: string | null; worker_count: number | null;
}

const emptyForm = () => ({
  name: '', sector: '', worker_count: 0,
  roles_meta: [] as RoleMeta[], activities_description: '',
});

/** Painel de GHEs do LTCAT: CRUD + importação assistida de GHEs do PGR. */
const LtcatGhesPanel = ({ ltcatId, companyId, ghes, readOnly, onChanged }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LtcatGhe | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [roleInput, setRoleInput] = useState('');
  const [cboInput, setCboInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [pgrDocs, setPgrDocs] = useState<PgrDoc[]>([]);
  const [pgrDocId, setPgrDocId] = useState('');
  const [pgrGhes, setPgrGhes] = useState<PgrGhe[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [loadingPgr, setLoadingPgr] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setRoleInput(''); setCboInput('');
    setDialogOpen(true);
  };

  const openEdit = (g: LtcatGhe) => {
    setEditing(g);
    setForm({
      name: g.name, sector: g.sector || '', worker_count: g.worker_count || 0,
      roles_meta: Array.isArray(g.roles_meta) ? g.roles_meta.map((r) => ({ ...r })) : [],
      activities_description: g.activities_description || '',
    });
    setRoleInput(''); setCboInput('');
    setDialogOpen(true);
  };

  const addRole = () => {
    const v = roleInput.trim();
    if (!v) return;
    if (form.roles_meta.some((r) => r.role.toLowerCase() === v.toLowerCase())) return;
    setForm({ ...form, roles_meta: [...form.roles_meta, { role: v, cbo: cboInput.trim() || undefined, activities: '' }] });
    setRoleInput(''); setCboInput('');
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome do GHE.'); return; }
    setSaving(true);
    try {
      const payload = {
        ltcat_id: ltcatId,
        name: form.name.trim(),
        sector: form.sector.trim() || null,
        worker_count: form.worker_count || 0,
        roles_meta: form.roles_meta,
        activities_description: form.activities_description || null,
        updated_at: new Date().toISOString(),
      };
      const q = editing
        ? supabase.from('ltcat_ghes' as any).update(payload as any).eq('id', editing.id)
        : supabase.from('ltcat_ghes' as any).insert({ ...payload, sort_order: ghes.length } as any);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing ? 'GHE atualizado.' : 'GHE criado.');
      setDialogOpen(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar GHE.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: LtcatGhe) => {
    if (!confirm(`Excluir o GHE "${g.name}" e suas exposições vinculadas?`)) return;
    const { error } = await supabase.from('ltcat_ghes' as any).delete().eq('id', g.id);
    if (error) { toast.error(error.message); return; }
    toast.success('GHE excluído.');
    onChanged();
  };

  const openImport = async () => {
    setImportOpen(true);
    setPgrDocId(''); setPgrGhes([]); setSelected(new Set());
    setLoadingPgr(true);
    const { data, error } = await supabase
      .from('pgr_documents')
      .select('id, title, version, status')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });
    setLoadingPgr(false);
    if (error) { toast.error(error.message); return; }
    setPgrDocs((data as any[]) || []);
  };

  const loadPgrGhes = async (docId: string) => {
    setPgrDocId(docId);
    setPgrGhes([]); setSelected(new Set());
    if (!docId) return;
    setLoadingPgr(true);
    const { data, error } = await supabase
      .from('pgr_ghe')
      .select('id, name, sector, role, roles_meta, activities_description, worker_count')
      .eq('pgr_document_id', docId)
      .order('created_at');
    setLoadingPgr(false);
    if (error) { toast.error(error.message); return; }
    setPgrGhes((data as any[]) || []);
  };

  const doImport = async () => {
    const rows = pgrGhes.filter((g) => selected.has(g.id));
    if (!rows.length) { toast.error('Selecione ao menos um GHE.'); return; }
    setImporting(true);
    try {
      const inserts = rows.map((g, i) => ({
        ltcat_id: ltcatId,
        name: g.name,
        sector: g.sector,
        worker_count: g.worker_count || 0,
        roles_meta: Array.isArray(g.roles_meta) && g.roles_meta.length
          ? g.roles_meta
          : (g.role ? [{ role: g.role, activities: g.activities_description || '' }] : []),
        activities_description: g.activities_description,
        sort_order: ghes.length + i,
      }));
      const { error } = await supabase.from('ltcat_ghes' as any).insert(inserts as any);
      if (error) throw error;
      toast.success(`${rows.length} GHE(s) importado(s) do PGR. Revise e ajuste antes da publicação.`);
      setImportOpen(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha na importação.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo GHE</Button>
          <Button variant="outline" onClick={openImport}>
            <Download className="h-4 w-4 mr-2" /> Importar GHEs do PGR
          </Button>
        </div>
      )}

      {ghes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum GHE cadastrado. Cadastre manualmente ou importe os GHEs já existentes no PGR da empresa.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {ghes.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{g.name}</p>
                      {g.sector && <Badge variant="outline">{g.sector}</Badge>}
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" /> {g.worker_count}
                      </Badge>
                    </div>
                    {Array.isArray(g.roles_meta) && g.roles_meta.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Funções: {g.roles_meta.map((r) => `${r.role}${r.cbo ? ` (CBO ${r.cbo})` : ''}`).join(', ')}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(g)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog criar/editar GHE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar GHE' : 'Novo GHE'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome do GHE *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: GHE 01 — Produção" />
              </div>
              <div className="space-y-1.5">
                <Label>Setor</Label>
                <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5 w-40">
              <Label>Nº de trabalhadores</Label>
              <Input
                type="number" min={0} value={form.worker_count}
                onChange={(e) => setForm({ ...form, worker_count: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Funções / cargos do GHE</Label>
              <div className="flex gap-2">
                <Input
                  value={roleInput} onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="Função (ex.: Soldador)" className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
                />
                <Input value={cboInput} onChange={(e) => setCboInput(e.target.value)} placeholder="CBO" className="w-28" />
                <Button type="button" variant="outline" onClick={addRole}>Adicionar</Button>
              </div>
              {form.roles_meta.map((r) => (
                <div key={r.role} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {r.role}{r.cbo ? <span className="text-muted-foreground font-normal"> · CBO {r.cbo}</span> : null}
                    </p>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setForm({ ...form, roles_meta: form.roles_meta.filter((x) => x.role !== r.role) })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder={`Descrição das atividades de ${r.role}`}
                    value={r.activities || ''}
                    onChange={(e) => setForm({
                      ...form,
                      roles_meta: form.roles_meta.map((x) => x.role === r.role ? { ...x, activities: e.target.value } : x),
                    })}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Observações gerais do GHE</Label>
              <Textarea
                rows={3} value={form.activities_description}
                onChange={(e) => setForm({ ...form, activities_description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar GHE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog importar do PGR */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar GHEs do PGR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Os GHEs importados entram como sugestão de preenchimento — revise nomes, funções e
              descrições antes da publicação do LTCAT.
            </p>
            <div className="space-y-1.5">
              <Label>Documento PGR da empresa</Label>
              <Select value={pgrDocId} onValueChange={loadPgrGhes}>
                <SelectTrigger><SelectValue placeholder={loadingPgr ? 'Carregando...' : 'Selecione o PGR'} /></SelectTrigger>
                <SelectContent>
                  {pgrDocs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title || 'PGR'} — v{d.version}{d.status ? ` (${d.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pgrGhes.length > 0 && (
              <div className="space-y-2">
                {pgrGhes.map((g) => (
                  <label key={g.id} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
                    <Checkbox
                      checked={selected.has(g.id)}
                      onCheckedChange={(ck) => {
                        const next = new Set(selected);
                        if (ck) next.add(g.id); else next.delete(g.id);
                        setSelected(next);
                      }}
                    />
                    <span className="text-sm">
                      <span className="font-medium">{g.name}</span>
                      {g.sector ? <span className="text-muted-foreground"> · {g.sector}</span> : null}
                      {g.role ? <span className="block text-muted-foreground">{g.role}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={doImport} disabled={importing || selected.size === 0}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LtcatGhesPanel;
