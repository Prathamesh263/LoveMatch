'use client'

import { motion } from 'framer-motion'

interface OnboardingBioProps {
    data: any
    update: (data: any) => void
}

export function OnboardingBio({ data, update }: OnboardingBioProps) {
    const maxLength = 150

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Describe Yourself</h2>
                <p className="text-white/60">What makes you tick? Keep it short and sweet.</p>
            </div>

            <div className="relative">
                <textarea
                    value={data.bio}
                    onChange={(e) => update({ ...data, bio: e.target.value })}
                    maxLength={maxLength}
                    placeholder="I enjoy long walks on the beach and debugging code..."
                    className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 resize-none transition-colors text-lg"
                />
                <div className="absolute bottom-4 right-4 text-xs text-white/40">
                    {data.bio.length}/{maxLength}
                </div>
            </div>
        </motion.div>
    )
}
