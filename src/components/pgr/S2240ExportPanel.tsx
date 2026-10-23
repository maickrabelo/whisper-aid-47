import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, FileCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UFS } from '@/lib/esocial/common';
import table24 from '@/lib/esocial/table24.json';
import units from '@/lib/esocial/units.json';
import { buildS2240Files, seedDeclaration, validateS2240, type AgentDeclaration, type S2240Group, type S2240Risk, type S2240Settings } from '@/lib/esocial/s2240';
import { deliverPreparedFile, prepareXmlDownload, type PreparedDownload } from '@/lib/esocial/download';

function Choice({ label, value, options, onChange }: { label: string; value: string; options: Record<string,string>; onChange: (v: string) => void }) {
  return <div className="min-w-0 space-y-1"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-auto min-h-10 [&>span]:whitespace-normal [&>span]:text-left"><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{Object.entries(options).map(([code,name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}</SelectContent></Select></div>;
}
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div className="min-w-0 space-y-1"><Label>{label}</Label><Input aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} /></div>;
}
const usage = { '0': 'Não se aplica', '1': 'Não utilizado / não implementado', '2': 'Utilizado / implementado' };
const yesNo = { S: 'Sim', N: 'Não' };
export function S2240ExportPanel({ documentId, cnpj, responsibleCpf }: { documentId: string; cnpj: string; responsibleCpf: string }) {
  const [groups,setGroups] = useState<S2240Group[]>([]), [risks,setRisks] = useState<S2240Risk[]>([]);
  const [declarations,setDeclarations] = useState<Record<string,AgentDeclaration>>({});
  const [settings,setSettings] = useState<S2240Settings>({ environment:'2', conditionDate:'', obligationDate:'', establishment:'', local:'1', cpf:responsibleCpf, council:'', councilName:'', councilNumber:'', uf:'', reviewed:false });
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [issues,setIssues] = useState<string[]>([]), [ready,setReady] = useState<PreparedDownload | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [g,r] = await Promise.all([
          supabase.from('pgr_ghe').select('id,name,sector,activities_description').eq('pgr_document_id',documentId).order('id').limit(1001),
          supabase.from('pgr_risks').select('id,ghe_id,category,agent_name,esocial_agent_code,measurement_value,exposure_limit,epi_ca').eq('pgr_document_id',documentId).order('id').limit(2001),
        ]);
        if (g.error) throw g.error; if (r.error) throw r.error;
        const loaded: S2240Group[] = [];
        for (const group of g.data ?? []) {
          const w = await supabase.from('pgr_ghe_workers').select('id,full_name,cpf,registration_number,admission_date').eq('ghe_id',group.id).order('id').limit(1001);
          if (w.error) throw w.error;
          loaded.push({ ...group, pgr_ghe_workers:w.data ?? [] });
        }
        if (!active) return;
        const rows = r.data ?? []; setGroups(loaded); setRisks(rows);
        setDeclarations(Object.fromEntries(rows.map(risk => [risk.id,seedDeclaration(risk)])));
      } catch (error) { if (active) setIssues([error instanceof Error ? error.message : 'Não foi possível carregar os dados.']); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  },[documentId]);
  const change = <K extends keyof S2240Settings>(key: K, value: S2240Settings[K]) => { setReady(null); setIssues([]); setSettings(s => ({ ...s,[key]:value,reviewed:key === 'reviewed' ? Boolean(value) : false })); };
  const update = (id: string, key: keyof AgentDeclaration, value: string) => { setReady(null); setIssues([]); setSettings(s => ({ ...s,reviewed:false })); setDeclarations(d => { const a = d[id]; return a ? { ...d,[id]:{ ...a,[key]:value } } : d; }); };
  const prepare = async () => {
    setReady(null); const errors = validateS2240(cnpj,groups,risks,declarations,settings); setIssues(errors); if (errors.length) return;
    setBusy(true);
    try {
      const files = buildS2240Files(cnpj,groups,risks,declarations,settings);
      const download = await prepareXmlDownload(files,'S2240');
      const audit = await supabase.from('pgr_esocial_exports').insert({ pgr_document_id:documentId,event_type:'S-2240',reference_period:settings.conditionDate.slice(0,7),file_path:`preparacao-local-sem-assinatura-ambiente-${settings.environment}`,worker_count:files.length });
      if (audit.error) throw new Error('Não foi possível registrar a preparação; nenhum arquivo será liberado.');
      setReady(download); toast.success('Preparação concluída, sem transmissão.');
    } catch (error) { setIssues([error instanceof Error ? error.message : 'Exportação não concluída.']); }
    finally { setBusy(false); }
  };
  if (loading) return <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do S-2240…</p>;
  return <section aria-label="Exportação S-2240" className="space-y-4 border-t pt-4">
    <h3 className="flex items-center gap-2 font-semibold"><FileCode className="h-4 w-4" /> S-2240 — XML sem assinatura</h3>
    <Alert><AlertTitle>Envio por sistema externo</AlertTitle><AlertDescription>O transmissor externo deve importar, validar, assinar e enviar os eventos. O portal web do eSocial não recebe upload destes XMLs. Download não comprova envio ou aceite. Vínculos sem matrícula, avulsos, CAEPF/CNO, retificações e agentes judiciais não são suportados nesta exportação.</AlertDescription></Alert>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Choice label="Ambiente do S-2240" value={settings.environment} options={{ '2':'Produção restrita — testes','1':'Produção — somente dados reais revisados' }} onChange={v => change('environment',v === '1' ? '1' : '2')} />
      <Choice label="Local de trabalho" value={settings.local} options={{ '1':'Estabelecimento próprio','2':'Estabelecimento de terceiro' }} onChange={v => change('local',v === '2' ? '2' : '1')} />
      <Field label="CNPJ do estabelecimento de trabalho" value={settings.establishment} onChange={v => change('establishment',v)} />
      <Field label="Início da obrigatoriedade S-2240" type="date" value={settings.obligationDate} onChange={v => change('obligationDate',v)} />
      <Field label="Início real da condição de exposição" type="date" value={settings.conditionDate} onChange={v => change('conditionDate',v)} />
      <Field label="CPF do responsável técnico do S-2240" value={settings.cpf} onChange={v => change('cpf',v)} />
      <Choice label="Conselho profissional" value={settings.council} options={{ '1':'CRM','4':'CREA','9':'Outro conselho' }} onChange={v => change('council',v)} />
      <Field label="Número do registro profissional" value={settings.councilNumber} onChange={v => change('councilNumber',v)} />
      <Choice label="UF do conselho" value={settings.uf} options={Object.fromEntries(UFS.map(uf => [uf,uf]))} onChange={v => change('uf',v)} />
      {settings.council === '9' && <Field label="Nome do conselho" value={settings.councilName} onChange={v => change('councilName',v)} />}
    </div>
    <p className="text-sm text-muted-foreground">{groups.length} GHEs · {groups.reduce((n,g) => n + g.pgr_ghe_workers.length,0)} vínculos · originais S-1.3. Declarações abaixo valem apenas para esta preparação e não alteram o inventário.</p>
    {risks.filter(r => r.esocial_agent_code || ['fisico','quimico','biologico'].includes(r.category)).map(r => {
      const a = declarations[r.id]; if (!a) return null;
      return <div key={r.id} className="space-y-3 border-b pb-4">
        <h4 className="break-words font-medium">{groups.find(g => g.id === r.ghe_id)?.name ?? 'Sem GHE'} — {r.agent_name}</h4>
        <Choice label={`Agente Tabela 24 — ${r.agent_name}`} value={a.code} options={Object.fromEntries(Object.entries(table24).map(([code,name]) => [code,`${code} — ${name}`]))} onChange={v => update(r.id,'code',v)} />
        {a.code !== '09.01.001' && <>
          <Field label={`Descrição do agente — ${r.agent_name}`} value={a.description} onChange={v => update(r.id,'description',v)} />
          <Choice label={`Tipo de avaliação — ${r.agent_name}`} value={a.assessment} options={{ '1':'Quantitativa','2':'Qualitativa' }} onChange={v => update(r.id,'assessment',v)} />
          {a.assessment === '1' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Intensidade / concentração — ${r.agent_name}`} value={a.value} onChange={v => update(r.id,'value',v)} />
            <Choice label={`Unidade oficial — ${r.agent_name}`} value={a.unit} options={units} onChange={v => update(r.id,'unit',v)} />
            <Field label={`Técnica de medição — ${r.agent_name}`} value={a.technique} onChange={v => update(r.id,'technique',v)} />
            {['01.18.001','02.01.014'].includes(a.code) && <Field label={`Limite de tolerância — ${r.agent_name}`} value={a.limit} onChange={v => update(r.id,'limit',v)} />}
          </div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Choice label={`Utilização de EPC — ${r.agent_name}`} value={a.epc} options={usage} onChange={v => update(r.id,'epc',v)} />
            {a.epc === '2' && <Choice label={`Eficácia do EPC — ${r.agent_name}`} value={a.epcEffective} options={yesNo} onChange={v => update(r.id,'epcEffective',v)} />}
            <Choice label={`Utilização de EPI — ${r.agent_name}`} value={a.epi} options={usage} onChange={v => update(r.id,'epi',v)} />
            {a.epi === '2' && <Choice label={`Eficácia do EPI — ${r.agent_name}`} value={a.epiEffective} options={yesNo} onChange={v => update(r.id,'epiEffective',v)} />}
          </div>
          {a.epi === '2' && <div className="space-y-3"><Field label={`Documentos de avaliação / CA (separados por vírgula) — ${r.agent_name}`} value={a.documents} onChange={v => update(r.id,'documents',v)} /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([
            ['measures','Medidas de proteção'],['functioning','Condições de funcionamento'],['continuous','Uso ininterrupto'],['validity','Prazo de validade'],['replacement','Periodicidade de troca'],['hygiene','Higienização'],
          ] as [keyof AgentDeclaration,string][]).map(([key,label]) => <Choice key={key} label={`${label} — ${r.agent_name}`} value={a[key]} options={yesNo} onChange={v => update(r.id,key,v)} />)}</div></div>}
        </>}
      </div>;
    })}
    <Label className="flex items-start gap-2"><Checkbox aria-label="Confirmar revisão técnica do S-2240" checked={settings.reviewed} onCheckedChange={v => change('reviewed',v === true)} /><span className="text-sm leading-relaxed">Confirmei a revisão pelo responsável técnico, as matrículas no eSocial, as datas e o estabelecimento cadastrado. Os códigos refletem o enquadramento técnico, não apenas a existência de riscos no PGR. {settings.environment === '1' && 'São dados reais autorizados, não simulações.'}</span></Label>
    {issues.length > 0 && <div role="alert" className="space-y-1 text-sm text-destructive"><p className="font-medium">Corrija as pendências antes de exportar:</p><ul className="list-disc space-y-1 pl-5">{issues.map(issue => <li className="break-words" key={issue}>{issue}</li>)}</ul></div>}
    <Button disabled={busy} onClick={() => void prepare()} className="w-full gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />} Validar e preparar S-2240</Button>
    {ready && <Button variant="outline" className="w-full gap-2" onClick={() => void deliverPreparedFile(ready).catch(() => toast.error('Não foi possível baixar o arquivo.'))}><Download className="h-4 w-4" /> Baixar {ready.count > 1 ? `ZIP (${ready.count} XMLs)` : 'XML'} sem assinatura</Button>}
  </section>;
}