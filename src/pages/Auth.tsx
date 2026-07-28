import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import srSmsLogo from '@/assets/sr-sms-logo.png.asset.json';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { resolvePostLoginPath } from "@/lib/postLoginRedirect";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [forgotOpen, setForgotOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const invitationToken = searchParams.get('invitation');
  // Sr.SMS é a única marca do app
  const isSmsBrand = true;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('auth_brand', 'sms');
  }, [location.pathname, searchParams]);

  // Após login/signup com convite, aceita automaticamente
  useEffect(() => {
    if (!invitationToken) return;
    const sub = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && invitationToken) {
        try {
          const { data, error } = await supabase.functions.invoke('accept-invitation', {
            body: { invitation_token: invitationToken },
          });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          toast({ title: 'Convite aceito!', description: 'Redirecionando...' });
          setTimeout(() => {
            window.location.href = data.account_type === 'sst' ? '/sst-dashboard' : '/dashboard';
          }, 1200);
        } catch (e: any) {
          toast({ title: 'Erro ao aceitar convite', description: e.message, variant: 'destructive' });
        }
      }
    });
    return () => { sub.data.subscription.unsubscribe(); };
  }, [invitationToken, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Você será redirecionado...",
      });

      // Redirect will be handled by the AuthContext
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isSmsBrand ? 'bg-gradient-to-br from-green-50 to-emerald-100' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <a href="/" className="mb-6">
        <img
          src={isSmsBrand ? srSmsLogo.url : '/lovable-uploads/Logo_SOIA.png'}
          alt={isSmsBrand ? 'Sr. SMS' : 'SOIA'}
          className={isSmsBrand ? 'h-20 object-contain' : 'h-14 object-contain'}
        />
      </a>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Fazer login no portal</CardTitle>
          <CardDescription className="text-center">
            Entre ou crie sua conta para acessar o sistema
          </CardDescription>
          {invitationToken && (
            <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20 flex items-start gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Você foi convidado para uma conta. Faça login ou cadastre-se com o e-mail que recebeu o convite para aceitar automaticamente.</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
    </div>
  );
};

export default Auth;
