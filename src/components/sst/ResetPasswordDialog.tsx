import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Copy, KeyRound, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: {
    id: string;
    name: string;
    cnpj?: string | null;
    email?: string | null;
  } | null;
}

interface ResetResult {
  email: string;
  tempPassword: string;
  emailSent?: boolean;
  relatedCompanies: { name: string; cnpj: string | null }[];
}

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  open,
  onOpenChange,
  company,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setCopiedField(null);
      setSendEmail(true);
    }
  }, [open]);


  
  const handleReset = async () => {
    if (!company) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sst-reset-company-password', {
        body: { company_id: company.id, send_email: sendEmail },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao resetar senha');

      setResult({
        email: data.email,
        tempPassword: data.tempPassword,
        emailSent: data.emailSent,
        relatedCompanies: data.relatedCompanies || [{ name: company.name, cnpj: company.cnpj || null }],
      });

      toast({
        title: sendEmail && data.emailSent ? "Acesso gerado e e-mail enviado!" : "Senha gerada!",
        description: sendEmail && !data.emailSent
          ? "Senha criada, mas o e-mail não pôde ser enviado. Copie e envie manualmente."
          : "Compartilhe as credenciais com o cliente.",
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({ title: "Erro ao resetar senha", description: error.message || 'Tente novamente.', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Gerar acesso da empresa
          </DialogTitle>
          <DialogDescription>
            {result
              ? 'Credenciais geradas. Compartilhe com o cliente para que ele acompanhe a ouvidoria.'
              : `Gerar/Resetar acesso de ${company?.name}?`}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <p>Uma nova senha temporária será gerada. O usuário deverá alterá-la no primeiro acesso.</p>
            </div>
            <label className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-primary" /> Enviar credenciais por e-mail
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enviaremos um e-mail para a empresa com o login e a senha temporária.
                </p>
              </div>
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleReset} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  sendEmail ? 'Gerar & Enviar' : 'Gerar acesso'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email de acesso</label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-mono flex-1 truncate">{result.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => copyToClipboard(result.email, 'email')}
                >
                  {copiedField === 'email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Senha temporária</label>
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-sm font-mono font-bold flex-1">{result.tempPassword}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => copyToClipboard(result.tempPassword, 'password')}
                >
                  {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Related CNPJs */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                CNPJs vinculados a este email ({result.relatedCompanies.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {result.relatedCompanies.map((rc, idx) => (
                  <div key={idx} className="p-2.5 bg-muted rounded-lg text-sm">
                    <p className="font-medium text-foreground truncate">{rc.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {rc.cnpj || 'CNPJ não cadastrado'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  const text = `Email: ${result.email}\nSenha: ${result.tempPassword}\n\nEmpresas:\n${result.relatedCompanies.map(rc => `- ${rc.name} (${rc.cnpj || 'sem CNPJ'})`).join('\n')}`;
                  copyToClipboard(text, 'all');
                }}
                className="gap-2"
              >
                {copiedField === 'all' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                Copiar tudo
              </Button>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;
