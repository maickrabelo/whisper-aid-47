import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle, CheckCircle2, FileDown, GitBranch, Loader2, Lock, Save, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  LtcatDoc, LtcatEvaluation, LtcatExposure, LtcatEpiEpc, LtcatGhe,
} from '@/pages/LTCATDetail';
import { validateLtcatForPublication } from '@/lib/ltcatValidation';
import { generateLTCATReportPDF } from '@/components/ltcat/LTCATReportPDF';

interface Props {
  doc: LtcatDoc;
  company: { id: string; name: string; cnpj?: string | null; logo_url?: string | null } | null;
  ghes: LtcatGhe[];
  exposures: LtcatExposure[];
  epiEpcs: LtcatEpiEpc[];
  evaluations: LtcatEvaluation[];
  onChanged: () => void;
}

/** Validação de publicação, geração do PDF beta e versionamento imutável. */
const LtcatValidationPanel = ({ doc, company, ghes, exposures, epiEpcs, evaluations, onChanged }: Props) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'save' | 'publish' | 'pdf' | 'revision' | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const result = useMemo(
    () => validateLtcatForPublication(doc, ghes, exposures),
    [doc, ghes, exposures],
  );

  const readOnly = doc.status === 'published';

  const saveVersion = async () => {
    setBusy('save');
    try {
      const { error } = await supabase
        .from('ltcat_documents' as any)
        .update({
          validated_at: new Date().toISOString(),
          validated_payload: result as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', doc.id);
      if (error) throw error;
      toast.success('Versão salva com o resultado da validação atual.');
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao salvar versão.');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!result.ok) { toast.error('Existem erros bloqueantes. Corrija antes de publicar.'); return; }
    setBusy('publish');
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('ltcat_documents' as any)
        .update({
          status: 'published',
          published_at: now,
          validated_at: now,
          validated_payload: result as any,
          updated_at: now,
        } as any)
        .eq('id', doc.id);
      if (error) throw error;
      toast.success('Documento publicado. Agora ele está em somente leitura.');
      setConfirmPublish(false);
      onChanged();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao publicar.');
    } finally {
      setBusy(null);
    }
  };

  const newRevision = async () => {
    setBusy('revision');
    try {
      const { data, error } = await supabase.rpc('ltcat_create_revision' as any, { _ltcat_id: doc.id });
      if (error) throw error;
      toast.success('Nova revisão criada como rascunho. Você será redirecionado.');
      navigate(`/ltcat/${data}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Falha ao criar revisão.');
    } finally {
      setBusy(null);
    }
  };

  const generatePdf = async () => {
    if (!company) { toast.error('Empresa não carregada.'); return; }
    setBusy('pdf');
    try {
      await generateLTCATReportPDF({ doc, company, ghes, exposures, epiEpcs, evaluations });
      toast.success('PDF beta gerado.');
    } catch (err: any) {
      console.error(err);
      toast.error('Falha ao gerar o PDF.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Validação de publicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.ok ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Nenhum erro bloqueante. O documento pode ser salvo e publicado.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {result.blockers.length} erro(s) bloqueante(s)
              </p>
              <ul className="list-disc pl-6 text-sm space-y-1">
                {result.blockers.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-600">Avisos (não bloqueiam):</p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Última verificação: {new Date(result.checkedAt).toLocaleString('pt-BR')}
            {doc.validated_at && ` · Última versão salva: ${new Date(doc.validated_at).toLocaleString('pt-BR')}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {!readOnly && (
            <>
              <Button variant="outline" onClick={saveVersion} disabled={busy !== null}>
                {busy === 'save' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar versão
              </Button>
              <Button onClick={() => setConfirmPublish(true)} disabled={busy !== null || !result.ok}>
                <Lock className="h-4 w-4 mr-2" /> Publicar documento
              </Button>
            </>
          )}
          <Button variant="outline" onClick={generatePdf} disabled={busy !== null}>
            {busy === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            {readOnly ? 'Gerar PDF do LTCAT' : 'Gerar PDF (Beta)'}
          </Button>

          {readOnly && (
            <Button variant="outline" onClick={newRevision} disabled={busy !== null}>
              {busy === 'revision' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitBranch className="h-4 w-4 mr-2" />}
              Criar nova revisão
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo do conteúdo</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Badge variant="outline">{ghes.length} GHE(s)</Badge>
          <Badge variant="outline">{exposures.length} exposição(ões)</Badge>
          <Badge variant="outline">{epiEpcs.length} medida(s) EPI/EPC</Badge>
          <Badge variant="outline">{evaluations.length} avaliação(ões)</Badge>
          <Badge variant="outline">
            {exposures.filter((e) => e.engine_output).length} consulta(s) ao motor
          </Badge>
        </CardContent>
      </Card>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar LTCAT?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao publicar, o documento v{doc.version_number} fica congelado em somente leitura.
              Qualquer alteração posterior exigirá a criação de uma nova revisão, preservando
              integralmente o histórico. O PDF do documento publicado sai sem a marcação
              “BETA” — ela continua apenas nos rascunhos.
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={publish} disabled={busy === 'publish'}>
              {busy === 'publish' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LtcatValidationPanel;
