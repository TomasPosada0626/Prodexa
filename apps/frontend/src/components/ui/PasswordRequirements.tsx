import clsx from 'clsx';
import { Check, X } from 'lucide-react';

interface Rule {
  label: string;
  test: (value: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Minimo 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Una mayuscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Una minuscula', test: (v) => /[a-z]/.test(v) },
  { label: 'Un numero', test: (v) => /\d/.test(v) },
  { label: 'Un caracter especial', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** Mirrors the backend's RegisterDto password strength rule exactly. */
export function passwordMeetsRequirements(value: string): boolean {
  return RULES.every((rule) => rule.test(value));
}

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1" aria-label="Requisitos de la contrasena">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={clsx('flex items-center gap-1.5 text-xs transition-colors', met ? 'text-emerald-400' : 'text-zinc-400')}
          >
            {met ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : <X className="h-3 w-3 shrink-0" aria-hidden />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
