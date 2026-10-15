import { translatePasswordError } from '@/lib/errorUtils';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { useToast } from '@/hooks/use-toast';
import { needsHotmartProfileCompletion } from '@/lib/profileCompletion';
import { useSmsPlan } from '@/hooks/useSmsPlan';
import srSmsLogo from '@/assets/sr-sms-logo.png.asset.json';
import PasswordStrengthHints, { isStrongPassword } from '@/components/PasswordStrengthHints';

const ChangePassword: React.FC = () => {
  const { user, profile, role, isLoading, refreshRole } = useRealAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSmsPlan } = useSmsPlan();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
    // If profile loaded and must_change_password is false, redirect based on role
    if (!isLoading && profile && !(profile as any).must_change_password) {
      (async () => {
        if (await needsHotmartProfileCompletion(user!.id)) {
          navigate('/completar-cadastro');
          return;
        }
        if (role === 'admin') navigate('/master-dashboard');
        else if (role === 'sst') navigate('/sst-dashboard');
        else if (role === 'partner') navigate('/parceiro/dashboard');
        else if (role === 'affiliate') navigate('/afiliado/dashboard');
        else if ((role as string) === 'sales') navigate('/sales-dashboard');
        else navigate('/dashboard');
      })();
    }
  }, [isLoading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStrongPassword(newPassword)) {
      toast({
        title: 'Senha fraca',
        description:
          'Sua senha precisa atender todos os requisitos de segurança listados abaixo do campo.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) throw passwordError;

      // Update must_change_password flag and clear reset reason
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false, password_reset_reason: null } as any)
        .eq('id', user!.id);

      if (profileError) throw profileError;

      toast({
        title: 'Senha atualizada!',
        description: 'Sua nova senha foi salva com sucesso. Redirecionando...',
      });

      // Refresh profile data and redirect
      await refreshRole();

      const needsCompletion = await needsHotmartProfileCompletion(user!.id);
      setTimeout(() => {
        if (needsCompletion) {
          navigate('/completar-cadastro');
          return;
        }
        if (role === 'admin') navigate('/master-dashboard');
        else if (role === 'sst') navigate('/sst-dashboard');
        else if (role === 'partner') navigate('/parceiro/dashboard');
        else if (role === 'affiliate') navigate('/afiliado/dashboard');
        else if ((role as string) === 'sales') navigate('/sales-dashboard');
        else navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Erro ao atualizar senha',
        description: translatePasswordError(error.message),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <a href="/" className="mb-6">
        <img
          src={isSmsPlan ? srSmsLogo.url : '/lovable-uploads/Logo_SOIA.png'}
          alt={isSmsPlan ? 'Sr. SMS' : 'SOIA'}
          className={isSmsPlan ? 'h-20 object-contain' : 'h-14 object-contain'}
        />
      </a>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {(profile as any)?.password_reset_reason === 'system_update'
              ? 'Defina uma nova senha'
              : 'Criar Nova Senha'}
          </CardTitle>
          <CardDescription>
            {(profile as any)?.password_reset_reason === 'system_update'
              ? 'Devido a uma atualização do sistema, sua senha foi alterada para o número do seu CNPJ. Você acabou de entrar com ela — agora defina uma nova senha para continuar.'
              : 'Este é seu primeiro acesso. Por segurança, crie uma nova senha para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
              <PasswordStrengthHints password={newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">As senhas não conferem.</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Nova Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
