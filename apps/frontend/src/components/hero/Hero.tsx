'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { GradientText } from '@/components/ui/GradientText';
import { RevealOnLoad } from '@/components/animations/RevealOnLoad';
import { useAuth } from '@/context/auth-context';
import { HeroShowcase } from './HeroShowcase';

export function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative isolate min-h-160 overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <Image src="/images/hero-background.png" alt="" fill priority className="object-cover object-center" />
        <div className="absolute inset-0 bg-linear-to-r from-[#050816] via-[#050816]/50 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#050816]" />
      </div>
      <Container className="relative grid items-center gap-16 lg:grid-cols-2">
        <div>
          <RevealOnLoad>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-[#8B5CF6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00B8FF]" />
              Costeo de formulaciones
            </span>
          </RevealOnLoad>

          <RevealOnLoad delay={0.08}>
            <h1 className="mt-6 font-heading text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Costos que entienden <GradientText>tu produccion.</GradientText>
            </h1>
          </RevealOnLoad>

          <RevealOnLoad delay={0.16}>
            <p className="mt-6 max-w-lg text-lg text-[#A1A1AA]">
              Prodexa calcula el costo real y el precio de venta de cada formulacion — ingredientes, margenes e
              impuestos, todo en un solo lugar, sin hojas de calculo sueltas.
            </p>
          </RevealOnLoad>

          <RevealOnLoad delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ButtonLink href={user ? '/dashboard' : '/registro'} variant="primary">
                {user ? 'Ir a la app' : 'Empezar gratis'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </div>
            <p className="mt-4 font-mono text-xs text-zinc-500">
              Sin tarjeta de credito · tus datos quedan privados en tu cuenta
            </p>
          </RevealOnLoad>
        </div>

        <RevealOnLoad delay={0.2}>
          <HeroShowcase />
        </RevealOnLoad>
      </Container>
    </section>
  );
}
