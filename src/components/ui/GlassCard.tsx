'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
    children: React.ReactNode
    className?: string
    delay?: number
}

export function GlassCard({ children, className, delay = 0 }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={cn(
                "bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl overflow-hidden",
                "hover:shadow-2xl hover:bg-white/15 transition-all duration-300",
                className
            )}
        >
            {children}
        </motion.div>
    )
}
