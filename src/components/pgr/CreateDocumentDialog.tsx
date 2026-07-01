import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Wheat, Loader2 } from "lucide-react";
import type { PgrDocType } from "@/hooks/usePgrTerminology";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (type: PgrDocType) => Promise<void> | void;
}

export const CreateDocumentDialog = ({ open, onOpenChange, onSelect }: Props) => {
  const [creating, setCreating] = useState<PgrDocType | null>(null);

  const pick = async (t: PgrDocType) => {
    setCreating(t);
    try { await onSelect(t); } finally { setCreating(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolha o tipo de documento</DialogTitle>
          <DialogDescription>
            Selecione entre PGR (indústria/serviços — NR-01) ou PGTR (trabalhador rural — NR-31).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            disabled={!!creating}
            onClick={() => pick('pgr')}
            className="text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                {creating === 'pgr' ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
              </div>
              <div>
                <div className="font-semibold">PGR</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Programa de Gerenciamento de Riscos — NR-01. Indústria, comércio, serviços e obras.
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={!!creating}
            onClick={() => pick('pgtr')}
            className="text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                {creating === 'pgtr' ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Wheat className="h-6 w-6 text-primary" />}
              </div>
              <div>
                <div className="font-semibold">PGTR</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Plano de Gerenciamento de Riscos do Trabalhador Rural — NR-31. Agricultura, pecuária, silvicultura e aquicultura.
                </div>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!creating}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
