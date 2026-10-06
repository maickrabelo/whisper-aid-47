import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UpgradeSlotDialog from "./UpgradeSlotDialog";

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sstManagerId: string;
  onCompanyAdded: (companyId?: string) => void;
}

const extractCnpjDigits = (cnpj: string): string => cnpj.replace(/\D/g, '');

const AddCompanyDialog: React.FC<AddCompanyDialogProps> = ({
  open,
  onOpenChange,
  sstManagerId,
  onCompanyAdded,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ current: number; limit: number }>({ current: 0, limit: 0 });
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    employee_count: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O logo deve ter no máximo 2MB.", variant: "destructive" });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', cnpj: '', email: '', phone: '', address: '', employee_count: '' });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast({ title: "Nome obrigatório", description: "Informe o nome da empresa.", variant: "destructive" });
      return;
    }

    if (trimmedName.length > 200) {
      toast({ title: "Nome muito longo", description: "O nome deve ter no máximo 200 caracteres.", variant: "destructive" });
      return;
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      toast({ title: "Email obrigatório", description: "Informe o email da empresa para criar o acesso.", variant: "destructive" });
      return;
    }

    const cnpjDigits = extractCnpjDigits(formData.cnpj);
    if (cnpjDigits.length < 11) {
      toast({ title: "CNPJ inválido", description: "Informe um CNPJ válido com pelo menos 11 dígitos.", variant: "destructive" });
      return;
    }

    const employeeCountNum = parseInt(formData.employee_count, 10);
    if (!Number.isFinite(employeeCountNum) || employeeCountNum < 1) {
      toast({ title: "Quantidade de colaboradores obrigatória", description: "Informe quantos colaboradores ativos a empresa possui (mínimo 1).", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Validate employee limit locally. Company slot limits are enforced by the backend
    // to avoid stale client-side reads after a slot is purchased.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sub } = await (supabase as any)
          .from('subscriptions')
          .select('id, subscription_plans(max_companies, max_employees, category)')
          .eq('owner_user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const plan: any = sub ? (sub as any).subscription_plans : null;
        if (plan && plan.category === 'manager') {
          const { data: assigned } = await supabase
            .from('companies')
            .select('id, employee_count, company_sst_assignments!inner(sst_manager_id)')
            .eq('company_sst_assignments.sst_manager_id', sstManagerId);
          const currCompanies = assigned?.length ?? 0;
          const currEmployees = (assigned ?? []).reduce((s, c: any) => s + (c.employee_count ?? 0), 0);
          if (plan.max_employees && currEmployees + employeeCountNum > plan.max_employees) {
            toast({ title: 'Limite de colaboradores', description: `Seu plano permite até ${plan.max_employees} colaboradores no total. Atual: ${currEmployees}.`, variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Subscription limit check skipped:', err);
    }

    try {
      let logoUrl: string | null = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl.publicUrl;
      }

      const { data: companyResult, error: companyError } = await supabase.functions.invoke('create-sst-company', {
        body: {
          sst_manager_id: sstManagerId,
          name: trimmedName,
          cnpj: formData.cnpj.trim(),
          email: trimmedEmail,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          logo_url: logoUrl,
          employee_count: employeeCountNum,
        },
      });

      if (companyError) throw companyError;
      if (companyResult?.code === 'limit_reached') {
        setLimitInfo({ current: companyResult.current_count ?? 0, limit: companyResult.effective_limit ?? 0 });
        setUpgradeOpen(true);
        setIsSubmitting(false);
        return;
      }
      if (companyResult?.error) throw new Error(companyResult.error);

      toast({
        title: "Empresa cadastrada com sucesso!",
        description: `${trimmedName} foi adicionada. Acesso: ${trimmedEmail} / senha inicial: CNPJ (${cnpjDigits.substring(0, 4)}****). No primeiro login será solicitada a troca de senha.`,
      });

      resetForm();
      onOpenChange(false);
      onCompanyAdded(companyResult?.company_id);
    } catch (error: any) {
      console.error('Error creating company:', error);
      let message = 'Não foi possível cadastrar a empresa. Tente novamente.';
      const errMsg = error.message || '';
      const errCode = error.code || '';
      const isCnpjDuplicate =
        errMsg.includes('companies_cnpj_key') ||
        (errMsg.includes('duplicate key') && errMsg.includes('cnpj')) ||
        (errCode === '23505' && errMsg.includes('cnpj'));

      if (errMsg.includes('Limite de') || errMsg.includes('já está cadastrado') || errMsg.includes('obrigatório') || errMsg.includes('inválid') || errMsg.includes('permissão')) {
        message = errMsg;
      } else if (isCnpjDuplicate) {
        // Tentar recuperar empresa órfã (criada em tentativa anterior e não vinculada)
        try {
          const cnpjFormatted = formData.cnpj.trim();
          const { data: existing } = await supabase
            .from('companies')
            .select('id, name, company_sst_assignments(sst_manager_id)')
            .eq('cnpj', cnpjFormatted)
            .maybeSingle();
          const assignments: any[] = (existing as any)?.company_sst_assignments ?? [];
          if (existing && assignments.length === 0) {
            // Empresa órfã encontrada → tentar vincular
            const { error: linkErr } = await supabase
              .from('company_sst_assignments')
              .insert({ company_id: (existing as any).id, sst_manager_id: sstManagerId });
            if (linkErr) {
              if ((linkErr.message || '').includes('Limite de')) {
                // Oferecer upgrade de slot
                setLimitInfo({ current: limitInfo.current, limit: limitInfo.limit });
                setUpgradeOpen(true);
                setIsSubmitting(false);
                return;
              }
              throw linkErr;
            }
            toast({
              title: 'Empresa recuperada e vinculada!',
              description: `${(existing as any).name} já existia no sistema sem vínculo. Agora foi atribuída à sua gestora.`,
            });
            resetForm();
            onOpenChange(false);
            onCompanyAdded((existing as any).id);
            return;
          }
          message = 'Este CNPJ já está cadastrado no sistema e vinculado a outra gestora. Verifique o número informado.';
        } catch (recoveryErr: any) {
          console.warn('Auto-recovery failed:', recoveryErr);
          message = 'Este CNPJ já está cadastrado no sistema. Verifique o número informado.';
        }
      } else if (errCode === '23505' || errMsg.includes('duplicate key') || errMsg.includes('unique constraint')) {
        message = 'Este registro já existe no sistema. Verifique os dados informados.';
      }
      toast({ title: "Erro ao cadastrar empresa", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
          <DialogDescription>Preencha os dados da empresa para cadastrá-la.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da empresa *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: Empresa ABC Ltda"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input
              id="cnpj"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleInputChange}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              required
            />
            <p className="text-xs text-muted-foreground">Será usado como senha do primeiro acesso.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee_count">Quantidade de colaboradores ativos *</Label>
            <Input
              id="employee_count"
              name="employee_count"
              type="number"
              min={1}
              value={formData.employee_count}
              onChange={handleInputChange}
              placeholder="Ex: 50"
              required
            />
            <p className="text-xs text-muted-foreground">Usado nas avaliações de risco para validar a alocação por setor.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contato@empresa.com"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Rua, número, cidade - UF"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Logo (opcional)</Label>
            <div className="flex items-center gap-3">
              {logoPreview && (
                <img src={logoPreview} alt="Preview" className="h-12 w-12 rounded object-contain border" />
              )}
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />
                {logoFile ? logoFile.name : 'Selecionar imagem'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar Empresa'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <UpgradeSlotDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentCount={limitInfo.current}
        currentLimit={limitInfo.limit}
        onPurchased={() => {
          // Slot liberado: notifica o pai para refetch e mantém o formulário aberto
          // para o usuário reenviar e cadastrar a empresa.
          onCompanyAdded();
        }}
      />
    </Dialog>
  );
};

export default AddCompanyDialog;
