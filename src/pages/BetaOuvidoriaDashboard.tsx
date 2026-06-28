import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealAuth } from "@/contexts/RealAuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Copy, ExternalLink, ClipboardList, AlertCircle, Activity, CheckCircle2, Calendar, Download, FileImage, FileVideo, FileAudio, File, Building2,
} from "lucide-react";
import {
  isBetaOuvidoriaCompany, labelOf,
  REPORT_TYPE_OPTIONS, CATEGORY_OPTIONS, STATUS_OPTIONS, BETA_OUVIDORIA_COMPANY_IDS,
} from "@/lib/betaOuvidoria";

const COLORS = ["#0F3460", "#1A97B9", "#1E6F5C", "#D32626", "#E97E00", "#777777", "#8e44ad", "#16a085"];

const BetaOuvidoriaDashboard = () => {
  const { profile, role } = useRealAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: "todos", category: "todos", search: "" });
  const [selected, setSelected] = useState<any | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<string>("aberto");

  const isSst = role === 'sst';
  const [managerCompanies, setManagerCompanies] = useState<Array<{ id: string; name: string; logo_url?: string | null }>>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Determine company scope
  useEffect(() => {
    (async () => {
      if (isSst) {
        // Find this user's sst_manager_id, then list assigned companies that have smart ouvidoria
        const { data: prof } = await supabase
          .from('profiles')
          .select('sst_manager_id')
          .eq('id', profile?.id as string)
          .maybeSingle();
        const managerId = (prof as any)?.sst_manager_id;
        if (!managerId) { setManagerCompanies([]); return; }
        const { data: assignments } = await supabase
          .from('company_sst_assignments')
          .select('company_id, companies:company_id (id, name, logo_url)')
          .eq('sst_manager_id', managerId);
        const list = (assignments || [])
          .map((a: any) => a.companies)
          .filter(Boolean);
        // Filter only smart-enabled
        const filtered: any[] = [];
        for (const c of list) {
          const enabled =
            isBetaOuvidoriaCompany(c.id) ||
            !!(await (supabase as any).rpc('company_has_smart_ouvidoria', { _company_id: c.id })).data;
          if (enabled) filtered.push(c);
        }
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        setManagerCompanies(filtered);
        const fromUrl = searchParams.get('company');
        const initial = fromUrl && filtered.some(c => c.id === fromUrl) ? fromUrl : (filtered[0]?.id ?? null);
        setSelectedCompanyId(initial);
      } else {
        setSelectedCompanyId(profile?.company_id ?? null);
      }
    })();
  }, [isSst, profile?.id, profile?.company_id]);

  const companyId = selectedCompanyId;
  const [allowed, setAllowed] = useState<boolean>(false);

  const publicLink = useMemo(
    () => companyId ? `${window.location.origin}/ouvidoria-beta/${companyId}` : '',
    [companyId]
  );

  useEffect(() => {
    if (!companyId) { setAllowed(false); setLoading(false); return; }
    if (isSst) { setSearchParams((sp) => { const n = new URLSearchParams(sp); n.set('company', companyId); return n; }, { replace: true }); }
    (async () => {
      setLoading(true);
      let isAllowed = isBetaOuvidoriaCompany(companyId);
      if (!isAllowed) {
        const { data: rpc } = await (supabase as any).rpc('company_has_smart_ouvidoria', { _company_id: companyId });
        isAllowed = !!rpc;
      }
      setAllowed(isAllowed);
      if (!isAllowed) { setLoading(false); return; }
      const { data } = await supabase
        .from("beta_ouvidoria_reports")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setReports((data as any[]) ?? []);
      setLoading(false);
    })();
  }, [companyId, isSst]);

  const stats = useMemo(() => {
    const total = reports.length;
    const aberto = reports.filter((r) => r.status === "aberto").length;
    const em_analise = reports.filter((r) => r.status === "em_analise").length;
    const respondido = reports.filter((r) => r.status === "respondido").length;
    const encerrado = reports.filter((r) => r.status === "encerrado").length;
    return { total, aberto, em_analise, respondido, encerrado };
  }, [reports]);

  const monthlyData = useMemo(() => {
    const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const d = new Date(r.created_at);
      counts[`${d.getFullYear()}-${d.getMonth()}`] = (counts[`${d.getFullYear()}-${d.getMonth()}`] || 0) + 1;
    });
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { name: monthNames[d.getMonth()], relatos: counts[`${d.getFullYear()}-${d.getMonth()}`] || 0 };
    });
  }, [reports]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: labelOf(CATEGORY_OPTIONS, key), value,
    }));
  }, [reports]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.report_type] = (counts[r.report_type] || 0) + 1;
    });
    return Object.entries(counts).map(([key, value]) => ({
      name: labelOf(REPORT_TYPE_OPTIONS, key), value,
    }));
  }, [reports]);

  const statusData = useMemo(() => ([
    { name: "Aberto", value: stats.aberto },
    { name: "Em análise", value: stats.em_analise },
    { name: "Respondido", value: stats.respondido },
    { name: "Encerrado", value: stats.encerrado },
  ]), [stats]);

  const filteredReports = useMemo(() => reports.filter((r) =>
    (filter.status === "todos" || r.status === filter.status) &&
    (filter.category === "todos" || r.category === filter.category) &&
    (!filter.search ||
      r.tracking_code.toLowerCase().includes(filter.search.toLowerCase()) ||
      r.description.toLowerCase().includes(filter.search.toLowerCase()))
  ), [reports, filter]);

  const openDetail = async (r: any) => {
    setSelected(r);
    setNewStatus(r.status);
    const [{ data: u }, { data: a }] = await Promise.all([
      supabase.from("beta_ouvidoria_updates").select("*").eq("report_id", r.id).order("created_at", { ascending: true }),
      supabase.from("beta_ouvidoria_attachments").select("*").eq("report_id", r.id).order("created_at", { ascending: true }),
    ]);
    setUpdates((u as any[]) ?? []);
    setAttachments((a as any[]) ?? []);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const hasStatusChange = newStatus !== selected.status;
    const hasReply = reply.trim().length > 0;
    if (!hasStatusChange && !hasReply) {
      toast({ title: "Nenhuma alteração", description: "Altere o status ou escreva uma mensagem.", variant: "destructive" });
      return;
    }
    try {
      if (hasReply) {
        const { error } = await supabase.from("beta_ouvidoria_updates").insert({
          report_id: selected.id, author_type: "investigator", message: reply.trim(),
        });
        if (error) throw error;
      }
      if (hasStatusChange) {
        const { error } = await supabase.from("beta_ouvidoria_reports").update({ status: newStatus }).eq("id", selected.id);
        if (error) throw error;
        setReports((rs) => rs.map((r) => r.id === selected.id ? { ...r, status: newStatus } : r));
        setSelected({ ...selected, status: newStatus });
      }
      const { data: u } = await supabase.from("beta_ouvidoria_updates").select("*").eq("report_id", selected.id).order("created_at", { ascending: true });
      setUpdates((u as any[]) ?? []);
      setReply("");
      toast({ title: "Atualização salva" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <File className="h-4 w-4" />;
    if (type.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (type.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const downloadAttachment = async (att: any) => {
    try {
      const { data, error } = await supabase.storage.from("beta-ouvidoria-attachments").download(att.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = att.file_name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Erro ao baixar", description: e.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const label = labelOf(STATUS_OPTIONS, status);
    switch (status) {
      case "encerrado": return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{label}</Badge>;
      case "respondido": return <Badge className="bg-green-100 text-green-800 border-green-300">{label}</Badge>;
      case "em_analise": return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{label}</Badge>;
      case "aberto": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{label}</Badge>;
      default: return <Badge variant="outline">{label}</Badge>;
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Canal indisponível</CardTitle>
              <CardDescription>Este canal está disponível apenas para empresas habilitadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="audit-container max-w-7xl mx-auto px-4">
          {isSst && (
            <div className="mb-4">
              <Button
                variant="secondary"
                size="sm"
                className="font-semibold shadow-sm"
                onClick={() => navigate('/sst-dashboard')}
              >
                ← Voltar ao Dashboard SST
              </Button>
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-audit-primary">Ouvidoria Smart</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Canal 100% anônimo
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {isSst && managerCompanies.length > 0 && (
                <Select value={selectedCompanyId ?? ''} onValueChange={(v) => setSelectedCompanyId(v)}>
                  <SelectTrigger className="w-64">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Selecionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" disabled={!publicLink} onClick={() => { navigator.clipboard.writeText(publicLink); toast({ title: "Link copiado" }); }}>
                <Copy className="h-4 w-4 mr-2" /> Copiar link público
              </Button>
              <Button variant="outline" asChild disabled={!publicLink}>
                <a href={publicLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Abrir formulário</a>
              </Button>
            </div>
          </div>

          {isSst && managerCompanies.length === 0 && (
            <Card className="mb-6"><CardContent className="p-4 text-sm text-muted-foreground">
              Nenhuma empresa com Ouvidoria Smart habilitada. Habilite o recurso pelo card "Ferramentas" da empresa.
            </CardContent></Card>
          )}


          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md"><ClipboardList className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total de relatos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-md"><AlertCircle className="h-5 w-5 text-yellow-700" /></div>
                <div>
                  <div className="text-2xl font-bold">{stats.aberto}</div>
                  <div className="text-xs text-muted-foreground">Abertos</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-md"><Activity className="h-5 w-5 text-blue-700" /></div>
                <div>
                  <div className="text-2xl font-bold">{stats.em_analise}</div>
                  <div className="text-xs text-muted-foreground">Em análise</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-md"><CheckCircle2 className="h-5 w-5 text-green-700" /></div>
                <div>
                  <div className="text-2xl font-bold">{stats.respondido + stats.encerrado}</div>
                  <div className="text-xs text-muted-foreground">Respondidos/Encerrados</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList className="grid grid-cols-3 mb-4 w-full max-w-md">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Relatos por Mês</CardTitle>
                  <CardDescription>Distribuição ao longo dos últimos 12 meses</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="relatos" stroke="#0F3460" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" forceMount className="data-[state=inactive]:hidden">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Por Categoria</CardTitle>
                    <CardDescription>Distribuição por assunto</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} fontSize={11} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" name="Relatos">
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Por Tipo de Relato</CardTitle>
                    <CardDescription>Denúncia, reclamação, sugestão, elogio</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={typeData} cx="50%" cy="50%" outerRadius={110} dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                            {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="status" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Relatos</CardTitle>
                  <CardDescription>Distribuição do status atual</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" outerRadius={120} dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Refine a lista de relatos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/3">
                  <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-1/3">
                  <Select value={filter.category} onValueChange={(v) => setFilter({ ...filter, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as categorias</SelectItem>
                      {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-1/3">
                  <Input
                    placeholder="Buscar por protocolo ou descrição"
                    value={filter.search}
                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Relatos recebidos</CardTitle>
              <CardDescription>
                {filteredReports.length} {filteredReports.length === 1 ? "relato encontrado" : "relatos encontrados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium">Protocolo</th>
                      <th className="px-4 py-3 text-left font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left font-medium">Categoria</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Data</th>
                      <th className="px-4 py-3 text-left font-medium">Setor</th>
                      <th className="px-4 py-3 text-left font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Carregando…</td></tr>
                    ) : filteredReports.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum relato encontrado.</td></tr>
                    ) : (
                      filteredReports.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-4 text-audit-primary font-mono text-xs">{r.tracking_code}</td>
                          <td className="px-4 py-4">{labelOf(REPORT_TYPE_OPTIONS, r.report_type)}</td>
                          <td className="px-4 py-4">
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                              {labelOf(CATEGORY_OPTIONS, r.category)}
                            </span>
                          </td>
                          <td className="px-4 py-4">{getStatusBadge(r.status)}</td>
                          <td className="px-4 py-4 text-gray-500">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-4 text-gray-600 max-w-[160px] truncate">{r.location_sector ?? "—"}</td>
                          <td className="px-4 py-4">
                            <Button variant="outline" size="sm" onClick={() => openDetail(r)}>Detalhes</Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setUpdates([]); setAttachments([]); setReply(""); } }}>
        {selected && (
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center gap-2">
                <span className="font-mono text-base">{selected.tracking_code}</span>
                {getStatusBadge(selected.status)}
              </DialogTitle>
              <DialogDescription className="flex justify-between text-sm flex-wrap gap-2">
                <span>
                  {labelOf(REPORT_TYPE_OPTIONS, selected.report_type)} ·{" "}
                  {labelOf(CATEGORY_OPTIONS, selected.category)}
                  {selected.category_other ? ` — ${selected.category_other}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-4 overflow-y-auto flex-1 pr-2">
              <div>
                <h3 className="font-medium mb-2">Descrição do relato</h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap break-words">
                  {selected.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 text-xs">Setor / Local</span>
                  <p className="font-medium mt-1">{selected.location_sector ?? "—"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600 text-xs">Período</span>
                  <p className="font-medium mt-1">{selected.occurrence_date ?? labelOf([
                    { value: "data_especifica", label: "Data específica" },
                    { value: "recorrente", label: "Recorrente" },
                    { value: "nao_recorda", label: "Não recordado" },
                  ], selected.occurrence_type)}</p>
                </div>
              </div>

              {attachments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Anexos ({attachments.length})</h3>
                  <div className="space-y-2">
                    {attachments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {getFileIcon(a.mime_type)}
                          <div>
                            <p className="text-sm font-medium truncate max-w-[240px]">{a.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(a.mime_type ?? "arquivo").split("/")[0]}
                              {a.size_bytes ? ` • ${(a.size_bytes / 1024).toFixed(1)} KB` : ""}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadAttachment(a)}>
                          <Download className="h-4 w-4 mr-1" /> Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-3">Histórico de mensagens</h3>
                {updates.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma mensagem ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {updates.map((u) => (
                      <li key={u.id} className={`p-3 rounded-md border ${u.author_type === "investigator" ? "bg-primary/5" : "bg-muted/30"}`}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {u.author_type === "investigator" ? "Ouvidoria" : "Denunciante anônimo"} ·{" "}
                          {new Date(u.created_at).toLocaleString("pt-BR")}
                        </div>
                        <p className="whitespace-pre-wrap text-sm break-words">{u.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-3">Alterar status</h3>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="font-medium mb-3">Resposta ao denunciante (opcional)</h3>
                <Textarea
                  placeholder="Escreva uma resposta. Ela ficará visível para o denunciante anônimo no painel de acompanhamento."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={4000}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={newStatus === selected.status && reply.trim().length === 0}>
                Salvar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default BetaOuvidoriaDashboard;
