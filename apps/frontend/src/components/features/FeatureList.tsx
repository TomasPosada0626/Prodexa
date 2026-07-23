import { FlaskConical, Layers, LineChart, Lock, Percent, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Container } from '@/components/ui/Container';

interface Feature {
  icon: LucideIcon;
  label: string;
  description: string;
}

// Deliberately Prodexa's real capabilities, not generic placeholder
// categories (no "Inventario" / "Calidad" — those modules don't exist).
const FEATURES: Feature[] = [
  { icon: FlaskConical, label: 'Formulaciones', description: 'Ingredientes y preparacion enriquecida' },
  { icon: Layers, label: 'Preparar', description: 'Escala cualquier lote al instante' },
  { icon: LineChart, label: 'Costos', description: 'Rentabilidad por formulacion' },
  { icon: ShieldCheck, label: 'Registro sanitario', description: 'Trazabilidad de cada formulacion' },
  { icon: Percent, label: 'Margenes guardados', description: 'Definidos una vez, aplicados siempre' },
  { icon: Lock, label: 'Datos privados', description: 'Cada cuenta ve solo lo suyo' },
];

export function FeatureList() {
  return (
    <section id="capacidades" className="border-y border-white/10 bg-white/2 py-10">
      <Container>
        <ul role="list" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.label} className="flex flex-col gap-2">
                <Icon className="h-5 w-5 text-[#8B5CF6]" aria-hidden />
                <span className="font-heading text-sm font-semibold text-white">{feature.label}</span>
                <span className="text-xs leading-snug text-zinc-400">{feature.description}</span>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
