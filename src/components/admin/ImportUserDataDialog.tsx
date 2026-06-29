import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";

export function ImportUserDataDialog() {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    const text = await file.text();
    setJsonText(text);
  };

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const parsed = JSON.parse(jsonText);
      const { data, error } = await supabase.functions.invoke("import-user-data", {
        body: parsed,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na importação");
      setResult(data);
      toast({ title: "Importação concluída", description: "Veja o resumo abaixo." });
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: getSafeErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          <Upload className="mr-2 h-4 w-4" />
          Importar Dados de Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados de Usuário (JSON)</DialogTitle>
          <DialogDescription>
            Envia o JSON exportado para o edge function <code>import-user-data</code>.
            Detecta o e-mail, reaproveita a conta já existente, junta duplicidades na gestora mais recente
            e importa HSE-IT/COPSOQ/Burnout/Clima/Pulse, reports, ouvidoria, treinamentos e PGR completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Arquivo JSON</Label>
            <Input
              type="file"
              accept="application/json,.json"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          <div>
            <Label>Ou cole o JSON abaixo</Label>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"data": { "profile": {...}, "sst_manager": {...}, ... }}'
              className="font-mono text-xs min-h-[240px]"
            />
          </div>

          {result && (
            <div className="bg-muted rounded p-3 text-xs max-h-[260px] overflow-y-auto">
              <div className="mb-3 space-y-1">
                <p><strong>E-mail detectado:</strong> {result.detected_email || "não informado"}</p>
                <p><strong>Usuário destino:</strong> {result.target_user_id || "novo/inalterado"}</p>
                <p><strong>Gestora destino:</strong> {result.target_sst_manager_id || "nova/inalterada"}</p>
                {result.merged_duplicate_sst_manager_ids?.length > 0 && (
                  <p className="text-amber-700">
                    <strong>Duplicidades unificadas:</strong> {result.merged_duplicate_sst_manager_ids.length}
                  </p>
                )}
              </div>
              <p className="font-semibold mb-2">Resultado por tabela:</p>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th>Tabela</th><th>OK</th><th>Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.results || {}).map(([t, r]: any) => (
                    <tr key={t} className={r.err > 0 ? "text-destructive" : ""}>
                      <td>{t}</td>
                      <td>{r.ok}</td>
                      <td>{r.err}{r.err > 0 && r.errors?.length ? ` — ${r.errors[0]}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Fechar
          </Button>
          <Button onClick={handleImport} disabled={loading || !jsonText.trim()}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
