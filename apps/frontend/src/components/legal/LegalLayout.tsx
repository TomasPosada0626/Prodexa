import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navigation/Navbar';
import { Container } from '@/components/ui/Container';

interface LegalLayoutProps {
  titulo: string;
  actualizado: string;
}

export function LegalLayout({ titulo, actualizado, children }: PropsWithChildren<LegalLayoutProps>) {
  return (
    <div className="min-h-screen bg-[#050816] font-sans text-white">
      <Navbar />
      <main>
        <Container className="py-16">
          <div className="mx-auto max-w-3xl">
            <Link href="/" className="text-sm font-medium text-[#8B5CF6] hover:underline">
              &larr; Volver a Prodexa
            </Link>
            <h1 className="font-heading mt-4 text-3xl font-bold text-white sm:text-4xl">{titulo}</h1>
            <p className="mt-2 text-sm text-zinc-500">Ultima actualizacion: {actualizado}</p>

            <div
              className="prose prose-invert mt-10 max-w-none prose-headings:font-heading prose-headings:font-semibold prose-a:text-[#8B5CF6] prose-strong:text-white"
            >
              {children}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
