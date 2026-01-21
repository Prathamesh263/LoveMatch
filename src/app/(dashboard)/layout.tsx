import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-pink-500/30">
            <Sidebar />

            <main className="md:pl-64 min-h-screen pb-20 md:pb-0 relative">
                {/* Background Gradients for Dashboard */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
