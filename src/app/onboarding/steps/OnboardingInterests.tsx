'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OnboardingInterestsProps {
    data: any
    update: (data: any) => void
}

const INTEREST_TAGS = [
    "Travel", "Photography", "Cooking", "Hiking", "Gaming",
    "Music", "Movies", "Reading", "Art", "Tech",
    "Fitness", "Foodie", "Fashion", "Nature", "Pets",
    "Dancing", "Yoga", "Coffee", "Wine", "Coding"
]

export function OnboardingInterests({ data, update }: OnboardingInterestsProps) {

    const toggleInterest = (tag: string) => {
        const current = data.interests || []
        if (current.includes(tag)) {
            update({ ...data, interests: current.filter((t: string) => t !== tag) })
        } else {
            if (current.length >= 5) return // Limit to 5
            update({ ...data, interests: [...current, tag] })
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
        >
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Your Interests</h2>
                <p className="text-white/60">Pick up to 5 things you love. It helps us find better matches.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
                {INTEREST_TAGS.map((tag) => {
                    const isSelected = (data.interests || []).includes(tag)
                    return (
                        <button
                            key={tag}
                            onClick={() => toggleInterest(tag)}
                            className={cn(
                                "px-4 py-2 rounded-full border transition-all duration-200 text-sm font-medium",
                                isSelected
                                    ? "bg-pink-500 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)] scale-105"
                                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            {tag}
                        </button>
                    )
                })}
            </div>

            <p className="mt-6 text-sm text-white/40">
                {(data.interests || []).length}/5 selected
            </p>
        </motion.div>
    )
}
