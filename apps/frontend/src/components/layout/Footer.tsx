import Link from 'next/link';
import { Container } from '@/components/ui/Container';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050816]">
      <Container className="flex flex-col items-center justify-between gap-4 py-8 text-sm text-zinc-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} Prodexa. Todos los derechos reservados.</p>
        <nav className="flex items-center gap-6">
          <Link href="/legal/terminos" className="transition-colors hover:text-zinc-300">
            Terminos y condiciones
          </Link>
          <Link href="/legal/privacidad" className="transition-colors hover:text-zinc-300">
            Politica de datos personales
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
