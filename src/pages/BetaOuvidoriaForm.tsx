import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Copy, Upload, AlertTriangle, Lock } from "lucide-react";
import {
  REPORT_TYPE_OPTIONS, CATEGORY_OPTIONS, OCCURRENCE_OPTIONS, isBetaOuvidoriaCompany,
} from "@/lib/betaOuvidoria";

const schema = z.object({
  report_type: z.enum(["denuncia", "reclamacao", "sugestao", "elogio"]),
  category: z.enum(["assedio", "discriminacao", "fraude", "conflito_interesses", "conduta", "uso_indevido_bens", "quebra_sigilo", "outros"]),
  category_other: z.string().max(200).optional(),
  description: z.string().min(20, "Mínimo de 20 caracteres").max(5000),
  occurrence_type: z.enum(["data_especifica", "recorrente", "nao_recorda"]),
  occurrence_date: z.string().optional(),
  location_sector: z.string().max(200).optional(),
});

const BetaOuvidoriaForm = () => {
  const { companyId } = useParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<{ id: string; name: string; logo_url?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [protocol, setProtocol] = useState<{ tracking_code: string } | null>(null);

  const [form, setForm] = useState({
    report_type: "denuncia",
    category: "assedio",
    category_other: "",
    description: "",
    occurrence_type: "data_especifica",
    occurrence_date: "",
    location_sector: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!companyId) { setLoading(false); return; }
      let allowed = isBetaOuvidoriaCompany(companyId);
      if (!allowed) {
        const { data: rpc } = await (supabase as any).rpc('company_has_smart_ouvidoria', { _company_id: companyId });
        allowed = !!rpc;
      }
      if (!allowed) { setLoading(false); return; }
      const { data } = await supabase.from("companies").select("id, name, logo_url").eq("id", companyId).maybeSingle();
      setCompany(data as any);
      setLoading(false);
    };
    load();
  }, [companyId]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 5);
    const valid = list.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length !== list.length) {
      toast({ title: "Arquivo muito grande", description: "Cada arquivo deve ter até 10 MB.", variant: "destructive" });
    }
    setFiles(valid);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const attachments: any[] = [];
      for (const f of files) {
        const path = `${companyId}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("beta-ouvidoria-attachments").upload(path, f, {
          contentType: f.type, upsert: false,
        });
        if (error) { console.error(error); continue; }
        attachments.push({ file_path: path, file_name: f.name, mime_type: f.type, size_bytes: f.size });
      }

      const { data, error } = await supabase.functions.invoke("submit-beta-report", {
        body: { ...form, company_id: companyId, attachments },
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? "Erro");
      setProtocol({ tracking_code: data.tracking_code });
    } catch (e: any) {
      toast({ title: "Não foi possível enviar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!company) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Canal indisponível</CardTitle>
              <CardDescription>Este canal beta não está disponível para a empresa informada.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt={`Logo ${company.name}`} className="h-14 w-14 object-contain rounded-md bg-white border" />
              ) : (
                <div className="h-14 w-14 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {company.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Canal Anônimo de Ouvidoria
                </CardTitle>
                <CardDescription className="mt-1">
                  <strong>{company.name}</strong> — Seu relato é fundamental para mantermos um ambiente seguro, ético e transparente.
                  Este canal é 100% anônimo. Não coletamos seu IP, localização ou qualquer dado de
                  navegação. Sinta-se seguro para relatar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">1. Triagem e Classificação</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Relato</Label>
              <RadioGroup value={form.report_type} onValueChange={(v) => update("report_type", v)} className="grid md:grid-cols-2 gap-2">
                {REPORT_TYPE_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-start gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value={o.value} className="mt-1" />
                    <div>
                      <div className="font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.description}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Categoria do Assunto</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.category === "outros" && (
                <Input
                  placeholder="Especifique o setor ou tema geral"
                  value={form.category_other}
                  onChange={(e) => update("category_other", e.target.value)}
                  maxLength={200}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">2. O Relato</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição dos Fatos *</Label>
              <Textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Descreva o que aconteceu de forma detalhada. O que houve? Como aconteceu? Quem estava envolvido? (Evite citar dados que revelem a sua identidade)."
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">{form.description.length}/5000</p>
            </div>
            <div className="space-y-2">
              <Label>Data / Período do Acontecimento</Label>
              <RadioGroup value={form.occurrence_type} onValueChange={(v) => update("occurrence_type", v)} className="space-y-2">
                {OCCURRENCE_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={o.value} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
              {form.occurrence_type === "data_especifica" && (
                <Input type="date" value={form.occurrence_date} onChange={(e) => update("occurrence_date", e.target.value)} max={new Date().toISOString().split("T")[0]} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local / Setor onde ocorreu</Label>
              <Input
                id="location"
                placeholder="Ex.: Administrativo, Operacional, Comercial, Unidade X"
                value={form.location_sector}
                onChange={(e) => update("location_sector", e.target.value)}
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">3. Evidências (opcional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-accent">
              <Upload className="h-4 w-4" />
              <span>Anexar arquivos (PDF, imagens, áudio, docs)</span>
              <input type="file" multiple className="hidden" onChange={onFiles}
                accept=".pdf,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.doc,.docx,.txt" />
            </Label>
            {files.length > 0 && (
              <ul className="text-sm space-y-1">
                {files.map((f, i) => <li key={i} className="text-muted-foreground">• {f.name}</li>)}
              </ul>
            )}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção aos metadados</AlertTitle>
              <AlertDescription>
                Certifique-se de que os arquivos anexados não contenham metadados ou nomes no
                documento que possam identificar você.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row justify-between gap-3">
          <Link to="/ouvidoria-beta/acompanhar" className="text-sm text-primary hover:underline self-center">
            Já tenho um protocolo — acompanhar relato
          </Link>
          <Button size="lg" onClick={submit} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar relato anônimo"}
          </Button>
        </div>
      </main>
      <Footer />

      <Dialog open={!!protocol} onOpenChange={(o) => { if (!o) window.location.href = "/"; }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Relato registrado com segurança</DialogTitle>
            <DialogDescription>
              Guarde este número de protocolo em um local seguro. Você precisará dele para
              acompanhar a resposta da ouvidoria ou responder perguntas adicionais, sempre
              de forma anônima.
            </DialogDescription>
          </DialogHeader>
          {protocol && (
            <div className="space-y-3">
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Protocolo</div>
                  <div className="font-mono text-lg">{protocol.tracking_code}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(protocol.tracking_code); toast({ title: "Copiado" }); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button asChild><Link to="/ouvidoria-beta/acompanhar">Ir para acompanhamento</Link></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BetaOuvidoriaForm;
