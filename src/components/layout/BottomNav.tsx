'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, MessageCircle, Heart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { href: '/discover', icon: Flame, label: 'Discover' },
    { href: '/matches', icon: Heart, label: 'Matches' },
    { href: '/messages', icon: MessageCircle, label: 'Chat' },
    { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-xl border-t border-white/10 z-50 px-6 pb-safe">
            <div className="h-full flex items-center justify-between max-w-lg mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-16 h-full group"
                        >
                            {isActive && (
                                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-pink-500 rounded-b-full shadow-[0_4px_12px_rgba(236,72,153,0.5)]" />
                            )}

                            <Icon
                                size={24}
                                className={cn(
                                    "transition-all duration-300 mb-1",
                                    isActive
                                        ? "text-pink-500 fill-pink-500/20 scale-110 -translate-y-1"
                                        : "text-white/50 group-hover:text-white/80"
                                )}
                            />
                            <span className={cn(
                                "text-[10px] font-medium transition-colors",
                                isActive ? "text-pink-500" : "text-white/40"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
