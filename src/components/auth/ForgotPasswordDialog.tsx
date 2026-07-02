import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

const ForgotPasswordDialog = ({ open, onOpenChange, defaultEmail = "" }: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Sync defaultEmail when dialog reopens
  useState(() => {
    setEmail(defaultEmail);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("request-password-reset", {
        body: { email: email.trim() },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Email enviado!",
        description: "Se o email estiver cadastrado, você receberá as instruções em alguns segundos.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reset state when closing
      setTimeout(() => {
        setSent(false);
        setEmail(defaultEmail);
      }, 300);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>
            {sent
              ? "Verifique sua caixa de entrada (e o spam) para encontrar o email com instruções."
              : "Informe o email cadastrado e enviaremos um link para redefinir sua senha."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Se o email <strong className="text-foreground">{email}</strong> estiver cadastrado, em instantes você
              receberá um email com o link de recuperação.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-4 w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar email"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
