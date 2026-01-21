'use client'

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-red-950 to-black flex items-center justify-center p-4 overflow-hidden relative">
            {/* Floating Hearts Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: '110vh', opacity: 0 }}
                        animate={{
                            y: '-10vh',
                            opacity: [0, 1, 0],
                            x: (i % 2 === 0 ? 1 : -1) * (50 + (i * 2))
                        }}
                        transition={{
                            duration: 10 + (i % 10),
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "linear"
                        }}
                        className="absolute text-red-500/20"
                        style={{ left: `${(i * 13) % 100}%` }}
                    >
                        <Heart size={(i % 5) * 5 + 20} fill="currentColor" />
                    </motion.div>
                ))}
            </div>

            <div className="relative z-10 w-full flex justify-center">
                {children}
            </div>
        </div>
    )
}
