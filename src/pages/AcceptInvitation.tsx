import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, Mail, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "loading" | "needs_account" | "wrong_email" | "success" | "error";

// Lê a mensagem real enviada pela função (o padrão é só "non-2xx status code").
async function readFunctionError(error: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    }
  } catch {
    /* ignore */
  }
  return error?.message || "Erro inesperado.";
}

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [invitedEmail, setInvitedEmail] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const acceptWithSession = async () => {
    const { data, error } = await supabase.functions.invoke("accept-invitation", {
      body: { invitation_token: token },
    });
    if (error) throw error;
    if ((data as any)?.error) {
      const msg = (data as any).error as string;
      if (msg.includes("convite é para")) {
        setInvitedEmail(msg.match(/para (.+?)\./)?.[1] || "");
        setStatus("wrong_email");
        setMessage(msg);
        return;
      }
      throw new Error(msg);
    }
    setStatus("success");
    toast({ title: "Convite aceito!", description: "Redirecionando..." });
    setTimeout(() => {
      window.location.href = data.account_type === "sst" ? "/sst-dashboard" : "/dashboard";
    }, 1200);
  };

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token inválido.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        try {
          await acceptWithSession();
        } catch (e: any) {
          setStatus("error");
          setMessage(e.message || "Erro ao aceitar convite.");
        }
        return;
      }

      // No session — fetch invite info to show signup form
      try {
        const { data, error } = await supabase.functions.invoke("signup-from-invitation", {
          body: { action: "info", token },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setInvitedEmail(data.email);
        setAccountName(data.account_name || "");
        setStatus("needs_account");
      } catch (e: any) {
        setStatus("error");
        setMessage(e.message || "Convite inválido.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || password.length < 6) {
      toast({ variant: "destructive", title: "Preencha nome e senha (mín. 6 caracteres)." });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-from-invitation", {
        body: { action: "signup", token, full_name: fullName, password },
      });
      if (error) throw new Error(await readFunctionError(error));
      if ((data as any)?.error) throw new Error((data as any).error);

      // Sign in
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password,
      });
      if (signErr) throw signErr;

      await acceptWithSession();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
      setStatus("needs_account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password,
      });
      if (error) throw error;
      await acceptWithSession();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Não foi possível entrar", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <a href="/" className="mb-6">
        <img src="/lovable-uploads/Logo_SOIA.png" alt="SOIA" className="h-14 object-contain" />
      </a>
      <Card className="w-full max-w-md">
        {status === "loading" && (
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Processando convite...</p>
          </CardContent>
        )}

        {status === "needs_account" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Você foi convidado{accountName ? ` para ${accountName}` : ""}</CardTitle>
              <CardDescription>
                Convite para <strong>{invitedEmail}</strong>. {mode === "signup" ? "Crie sua senha para entrar." : "Entre com sua senha SOIA."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "signup" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode("signup")}
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Criar conta
                </Button>
                <Button
                  type="button"
                  variant={mode === "login" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode("login")}
                >
                  <LogIn className="h-4 w-4 mr-1" /> Já tenho conta
                </Button>
              </div>

              <form onSubmit={mode === "signup" ? handleSignup : handleLogin} className="space-y-3">
                <div>
                  <Label>E-mail</Label>
                  <Input value={invitedEmail} disabled />
                </div>
                {mode === "signup" && (
                  <div>
                    <Label>Seu nome completo</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                )}
                <div>
                  <Label>{mode === "signup" ? "Crie uma senha" : "Senha"}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Criar conta e entrar" : "Entrar e aceitar convite"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {status === "wrong_email" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>E-mail incorreto</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = `/convite/${token}`;
                }}
              >
                Sair e usar outro e-mail
              </Button>
            </CardContent>
          </>
        )}

        {status === "success" && (
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold">Convite aceito!</h2>
            <p className="text-muted-foreground">Redirecionando para o dashboard...</p>
          </CardContent>
        )}

        {status === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Não foi possível aceitar</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                Voltar ao início
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default AcceptInvitation;
