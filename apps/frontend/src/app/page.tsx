import { Navbar } from '@/components/navigation/Navbar';
import { Hero } from '@/components/hero/Hero';
import { FeatureList } from '@/components/features/FeatureList';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050816] font-sans text-white">
      <Navbar />
      <main>
        <Hero />
        <FeatureList />
      </main>
    </div>
  );
}
