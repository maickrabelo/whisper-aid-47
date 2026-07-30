import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountType: "sst" | "company";
  accountId: string;
  onInvited?: () => void;
}

const InviteCollaboratorDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  accountType,
  accountId,
  onInvited,
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-collaborator", {
        body: { email: trimmed, account_type: accountType, account_id: accountId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setAcceptUrl((data as any)?.accept_url ?? null);
      toast({
        title: "Convite enviado!",
        description: (data as any)?.email_sent
          ? `${trimmed} receberá um e-mail com o link de aceite.`
          : `Convite criado, mas o e-mail não pôde ser enviado. Copie o link abaixo e envie manualmente.`,
      });
      setEmail("");
      onInvited?.();
    } catch (e: any) {
      toast({
        title: "Erro ao enviar convite",
        description: e.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!acceptUrl) return;
    await navigator.clipboard.writeText(acceptUrl);
    toast({ title: "Link copiado!" });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Convidar colaborador</DialogTitle>
            <DialogDescription>
              Insira o e-mail da pessoa que deseja convidar. Ela receberá um link para criar a conta
              ou aceitar o acesso, e poderá gerenciar a mesma conta que você.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colaborador@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
          </div>
          {acceptUrl && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">
                Link do convite (envie manualmente caso o e-mail não chegue):
              </p>
              <p className="text-xs break-all font-mono">{acceptUrl}</p>
              <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar link
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCollaboratorDialog;
