import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSafeErrorMessage } from '@/lib/errorUtils';
import {
  Upload, Loader2, CheckCircle2, ShieldOff, Clock, UserX, AlertTriangle, History, RefreshCw, FileSpreadsheet,
} from 'lucide-react';

type Action = 'activated' | 'renewed' | 'trial' | 'blocked' | 'no_account' | 'divergent' | 'unchanged';

interface PreviewItem {
  email: string;
  user_id: string | null;
  action: Action;
  reason: string;
  purchase_amount_cents: number | null;
  payment_confirmed_at: string | null;
  previous_plan: string | null;
  new_plan: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_period_end: string | null;
  new_period_end: string | null;
}

interface Counts {
  total_rows: number; total_emails: number;
  count_activated: number; count_renewed: number; count_trial: number;
  count_blocked: number; count_no_account: number; count_divergent: number; count_unchanged: number;
}

const ACTION_META: Record<Action, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  activated: { label: 'Ativar mensal', variant: 'default' },
  renewed: { label: 'Renovar mensal', variant: 'secondary' },
  trial: { label: 'Teste 7 dias', variant: 'outline' },
  blocked: { label: 'Bloquear', variant: 'destructive' },
  no_account: { label: 'Sem conta', variant: 'outline' },
  divergent: { label: 'Revisar', variant: 'outline' },
  unchanged: { label: 'Sem mudança', variant: 'outline' },
};

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const fmtMoney = (c: number | null) => (c == null ? '—' : `R$ ${(c / 100).toFixed(2).replace('.', ',')}`);

// Converte data brasileira "27/07/2026 09:04:35" ou serial de data do Excel em ISO
function parseDate(value: any): string | null {
  if (value == null || value === '' || value === '(none)') return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S))).toISOString();
  }
  const str = String(value).trim();
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, d, mo, y, h = '00', mi = '00', s = '00'] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).toISOString();
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function parseAmountCents(value: any): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Math.round(value * 100);
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const findKey = (obj: Record<string, any>, candidates: string[]) => {
  const keys = Object.keys(obj);
  for (const cand of candidates) {
    const hit = keys.find((k) => k.toLowerCase().replace(/\s+/g, ' ').trim().includes(cand));
    if (hit) return hit;
  }
  return null;
};

export const SubscriptionReconciliationTab: React.FC = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | Action>('all');
  const [search, setSearch] = useState('');

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<any[]>([]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('subscription_reconciliations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) toast({ title: 'Erro ao carregar histórico', description: getSafeErrorMessage(error), variant: 'destructive' });
    setHistory(data ?? []);
    setHistoryLoading(false);
  };

  const loadBatchItems = async (id: string) => {
    if (openBatch === id) { setOpenBatch(null); setBatchItems([]); return; }
    setOpenBatch(id);
    const { data } = await supabase
      .from('subscription_reconciliation_items')
      .select('*')
      .eq('reconciliation_id', id)
      .order('action', { ascending: true })
      .limit(2000);
    setBatchItems(data ?? []);
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setItems(null); setCounts(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
      if (json.length === 0) throw new Error('Planilha vazia');

      const sample = json[0];
      const kEmail = findKey(sample, ['email do(a) comprador', 'email do comprador', 'e-mail do comprador', 'email']);
      const kAmount = findKey(sample, ['valor de compra com impostos', 'valor de compra']);
      const kPaid = findKey(sample, ['confirmação do pagamento', 'confirmacao do pagamento']);
      const kStatus = findKey(sample, ['status da transação', 'status da transacao', 'status']);

      if (!kEmail || !kAmount || !kPaid) {
        throw new Error('Colunas obrigatórias não encontradas (e-mail do comprador, valor de compra com impostos, confirmação do pagamento)');
      }

      const rows = json
        .map((r) => ({
          email: String(r[kEmail] ?? '').trim().toLowerCase(),
          amountCents: parseAmountCents(r[kAmount]),
          paidAt: parseDate(r[kPaid]),
          status: String(kStatus ? r[kStatus] ?? '' : ''),
          transactionCode: null,
        }))
        .filter((r) => r.email.includes('@'));

      if (rows.length === 0) throw new Error('Nenhuma linha com e-mail válido');

      setFileName(file.name);
      setParsedRows(rows);
      await runPreview(file.name, rows);
    } catch (e) {
      toast({ title: 'Erro ao ler a planilha', description: getSafeErrorMessage(e), variant: 'destructive' });
      setLoading(false);
    }
  };

  const runPreview = async (name: string, rows: any[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-subscriptions', {
        body: { mode: 'preview', fileName: name, rows },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setItems((data as any).items);
      setCounts((data as any).counts);
    } catch (e) {
      toast({ title: 'Erro na prévia', description: getSafeErrorMessage(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const applyReconciliation = async () => {
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-subscriptions', {
        body: { mode: 'apply', fileName, rows: parsedRows },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: 'Conciliação aplicada',
        description: `${(data as any).applied} conta(s) atualizada(s). Registro salvo no histórico.`,
      });
      setItems(null); setCounts(null); setParsedRows([]); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      loadHistory();
    } catch (e) {
      toast({ title: 'Erro ao aplicar', description: getSafeErrorMessage(e), variant: 'destructive' });
    } finally {
      setApplying(false);
      setConfirmOpen(false);
    }
  };

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      const okAction = filter === 'all' || i.action === filter;
      const okSearch = !search || i.email.includes(search.toLowerCase());
      return okAction && okSearch;
    });
  }, [items, filter, search]);

  const kpis = counts ? [
    { key: 'activated' as const, label: 'Mensal ativado', value: counts.count_activated, icon: CheckCircle2 },
    { key: 'renewed' as const, label: 'Mensal renovado', value: counts.count_renewed, icon: RefreshCw },
    { key: 'trial' as const, label: 'Teste vigente', value: counts.count_trial, icon: Clock },
    { key: 'blocked' as const, label: 'Bloquear', value: counts.count_blocked, icon: ShieldOff },
    { key: 'no_account' as const, label: 'Sem conta', value: counts.count_no_account, icon: UserX },
    { key: 'divergent' as const, label: 'Revisar', value: counts.count_divergent, icon: AlertTriangle },
  ] : [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" onValueChange={(v) => { if (v === 'history' && history.length === 0) loadHistory(); }}>
        <TabsList>
          <TabsTrigger value="upload">Nova conciliação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Conciliação manual de assinaturas
              </CardTitle>
              <CardDescription>
                Envie o relatório de vendas da Hotmart (.xls/.xlsx). São lidas as colunas de
                confirmação do pagamento, valor de compra com impostos (R$ 9,90 = teste de 7 dias,
                R$ 97,90 = mensal) e e-mail do comprador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <Button onClick={() => fileRef.current?.click()} disabled={loading || applying}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Selecionar planilha
                </Button>
                {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
                {counts && (
                  <span className="text-sm text-muted-foreground">
                    {counts.total_rows} linhas · {counts.total_emails} e-mails únicos
                  </span>
                )}
              </div>

              {counts && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {kpis.map(({ key, label, value, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(filter === key ? 'all' : key)}
                      className={`rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${filter === key ? 'border-primary bg-muted/40' : ''}`}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </div>
                      <div className="mt-1 text-2xl font-bold">{value}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {items && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Prévia das alterações</CardTitle>
                  <CardDescription>Nada foi gravado ainda. Revise e confirme para aplicar.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                  />
                  <Button onClick={() => setConfirmOpen(true)} disabled={applying}>
                    {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar conciliação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Situação atual</TableHead>
                        <TableHead>Situação proposta</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((i, idx) => (
                        <TableRow key={`${i.email}-${idx}`}>
                          <TableCell className="font-mono text-xs">{i.email}</TableCell>
                          <TableCell>
                            <Badge variant={ACTION_META[i.action].variant}>{ACTION_META[i.action].label}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{fmtMoney(i.purchase_amount_cents)}</TableCell>
                          <TableCell className="text-xs">{fmtDate(i.payment_confirmed_at)}</TableCell>
                          <TableCell className="text-xs">
                            {i.previous_plan ?? '—'} · {i.previous_status ?? '—'}
                            <div className="text-muted-foreground">até {fmtDate(i.previous_period_end)}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {i.new_plan ?? '—'} · {i.new_status ?? '—'}
                            <div className="text-muted-foreground">até {fmtDate(i.new_period_end)}</div>
                          </TableCell>
                          <TableCell className="max-w-[280px] text-xs text-muted-foreground">{i.reason}</TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            Nenhum registro para este filtro.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Conciliações realizadas
                </CardTitle>
                <CardDescription>Clique em um lote para ver as alterações registradas.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Atualizar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 && !historyLoading && (
                <p className="py-6 text-center text-muted-foreground">Nenhuma conciliação registrada ainda.</p>
              )}
              {history.map((b) => (
                <div key={b.id} className="rounded-lg border">
                  <button
                    onClick={() => loadBatchItems(b.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-medium">{b.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleString('pt-BR')} · {b.executed_by_email ?? '—'} · {b.total_emails} e-mails
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="default">{b.count_activated} ativados</Badge>
                      <Badge variant="secondary">{b.count_renewed} renovados</Badge>
                      <Badge variant="outline">{b.count_trial} testes</Badge>
                      <Badge variant="destructive">{b.count_blocked} bloqueados</Badge>
                      <Badge variant="outline">{b.count_divergent} revisar</Badge>
                    </div>
                  </button>
                  {openBatch === b.id && (
                    <div className="max-h-[420px] overflow-auto border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Antes</TableHead>
                            <TableHead>Depois</TableHead>
                            <TableHead>Aplicado</TableHead>
                            <TableHead>Motivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchItems.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell className="font-mono text-xs">{i.email}</TableCell>
                              <TableCell>
                                <Badge variant={ACTION_META[i.action as Action]?.variant ?? 'outline'}>
                                  {ACTION_META[i.action as Action]?.label ?? i.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {i.previous_plan ?? '—'} · {i.previous_status ?? '—'} · {fmtDate(i.previous_period_end)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {i.new_plan ?? '—'} · {i.new_status ?? '—'} · {fmtDate(i.new_period_end)}
                              </TableCell>
                              <TableCell className="text-xs">{i.applied ? 'Sim' : 'Não'}</TableCell>
                              <TableCell className="max-w-[280px] text-xs text-muted-foreground">{i.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar conciliação?</AlertDialogTitle>
            <AlertDialogDescription>
              {counts && (
                <>
                  Serão atualizadas {counts.count_activated + counts.count_renewed + counts.count_trial + counts.count_blocked} contas
                  ({counts.count_blocked} bloqueios). Contas marcadas como "revisar" e "sem conta" não sofrerão alteração.
                  Esta ação será registrada no histórico.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); applyReconciliation(); }} disabled={applying}>
              {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar e aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionReconciliationTab;
