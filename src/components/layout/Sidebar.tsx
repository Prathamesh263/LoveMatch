'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, MessageCircle, Heart, User, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navItems = [
    { href: '/discover', icon: Flame, label: 'Discover' },
    { href: '/matches', icon: Heart, label: 'Matches' },
    { href: '/messages', icon: MessageCircle, label: 'Messages' },
    { href: '/profile', icon: User, label: 'Profile' },
]

export function Sidebar() {
    const pathname = usePathname()
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.success('Signed out successfully')
        router.push('/')
    }

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50">
            <div className="p-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent font-serif hover:scale-105 transition-transform cursor-pointer">
                    LoveMatch
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-pink-500/10 text-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon
                                size={22}
                                className={cn(
                                    "transition-all duration-200",
                                    isActive ? "fill-current scale-110" : "group-hover:scale-110"
                                )}
                            />
                            <span className="font-semibold">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/10 space-y-2">
                <Link
                    href="/settings"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <Settings size={20} />
                    <span className="text-sm font-medium">Settings</span>
                </Link>
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    )
}
