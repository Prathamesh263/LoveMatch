import HeroSection from '@/components/landing/HeroSection'
import CallToAction from '@/components/landing/CallToAction'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <HeroSection />
      <CallToAction />
    </main>
  )
}
