import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRealAuth } from '@/contexts/RealAuthContext';
import { toast } from 'sonner';

const CATEGORIES = ['BUG', 'UX', 'LEGAL_RULE', 'PDF', 'DATA', 'PERFORMANCE', 'SUGGESTION'] as const;
const SEVERITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
] as const;

interface Props {
  featureKey?: string;
}

export const BetaFeedbackButton = ({ featureKey = 'LTCAT_BETA' }: Props) => {
  const { user } = useRealAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('BUG');
  const [severity, setSeverity] = useState<string>('medium');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || description.trim().length < 5) {
      toast.error('Descreva o problema ou sugestão.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('beta_feedback').insert({
      feature_key: featureKey,
      user_id: user.id,
      page: location.pathname,
      category,
      severity,
      description: description.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error('Não foi possível enviar o feedback: ' + error.message);
      return;
    }
    toast.success('Feedback do beta enviado. Obrigado!');
    setDescription('');
    setOpen(false);
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="h-4 w-4" /> Enviar feedback do Beta
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback do Beta</DialogTitle>
            <DialogDescription>Seu relato ajuda a validar o módulo antes da liberação geral.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Severidade</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que aconteceu ou o que poderia melhorar?" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BetaFeedbackButton;
