import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { RefreshCw, Search, Receipt, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PaymentRow {
  id: string;
  event: string;
  receivedAt: string;
  paidAt: string | null;
  email: string;
  name: string;
  document: string;
  productName: string;
  planId: string;
  planName: string;
  value: number;
  currency: string;
  paymentType: string;
  installments: number | null;
  transaction: string;
  purchaseStatus: string;
  nextCharge: string | null;
  recurrence: number | null;
  raw: any;
}

const PAYMENT_EVENTS = [
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
  'PURCHASE_BILLET_PRINTED',
  'PURCHASE_PROTEST',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'PURCHASE_DELAYED',
  'PURCHASE_EXPIRED',
  'PURCHASE_OUT_OF_SHOPPING_CART',
  'SUBSCRIPTION_CANCELLATION',
  'SWITCH_PLAN',
];

const EVENT_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PURCHASE_APPROVED: { label: 'Aprovado', variant: 'default' },
  PURCHASE_COMPLETE: { label: 'Concluído', variant: 'default' },
  PURCHASE_BILLET_PRINTED: { label: 'Boleto gerado', variant: 'secondary' },
  PURCHASE_DELAYED: { label: 'Atrasado', variant: 'destructive' },
  PURCHASE_PROTEST: { label: 'Em disputa', variant: 'destructive' },
  PURCHASE_REFUNDED: { label: 'Reembolsado', variant: 'destructive' },
  PURCHASE_CHARGEBACK: { label: 'Chargeback', variant: 'destructive' },
  PURCHASE_CANCELED: { label: 'Cancelado', variant: 'destructive' },
  PURCHASE_EXPIRED: { label: 'Expirado', variant: 'outline' },
  PURCHASE_OUT_OF_SHOPPING_CART: { label: 'Carrinho abandonado', variant: 'outline' },
  SUBSCRIPTION_CANCELLATION: { label: 'Assinatura cancelada', variant: 'destructive' },
  SWITCH_PLAN: { label: 'Troca de plano', variant: 'secondary' },
};

const ts = (v: any): string | null => {
  if (!v) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');
const fmtDay = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtBRL = (v: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(v || 0);

function toRow(log: any): PaymentRow {
  const d = log.payload?.data ?? {};
  const purchase = d.purchase ?? {};
  return {
    id: log.id,
    event: log.event_type || log.payload?.event || '—',
    receivedAt: log.received_at,
    paidAt: ts(purchase.approved_date) ?? ts(purchase.order_date),
    email: d.buyer?.email ?? '—',
    name: d.buyer?.name ?? '—',
    document: d.buyer?.document ?? '—',
    productName: d.product?.name ?? '—',
    planId: d.subscription?.plan?.id ? String(d.subscription.plan.id) : '—',
    planName: d.subscription?.plan?.name ?? '—',
    value: purchase.price?.value ?? purchase.full_price?.value ?? 0,
    currency: purchase.price?.currency_value ?? 'BRL',
    paymentType: purchase.payment?.type ?? '—',
    installments: purchase.payment?.installments_number ?? null,
    transaction: purchase.transaction ?? '—',
    purchaseStatus: purchase.status ?? d.subscription?.status ?? '—',
    nextCharge: ts(purchase.date_next_charge),
    recurrence: purchase.recurrence_number ?? null,
    raw: log.payload,
  };
}

export function HotmartPaymentsTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('id, event_type, payload, received_at')
      .eq('provider', 'hotmart')
      .in('event_type', PAYMENT_EVENTS)
      .order('received_at', { ascending: false })
      .limit(1000);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao carregar pagamentos', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((data ?? []).map(toRow));
  };

  useEffect(() => { load(); }, []);

  const events = useMemo(
    () => Array.from(new Set(rows.map(r => r.event))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (eventFilter !== 'all' && r.event !== eventFilter) return false;
      if (!q) return true;
      return [r.email, r.name, r.document, r.transaction, r.planName, r.planId, r.productName]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, eventFilter]);

  const approvedTotal = useMemo(
    () => filtered
      .filter(r => r.event === 'PURCHASE_APPROVED' || r.event === 'PURCHASE_COMPLETE')
      .reduce((s, r) => s + (r.value || 0), 0),
    [filtered],
  );

  const uniqueBuyers = useMemo(
    () => new Set(filtered.map(r => r.email).filter(e => e && e !== '—')).size,
    [filtered],
  );

  const exportCSV = () => {
    const head = ['Data recebida', 'Data do pagamento', 'Evento', 'Nome', 'E-mail', 'Documento', 'Produto', 'Plano', 'Cód. plano', 'Valor', 'Forma', 'Parcelas', 'Transação', 'Próxima cobrança', 'Recorrência'];
    const lines = filtered.map(r => [
      fmtDate(r.receivedAt), fmtDate(r.paidAt), r.event, r.name, r.email, r.document,
      r.productName, r.planName, r.planId, String(r.value).replace('.', ','),
      r.paymentType, r.installments ?? '', r.transaction, fmtDay(r.nextCharge), r.recurrence ?? '',
    ]);
    const csv = [head, ...lines]
      .map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-hotmart-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Eventos listados</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Compradores distintos</p>
            <p className="text-2xl font-bold">{uniqueBuyers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total aprovado</p>
            <p className="text-2xl font-bold">{fmtBRL(approvedTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Pagamentos por usuário (Hotmart)
            </CardTitle>
            <CardDescription>
              Baseado nos eventos recebidos no webhook da Hotmart. Clique em uma linha para ver todos os detalhes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por e-mail, nome, CPF/CNPJ, transação ou plano"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="all">Todos os eventos</option>
              {events.map(ev => (
                <option key={ev} value={ev}>{EVENT_LABEL[ev]?.label ?? ev}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum pagamento encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Próxima cobrança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const ev = EVENT_LABEL[r.event] ?? { label: r.event, variant: 'outline' as const };
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div>{fmtDate(r.paidAt ?? r.receivedAt)}</div>
                          <div className="text-xs text-muted-foreground">recebido {fmtDate(r.receivedAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <div className="text-sm truncate">{r.planName}</div>
                          <div className="text-xs text-muted-foreground">cód. {r.planId}</div>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {fmtBRL(r.value, r.currency)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.paymentType}
                          {r.installments && r.installments > 1 ? ` ${r.installments}x` : ''}
                        </TableCell>
                        <TableCell><Badge variant={ev.variant}>{ev.label}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDay(r.nextCharge)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Evento" value={EVENT_LABEL[selected.event]?.label ?? selected.event} />
              <Detail label="Situação da compra" value={selected.purchaseStatus} />
              <Detail label="Data do pagamento" value={fmtDate(selected.paidAt)} />
              <Detail label="Recebido pelo webhook" value={fmtDate(selected.receivedAt)} />
              <Detail label="Valor" value={fmtBRL(selected.value, selected.currency)} />
              <Detail
                label="Forma de pagamento"
                value={`${selected.paymentType}${selected.installments && selected.installments > 1 ? ` — ${selected.installments}x` : ''}`}
              />
              <Detail label="Documento" value={selected.document} />
              <Detail label="Transação" value={selected.transaction} />
              <Detail label="Produto" value={selected.productName} />
              <Detail label="Plano" value={`${selected.planName} (cód. ${selected.planId})`} />
              <Detail label="Próxima cobrança" value={fmtDay(selected.nextCharge)} />
              <Detail label="Recorrência" value={selected.recurrence ? `${selected.recurrence}ª` : '—'} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value || '—'}</p>
    </div>
  );
}
