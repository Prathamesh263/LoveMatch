export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                {children}
            </div>
        </div>
    )
}
