import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface SignatureFieldsValue {
  technicianName: string;
  technicianCpf: string;
  technicianRegistration: string;
  orgResponsibleName: string;
  orgResponsibleCpf: string;
  orgResponsibleRole: string;
}

interface Props {
  value: SignatureFieldsValue;
  onChange: (patch: Partial<SignatureFieldsValue>) => void;
  technicianPlaceholder?: string;
}

export function ReportSignatureFields({ value, onChange, technicianPlaceholder }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Responsável Técnico (assinatura)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Informe o nome do técnico que assinará o documento. Se deixar em branco, será usado o nome da gestora
            {technicianPlaceholder ? ` (${technicianPlaceholder})` : ''}.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Nome do responsável técnico</label>
              <Input
                value={value.technicianName}
                onChange={(e) => onChange({ technicianName: e.target.value })}
                placeholder={technicianPlaceholder || "Nome completo do técnico"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF</label>
              <Input
                value={value.technicianCpf}
                onChange={(e) => onChange({ technicianCpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Registro MTE / CREA / CRP</label>
              <Input
                value={value.technicianRegistration}
                onChange={(e) => onChange({ technicianRegistration: e.target.value })}
                placeholder="Nº do registro profissional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Responsável pela Empresa (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Dados de quem assina pela empresa. Campos em branco aparecem como linha para assinatura manual.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={value.orgResponsibleName}
                onChange={(e) => onChange({ orgResponsibleName: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF</label>
              <Input
                value={value.orgResponsibleCpf}
                onChange={(e) => onChange({ orgResponsibleCpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo</label>
              <Input
                value={value.orgResponsibleRole}
                onChange={(e) => onChange({ orgResponsibleRole: e.target.value })}
                placeholder="Ex: Diretor, RH, Sócio-administrador"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
