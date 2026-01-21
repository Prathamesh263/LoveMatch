'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface MatchModalProps {
    isOpen: boolean
    onClose: () => void
    matchedUser: {
        id: string
        full_name: string
        avatar_url: string
    } | null
    currentUserAvatar: string
}

export function MatchModal({ isOpen, onClose, matchedUser, currentUserAvatar }: MatchModalProps) {
    if (!isOpen || !matchedUser) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4"
            >
                <div className="text-center w-full max-w-lg">
                    {/* Celebration Text */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                        className="mb-12 relative"
                    >
                        <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-transparent bg-clip-text italic text-shadow-glow transform -rotate-6">
                            It's a Match!
                        </h1>
                        <p className="text-white/60 mt-4 text-lg">You and {matchedUser.full_name} liked each other.</p>
                    </motion.div>

                    {/* Avatars */}
                    <div className="flex items-center justify-center gap-4 mb-12 relative h-40">
                        {/* User Avatar */}
                        <motion.div
                            initial={{ x: -100, opacity: 0, rotate: -45 }}
                            animate={{ x: 0, opacity: 1, rotate: -10 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.3)] z-10"
                        >
                            <Image src={currentUserAvatar} alt="You" width={160} height={160} className="w-full h-full object-cover" />
                        </motion.div>

                        {/* Heart Icon in middle */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: 360 }}
                            transition={{ delay: 0.5 }}
                            className="absolute z-20 bg-white rounded-full p-2 text-pink-500 shadow-xl"
                        >
                            <Heart fill="currentColor" size={32} />
                        </motion.div>

                        {/* Matched User Avatar */}
                        <motion.div
                            initial={{ x: 100, opacity: 0, rotate: 45 }}
                            animate={{ x: 0, opacity: 1, rotate: 10 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.3)] z-10"
                        >
                            <Image src={matchedUser.avatar_url} alt={matchedUser.full_name} width={160} height={160} className="w-full h-full object-cover" />
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4">
                        <Link
                            href="/messages"
                            className="block w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full text-white font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
                        >
                            <MessageCircle fill="currentColor" className="text-white/90" />
                            Send a Message
                        </Link>

                        <button
                            onClick={onClose}
                            className="block w-full py-4 bg-white/10 border border-white/10 rounded-full text-white font-semibold hover:bg-white/20 transition-colors"
                        >
                            Keep Swiping
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
