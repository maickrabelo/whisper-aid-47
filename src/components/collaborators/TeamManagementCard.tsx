import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Mail, Crown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InviteCollaboratorDialog from "./InviteCollaboratorDialog";

interface Collaborator {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_default: boolean;
  created_at: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Props {
  accountType: "sst" | "company";
  accountId: string;
  accountName?: string;
}

const TeamManagementCard: React.FC<Props> = ({ accountType, accountId, accountName }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `list-account-collaborators?account_type=${accountType}&account_id=${accountId}`,
        { method: "GET" },
      );
      if (error) throw error;
      setCollaborators(data?.collaborators || []);
      setPending(data?.pending_invitations || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar equipe", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, accountType]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Revogar este convite?")) return;
    const { error } = await supabase
      .from("account_invitations")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Convite revogado" });
    load();
  };

  const handleResend = async (email: string) => {
    setResending(email);
    try {
      const { data, error } = await supabase.functions.invoke("invite-collaborator", {
        body: { email, account_type: accountType, account_id: accountId, resend: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Convite reenviado",
        description: (data as any)?.email_sent
          ? `Novo link enviado para ${email}.`
          : `Convite atualizado, mas o e-mail falhou. Link: ${(data as any)?.accept_url ?? ""}`,
      });
      load();
    } catch (e: any) {
      toast({ title: "Erro ao reenviar", description: e.message, variant: "destructive" });
    } finally {
      setResending(null);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm("Remover este colaborador da conta?")) return;
    const { data, error } = await supabase.functions.invoke("remove-account-collaborator", {
      body: { account_type: accountType, account_id: accountId, user_id: userId },
    });
    const msg = error?.message || (data as any)?.error;
    if (msg) {
      toast({ title: "Erro", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Colaborador removido" });
    load();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Equipe da conta
            </CardTitle>
            <CardDescription>
              Convide colaboradores para acessar {accountName ? `"${accountName}"` : "esta conta"} com você.
              Todos terão acesso ao mesmo dashboard e ferramentas.
            </CardDescription>
          </div>
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Colaboradores ativos */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Colaboradores ativos ({collaborators.length})
                </h4>
                <div className="space-y-2">
                  {collaborators.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Nenhum colaborador ainda.</p>
                  )}
                  {collaborators.map((c) => (
                    <div
                      key={c.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {(c.full_name || c.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{c.full_name || "—"}</p>
                            {c.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" /> Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>
                      {!c.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(c.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Convites pendentes */}
              {pending.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Convites pendentes ({pending.length})
                  </h4>
                  <div className="space-y-2">
                    {pending.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Expira em {new Date(p.expires_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(p.email)}
                            disabled={resending === p.email}
                            title="Reenviar convite"
                          >
                            {resending === p.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <InviteCollaboratorDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        accountType={accountType}
        accountId={accountId}
        onInvited={load}
      />
    </>
  );
};

export default TeamManagementCard;
