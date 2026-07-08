import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashGHE {
  id: string;
  name: string;
  sector: string | null;
  role: string | null;
  worker_count: number;
}
export interface DashRisk {
  id: string;
  ghe_id: string | null;
  category: string;
  agent_name: string;
  severity: number;
  probability: number;
  magnitude: number;
  exposed_workers: number | null;
  risk_level: string;
}
export interface DashAction {
  id: string;
  pgr_document_id: string;
  risk_id: string | null;
  description: string;
  control_hierarchy: string | null;
  responsible: string | null;
  deadline: string | null;
  status: string;
  cost: number | null;
  created_at: string;
  updated_at: string;
}
export interface DashChecklistItem {
  id: string;
  action_item_id: string;
  title: string;
  done: boolean;
  order_index: number;
}

export const usePGRDashboardData = (pgrDocumentId: string) => {
  const [ghes, setGhes] = useState<DashGHE[]>([]);
  const [risks, setRisks] = useState<DashRisk[]>([]);
  const [actions, setActions] = useState<DashAction[]>([]);
  const [checklist, setChecklist] = useState<DashChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [g, r, a] = await Promise.all([
      supabase.from('pgr_ghe').select('id, name, sector, role, worker_count').eq('pgr_document_id', pgrDocumentId),
      supabase.from('pgr_risks').select('id, ghe_id, category, agent_name, severity, probability, risk_level').eq('pgr_document_id', pgrDocumentId),
      supabase.from('pgr_action_items').select('*').eq('pgr_document_id', pgrDocumentId).order('deadline', { nullsFirst: false }),
    ]);
    const acts = (a.data as any) || [];
    setGhes((g.data as any) || []);
    setRisks((r.data as any) || []);
    setActions(acts);

    if (acts.length > 0) {
      const ids = acts.map((x: any) => x.id);
      const { data: c } = await supabase
        .from('pgr_action_checklist_items')
        .select('*')
        .in('action_item_id', ids)
        .order('order_index');
      setChecklist((c as any) || []);
    } else {
      setChecklist([]);
    }
    setLoading(false);
  }, [pgrDocumentId]);

  useEffect(() => { reload(); }, [reload]);

  const reloadChecklistFor = useCallback(async (actionId: string) => {
    const { data } = await supabase
      .from('pgr_action_checklist_items')
      .select('*')
      .eq('action_item_id', actionId)
      .order('order_index');
    setChecklist(prev => [
      ...prev.filter(c => c.action_item_id !== actionId),
      ...((data as any) || []),
    ]);
  }, []);

  const reloadActions = useCallback(async () => {
    const { data } = await supabase
      .from('pgr_action_items').select('*').eq('pgr_document_id', pgrDocumentId).order('deadline', { nullsFirst: false });
    setActions((data as any) || []);
  }, [pgrDocumentId]);

  const aggregates = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const totalWorkers = ghes.reduce((s, g) => s + (g.worker_count || 0), 0);
    const criticalRisks = risks.filter(r => r.risk_level === 'intolerable' || r.risk_level === 'substantial').length;

    const byCategory: Record<string, number> = {};
    risks.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });

    const byLevel: Record<string, number> = { trivial:0, tolerable:0, moderate:0, substantial:0, intolerable:0 };
    risks.forEach(r => { byLevel[r.risk_level] = (byLevel[r.risk_level] || 0) + 1; });

    const byStatus: Record<string, number> = { pending:0, in_progress:0, done:0, cancelled:0 };
    actions.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

    const byHierarchy: Record<string, number> = { elimination:0, substitution:0, engineering:0, administrative:0, epi:0 };
    actions.forEach(a => { if (a.control_hierarchy) byHierarchy[a.control_hierarchy] = (byHierarchy[a.control_hierarchy] || 0) + 1; });

    const overdue = actions.filter(a => {
      if (!a.deadline || a.status === 'done' || a.status === 'cancelled') return false;
      return new Date(a.deadline) < today;
    }).length;

    const done = byStatus.done;
    const totalActive = actions.length - byStatus.cancelled;
    const completionPct = totalActive > 0 ? Math.round((done / totalActive) * 100) : 0;

    // Timeline: actions per month for next 12 months + overdue bucket
    const now = new Date();
    const monthBuckets: { key: string; label: string; total: number; overdue: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthBuckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        total: 0, overdue: 0,
      });
    }
    actions.forEach(a => {
      if (!a.deadline || a.status === 'done' || a.status === 'cancelled') return;
      const d = new Date(a.deadline);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const bucket = monthBuckets.find(b => b.key === key);
      if (bucket) {
        bucket.total += 1;
        if (d < today) bucket.overdue += 1;
      }
    });

    return {
      totalWorkers,
      criticalRisks,
      byCategory,
      byLevel,
      byStatus,
      byHierarchy,
      overdue,
      completionPct,
      monthBuckets,
    };
  }, [ghes, risks, actions]);

  return {
    ghes, risks, actions, checklist, loading,
    aggregates,
    reload, reloadActions, reloadChecklistFor,
  };
};
