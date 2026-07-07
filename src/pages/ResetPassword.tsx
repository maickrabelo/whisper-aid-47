import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import srSmsLogo from "@/assets/sr-sms-logo.png.asset.json";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [validating, setValidating] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Recovery flow: Supabase puts tokens in URL hash (#access_token=...&type=recovery)
  // or an error in the hash (#error=...&error_description=...).
  useEffect(() => {
    let cancelled = false;
    let settled = false;
    const markValid = () => {
      if (cancelled || settled) return;
      settled = true;
      setHasValidSession(true);
      setValidating(false);
    };
    const markInvalid = () => {
      if (cancelled || settled) return;
      settled = true;
      setHasValidSession(false);
      setValidating(false);
    };

    // 1) Detect explicit error in hash (expired link, invalid token, etc.)
    const hash = window.location.hash || '';
    if (hash.includes('error=') || hash.includes('error_code=')) {
      markInvalid();
      return () => { cancelled = true; };
    }

    // 2) Listen for the PASSWORD_RECOVERY / SIGNED_IN event fired after the SDK
    //    exchanges the hash tokens for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markValid();
      }
    });

    // 3) If a session already exists (SDK processed the hash before listener
    //    was attached), accept it immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markValid();
    });

    // 4) Fallback: poll a few times before giving up, in case the SDK is slow.
    let attempts = 0;
    const interval = setInterval(async () => {
      if (settled || cancelled) { clearInterval(interval); return; }
      attempts += 1;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { clearInterval(interval); markValid(); return; }
      if (attempts >= 8) { // ~4s total
        clearInterval(interval);
        markInvalid();
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Senha redefinida!",
        description: "Você já pode fazer login com a nova senha.",
      });

      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();

      setTimeout(() => navigate("/auth"), 2500);
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const Logo = () => (
    <a href="/" className="mb-6">
      <img src={srSmsLogo.url} alt="SR SMS" className="h-14 object-contain" />
    </a>
  );

  if (validating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Logo />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Logo />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Link inválido ou expirado</CardTitle>
            <CardDescription>
              O link de recuperação não é mais válido. Solicite um novo email de recuperação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Logo />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Senha redefinida com sucesso!</CardTitle>
            <CardDescription>Redirecionando para o login...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Logo />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Definir nova senha</CardTitle>
          <CardDescription className="text-center">
            Digite sua nova senha abaixo. Use pelo menos 6 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Redefinir senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
