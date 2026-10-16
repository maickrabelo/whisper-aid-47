import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { labelOf, REPORT_TYPE_OPTIONS, CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/lib/betaOuvidoria";

const BetaOuvidoriaTrack = () => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [reply, setReply] = useState("");

  const consult = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("track-beta-report", {
        body: { tracking_code: code.trim().toUpperCase() },
      });
      if (error || res?.error) throw new Error(res?.error ?? error?.message);
      setData(res);
    } catch (e: any) {
      toast({ title: "Não encontrado", description: e.message, variant: "destructive" });
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (reply.trim().length < 2) return;
    try {
      const { data: res, error } = await supabase.functions.invoke("reply-beta-report", {
        body: { tracking_code: code.trim().toUpperCase(), message: reply.trim() },
      });
      if (error || res?.error) throw new Error(res?.error ?? error?.message);
      toast({ title: "Resposta enviada" });
      setReply("");
      consult();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acompanhar relato anônimo</CardTitle>
            <CardDescription>
              Informe o número de protocolo recebido ao enviar o relato. Nenhuma
              informação pessoal será solicitada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Protocolo</Label>
              <Input
                placeholder="BETA-XXXX999"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button onClick={consult} disabled={loading || !code.trim()}>
              {loading ? "Consultando…" : "Consultar"}
            </Button>
          </CardContent>
        </Card>

        {data?.report && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="font-mono">{data.report.tracking_code}</CardTitle>
                <Badge variant="outline">{labelOf(STATUS_OPTIONS as any, data.report.status)}</Badge>
              </div>
              <CardDescription>
                {labelOf(REPORT_TYPE_OPTIONS as any, data.report.report_type)} •{" "}
                {labelOf(CATEGORY_OPTIONS as any, data.report.category)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="whitespace-pre-wrap break-words text-sm">{data.report.description}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Histórico</Label>
                {data.updates.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
                )}
                {data.updates.map((u: any) => (
                  <div key={u.id} className={`border rounded-md p-3 text-sm ${u.author_type === "anonymous" ? "bg-muted/40" : ""}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {u.author_type === "anonymous" ? "Você (anônimo)" : "Ouvidoria"} •{" "}
                      {new Date(u.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="whitespace-pre-wrap">{u.message}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Enviar nova mensagem (anônima)</Label>
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={4000} />
                <Button onClick={sendReply} disabled={reply.trim().length < 2}>Enviar</Button>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
};

export default BetaOuvidoriaTrack;
