import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, FileDown } from "lucide-react";
import { ReportSignatureFields } from "@/components/psychosocial/ReportSignatureFields";
import { EMPTY_SIGNATURES, ReportSignatures, loadSignatures, saveSignatures } from "@/lib/reportSignatures";

interface Props {
  /** Chave de persistência (ex.: `aep:<companyId>`) */
  scope: string;
  /** Rótulo do botão que abre o diálogo */
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "lg";
  triggerClassName?: string;
  disabled?: boolean;
  generating?: boolean;
  onGenerate: (signatures: ReportSignatures) => void | Promise<void>;
}

export function SignatureSettingsDialog({
  scope,
  triggerLabel = "Exportar PDF",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
  disabled,
  generating,
  onGenerate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<ReportSignatures>(EMPTY_SIGNATURES);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(loadSignatures(scope));
  }, [open, scope]);

  const handleGenerate = async () => {
    saveSignatures(scope, value);
    setBusy(true);
    try {
      await onGenerate(value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || !!generating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName} disabled={disabled}>
          <FileDown className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinaturas do relatório</DialogTitle>
          <DialogDescription>
            Informe manualmente quem assina o documento. Os dados ficam salvos para os próximos relatórios.
          </DialogDescription>
        </DialogHeader>

        <ReportSignatureFields value={value} onChange={(patch) => setValue({ ...value, ...patch })} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
