import React from "react";
import { Check, X } from "lucide-react";

export interface PasswordRule {
  label: string;
  test: (pwd: string) => boolean;
}

export const strongPasswordRules: PasswordRule[] = [
  { label: "Pelo menos 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Uma letra maiúscula (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "Uma letra minúscula (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "Um número (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "Um caractere especial (!@#$...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (password: string) =>
  strongPasswordRules.every((r) => r.test(password));

interface Props {
  password: string;
  className?: string;
}

const PasswordStrengthHints: React.FC<Props> = ({ password, className }) => {
  const passedCount = strongPasswordRules.filter((r) => r.test(password)).length;
  const strength =
    passedCount <= 2 ? "Fraca" : passedCount === 3 || passedCount === 4 ? "Média" : "Forte";
  const strengthColor =
    passedCount <= 2
      ? "bg-destructive"
      : passedCount <= 4
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className={`rounded-md border border-border bg-muted/40 p-3 space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Força da senha</span>
        <span className="text-muted-foreground">{password ? strength : "—"}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full transition-all ${strengthColor}`}
          style={{ width: `${(passedCount / strongPasswordRules.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1 pt-1">
        {strongPasswordRules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-xs ${
                ok ? "text-green-600" : "text-muted-foreground"
              }`}
            >
              {ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground pt-1">
        Evite dados pessoais (nome, CPF, datas) e senhas reutilizadas em outros sites.
      </p>
    </div>
  );
};

export default PasswordStrengthHints;
