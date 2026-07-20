import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Wheat, Users } from "lucide-react";
import { toast } from "sonner";
import { usePgrTerminology } from "@/hooks/usePgrTerminology";
import type { PGRDocument } from "@/pages/PGRDashboard";

interface Props {
  pgr: PGRDocument;
  companyName: string;
  companyCnpj: string;
  onUpdated: () => void;
}

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Vigente", variant: "default" },
  expired: { label: "Expirado", variant: "secondary" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export const PGROverview = ({ pgr, companyName, companyCnpj, onUpdated }: Props) => {
  const term = usePgrTerminology(pgr.document_type);
  const [saving, setSaving] = useState(false);
  const [ghesSummary, setGhesSummary] = useState<{ count: number; workers: number; roles: { role: string; cbo?: string }[] }>({ count: 0, workers: 0, roles: [] });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pgr_ghe').select('worker_count, role, roles_meta').eq('pgr_document_id', pgr.id);
      const rows = (data as any[]) || [];
      const rolesMap = new Map<string, string | undefined>();
      let workers = 0;
      for (const g of rows) {
        workers += g.worker_count || 0;
        const meta: any[] = Array.isArray(g.roles_meta) && g.roles_meta.length
          ? g.roles_meta
          : (g.role || '').split(',').map((r: string) => ({ role: r.trim() })).filter((r: any) => r.role);
        for (const m of meta) {
          const key = m.role.toLowerCase();
          if (!rolesMap.has(key)) rolesMap.set(key, m.cbo);
        }
      }
      const roles = Array.from(rolesMap.entries()).map(([role, cbo]) => ({ role, cbo }));
      setGhesSummary({ count: rows.length, workers, roles });
    })();
  }, [pgr.id]);

  const [form, setForm] = useState({
    title: pgr.title,
    status: pgr.status,
    validity_start: pgr.validity_start || "",
    validity_end: pgr.validity_end || "",
    executive_summary: pgr.executive_summary || "",
    responsible_name: pgr.responsible_name || "",
    responsible_cpf: pgr.responsible_cpf || "",
    responsible_registration: pgr.responsible_registration || "",
    cnae: pgr.cnae || "",
    risk_grade: pgr.risk_grade || "",
    activity_branch: pgr.activity_branch || "",
    address: pgr.address || "",
    additional_addresses: (pgr.additional_addresses || []).join("\n"),
    rural_activity: pgr.rural_activity || "",
    rural_area_hectares: pgr.rural_area_hectares ?? "",
    work_regime: pgr.work_regime || "",
    has_lodging: pgr.has_lodging ?? false,
    lodging_description: pgr.lodging_description || "",
    worker_transport: pgr.worker_transport || "",
    conclusion_intro: pgr.conclusion_intro ?? "",
    engineering_measures: pgr.engineering_measures ?? "",
    administrative_controls: pgr.administrative_controls ?? "",
    trainings: pgr.trainings ?? "",
    monitoring_text: pgr.monitoring_text ?? "",
    epi_text: pgr.epi_text ?? "",
  });

  const DEFAULT_INTRO = 'Os propósitos da avaliação de exposição a agentes de risco ocupacionais foram cumpridos: determinaram-se os riscos a que os trabalhadores estão expostos, diferenciaram-se exposições aceitáveis das inaceitáveis e foram propostas medidas de controle. A organização deve prosseguir com seus programas de controle, introduzindo melhorias contínuas.';
  const DEFAULT_ENG = [
    'Realizar estudos de engenharia para tratamento acústico em equipamentos ruidosos das áreas produtivas e de utilidades.',
    'Avaliar a necessidade de sistemas de exaustão localizada em postos com emissão de agentes químicos.',
    'Implementar proteções coletivas contra quedas em altura, quando aplicável.',
  ].join('\n');
  const DEFAULT_ADM = [
    'Reavaliar anualmente o PGR conforme exigência legal (NR-01).',
    'Solicitar dos fornecedores as FDS (Fichas de Dados de Segurança) das matérias-primas e divulgá-las aos empregados.',
    'Minimizar o tempo de execução em atividades de alto potencial de risco e manter distância segura de fontes emissoras.',
  ].join('\n');
  const DEFAULT_TR = [
    'Saúde / Higiene Ocupacional: PGR, resultados das avaliações quantitativas, aspectos toxicológicos, primeiros socorros.',
    'Segurança Industrial: utilização de EPIs, FDS e melhores práticas de trabalho.',
  ].join('\n');
  const DEFAULT_MON = `${companyName || '(EMPRESA)'} deverá continuar com a estratégia de avaliação quantitativa para os agentes priorizados, conforme o Programa de Monitoramento Ambiental.`;
  const DEFAULT_EPI = 'Quando os procedimentos de trabalho e os controles coletivos não forem suficientes para reduzir a exposição a níveis aceitáveis, deve-se adotar o EPI como último recurso, garantindo treinamento, fornecimento, troca e fiscalização do uso.';

  const save = async () => {
    setSaving(true);
    try {
      const rawHectares =
        typeof form.rural_area_hectares === "string"
          ? form.rural_area_hectares.trim().replace(",", ".")
          : form.rural_area_hectares;
      const parsedHectares =
        rawHectares === "" || rawHectares === null || rawHectares === undefined
          ? null
          : Number(rawHectares);
      const payload: any = {
        ...form,
        validity_start: form.validity_start || null,
        validity_end: form.validity_end || null,
        rural_area_hectares:
          parsedHectares === null || Number.isNaN(parsedHectares) ? null : parsedHectares,
        conclusion_intro: form.conclusion_intro.trim() || null,
        engineering_measures: form.engineering_measures.trim() || null,
        administrative_controls: form.administrative_controls.trim() || null,
        trainings: form.trainings.trim() || null,
        monitoring_text: form.monitoring_text.trim() || null,
        epi_text: form.epi_text.trim() || null,
      };
      const { error } = await supabase
        .from("pgr_documents")
        .update(payload)
        .eq("id", pgr.id);
      if (error) throw error;
      toast.success("PGR atualizado");
      onUpdated();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const st = statusLabel[pgr.status] || statusLabel.draft;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Resumo do escopo
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total de trabalhadores cobertos</div>
            <div className="text-2xl font-semibold">{ghesSummary.workers}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{term.gheLabel}s cadastrados</div>
            <div className="text-2xl font-semibold">{ghesSummary.count}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Cargos cobertos {ghesSummary.roles.length > 0 && `(${ghesSummary.roles.length})`}</div>
            {ghesSummary.roles.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">Cadastre {term.gheLabel}s para preencher automaticamente.</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {ghesSummary.roles.slice(0, 12).map(r => (
                  <Badge key={r.role} variant="secondary" className="text-[10px] font-normal">
                    {r.role}{r.cbo ? ` · CBO ${r.cbo}` : ''}
                  </Badge>
                ))}
                {ghesSummary.roles.length > 12 && <Badge variant="outline" className="text-[10px]">+{ghesSummary.roles.length - 12}</Badge>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Identificação</CardTitle>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Rascunho</option>
              <option value="active">Vigente</option>
              <option value="expired">Expirado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={companyName} disabled />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={companyCnpj} disabled />
          </div>
          <div className="space-y-2">
            <Label>CNAE</Label>
            <Input value={form.cnae} onChange={e => setForm({ ...form, cnae: e.target.value })} placeholder="Ex: 8630-5/03" />
          </div>
          <div className="space-y-2">
            <Label>Grau de Risco (NR-4)</Label>
            <Input value={form.risk_grade} onChange={e => setForm({ ...form, risk_grade: e.target.value })} placeholder="Ex: 2" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Ramo de Atividade</Label>
            <Input value={form.activity_branch} onChange={e => setForm({ ...form, activity_branch: e.target.value })} placeholder="Ex: Construção civil de edifícios" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço completo</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade - UF" />
          </div>
          <div className="space-y-2">
            <Label>Vigência início</Label>
            <Input type="date" value={form.validity_start} onChange={e => setForm({ ...form, validity_start: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Vigência fim</Label>
            <Input type="date" value={form.validity_end} onChange={e => setForm({ ...form, validity_end: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Responsável Técnico SST</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={form.responsible_cpf} onChange={e => setForm({ ...form, responsible_cpf: e.target.value })} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label>Registro CREA / MTE / CRP</Label>
            <Input value={form.responsible_registration} onChange={e => setForm({ ...form, responsible_registration: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {term.isRural && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Wheat className="h-5 w-5 text-primary" /> Caracterização Rural (NR-31)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Atividade rural principal</Label>
              <Input value={form.rural_activity} onChange={e => setForm({ ...form, rural_activity: e.target.value })} placeholder="Ex: Cultivo de café, pecuária de corte, silvicultura..." />
            </div>
            <div className="space-y-2">
              <Label>Área total (hectares)</Label>
              <Input type="number" step="0.01" value={form.rural_area_hectares as any} onChange={e => setForm({ ...form, rural_area_hectares: e.target.value })} placeholder="Ex: 150" />
            </div>
            <div className="space-y-2">
              <Label>Regime de trabalho</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={form.work_regime} onChange={e => setForm({ ...form, work_regime: e.target.value })}>
                <option value="">— Selecionar —</option>
                <option value="permanente">Trabalhador permanente</option>
                <option value="safrista">Safrista</option>
                <option value="temporario">Temporário</option>
                <option value="misto">Misto (permanente + temporário)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.has_lodging} onChange={e => setForm({ ...form, has_lodging: e.target.checked })} />
                <span className="text-sm">Empresa possui alojamento para trabalhadores</span>
              </label>
            </div>
            {form.has_lodging && (
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição do alojamento</Label>
                <Textarea rows={2} value={form.lodging_description} onChange={e => setForm({ ...form, lodging_description: e.target.value })} placeholder="Capacidade, condições sanitárias, ventilação..." />
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>Transporte de trabalhadores</Label>
              <Textarea rows={2} value={form.worker_transport} onChange={e => setForm({ ...form, worker_transport: e.target.value })} placeholder="Tipo de veículo, itinerário, condições de segurança..." />
            </div>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo Executivo</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            value={form.executive_summary}
            onChange={e => setForm({ ...form, executive_summary: e.target.value })}
            placeholder="Apresentação geral do PGR, escopo, metodologia..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conclusão e Recomendações (Parte VI do PDF)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Personalize os textos das seções finais do relatório PGR conforme a realidade da empresa (ex.: comércio, indústria, área rural). Deixe em branco para usar o texto padrão. Nos campos de bullets, coloque <strong>uma recomendação por linha</strong>. Para ocultar uma seção inteira, apague todas as linhas e digite apenas um espaço.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parágrafo de introdução da Parte VI</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, conclusion_intro: "" })}>Restaurar padrão</Button>
            </div>
            <Textarea rows={4} value={form.conclusion_intro} onChange={e => setForm({ ...form, conclusion_intro: e.target.value })} placeholder={DEFAULT_INTRO} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>6.1 Medidas de Engenharia (Coletivas) — uma por linha</Label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, engineering_measures: DEFAULT_ENG })}>Preencher padrão</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, engineering_measures: "" })}>Restaurar padrão</Button>
              </div>
            </div>
            <Textarea rows={5} value={form.engineering_measures} onChange={e => setForm({ ...form, engineering_measures: e.target.value })} placeholder={DEFAULT_ENG} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>6.2 Procedimentos e Controles Administrativos — uma por linha</Label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, administrative_controls: DEFAULT_ADM })}>Preencher padrão</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, administrative_controls: "" })}>Restaurar padrão</Button>
              </div>
            </div>
            <Textarea rows={5} value={form.administrative_controls} onChange={e => setForm({ ...form, administrative_controls: e.target.value })} placeholder={DEFAULT_ADM} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>6.3 Treinamentos — uma por linha</Label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, trainings: DEFAULT_TR })}>Preencher padrão</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, trainings: "" })}>Restaurar padrão</Button>
              </div>
            </div>
            <Textarea rows={4} value={form.trainings} onChange={e => setForm({ ...form, trainings: e.target.value })} placeholder={DEFAULT_TR} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>6.4 Monitoramento</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, monitoring_text: DEFAULT_MON })}>Preencher padrão</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, monitoring_text: "" })}>Restaurar padrão</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Edite livremente ou deixe em branco para usar o texto padrão no PDF.</p>
            <Textarea rows={4} value={form.monitoring_text} onChange={e => setForm({ ...form, monitoring_text: e.target.value })} placeholder={DEFAULT_MON} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>6.5 Equipamentos de Proteção Individual</Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, epi_text: DEFAULT_EPI })}>Preencher padrão</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, epi_text: "" })}>Restaurar padrão</Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Edite livremente ou deixe em branco para usar o texto padrão no PDF.</p>
            <Textarea rows={4} value={form.epi_text} onChange={e => setForm({ ...form, epi_text: e.target.value })} placeholder={DEFAULT_EPI} />
          </div>
        </CardContent>
      </Card>


      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
};
