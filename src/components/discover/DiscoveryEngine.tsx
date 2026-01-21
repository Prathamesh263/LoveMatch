'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion'
import { X, Heart, RotateCcw, Star, Zap, MapPin, Info } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MatchModal } from './MatchModal'

import { calculateMatchScore } from '@/lib/astrology'
import { Profile } from '@/types'

interface DiscoveryEngineProps {
    initialProfiles: any[]
    user: any
}

export function DiscoveryEngine({ initialProfiles, user }: DiscoveryEngineProps) {
    const [profiles, setProfiles] = useState(initialProfiles)
    const [matchData, setMatchData] = useState<any>(null) // For Modal
    const [history, setHistory] = useState<any[]>([]) // For Rewind
    const supabase = createClient()

    // If no profiles, show empty state
    if (profiles.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Zap className="text-pink-500" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No more profiles</h2>
                <p className="text-white/50 max-w-xs">Check back later for more potential matches!</p>
            </div>
        )
    }

    // Active Card is simply the last one in the array (LIFO stack)
    const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
        const currentProfile = profiles[profiles.length - 1]

        // Save to history for rewind
        setHistory(prev => [...prev, currentProfile])
        // Optimistic UI update
        setProfiles(prev => prev.slice(0, -1))

        try {
            const type = direction === 'right' ? 'like' : (direction === 'super' ? 'super_like' : 'pass')

            if (type === 'pass') {
                // Log Pass
                await supabase
                    .from('likes')
                    .insert({
                        user_id: user.id,
                        target_id: currentProfile.id,
                        type: 'pass'
                    })
                return
            }

            // It's a Like or Super Like
            const { error: likeError } = await supabase
                .from('likes')
                .insert({
                    user_id: user.id,
                    target_id: currentProfile.id,
                    type: type
                })

            if (likeError) throw likeError

            // Check Match
            const { data: mutualLike } = await supabase
                .from('likes')
                .select('*')
                .eq('user_id', currentProfile.id)
                .eq('target_id', user.id)
                .in('type', ['like', 'super_like']) // Check if they liked or super liked us
                .single()

            if (mutualLike) {
                // IT'S A MATCH!
                await supabase
                    .from('matches')
                    .insert({ user1_id: user.id, user2_id: currentProfile.id })

                // Show Celebration Modal
                setMatchData(currentProfile)
            } else {
                if (type === 'super_like') {
                    toast("Super Like Sent!", { description: `You super liked ${currentProfile.full_name}!` })
                } else {
                    toast("Liked!", { description: `You liked ${currentProfile.full_name}` })
                }
            }

        } catch (error) {
            console.error('Swipe error:', error)
        }
    }

    const handleRewind = async () => {
        if (history.length === 0) return

        const lastProfile = history[history.length - 1]

        // Remove from DB (undo the swipe)
        await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('target_id', lastProfile.id)

        // Restore to stack
        setProfiles(prev => [...prev, lastProfile])
        setHistory(prev => prev.slice(0, -1))
        toast("Rewound last swipe!")
    }

    return (
        <div className="relative w-full h-full max-w-md mx-auto py-4">
            {/* Match Celebration Modal */}
            <MatchModal
                isOpen={!!matchData}
                onClose={() => setMatchData(null)}
                matchedUser={matchData}
                currentUserAvatar={user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60'} // Fallback or fetch real one
            />

            {/* Card Stack */}
            <div className="relative w-full h-[70vh]">
                <AnimatePresence>
                    {profiles.map((profile, index) => {
                        const isTop = index === profiles.length - 1
                        return (
                            <Card
                                key={profile.id}
                                profile={profile}
                                currentUser={user}
                                isTop={isTop}
                                onSwipe={handleSwipe}
                            />
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex justify-center items-center gap-6 mt-6">
                {/* Rewind */}
                <button
                    onClick={handleRewind}
                    disabled={history.length === 0}
                    className="w-10 h-10 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-yellow-500 hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                >
                    <RotateCcw size={20} />
                </button>

                {/* Nope */}
                <button
                    onClick={() => handleSwipe('left')}
                    className="w-14 h-14 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-red-500 hover:scale-110 transition-transform shadow-lg"
                >
                    <X size={28} strokeWidth={2.5} />
                </button>

                {/* Super Like */}
                <button
                    onClick={() => handleSwipe('super')}
                    className="w-10 h-10 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-blue-400 hover:scale-110 transition-transform shadow-lg"
                >
                    <Star size={20} fill="currentColor" />
                </button>

                {/* Like */}
                <button
                    onClick={() => handleSwipe('right')}
                    className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-pink-500/20"
                >
                    <Heart size={28} fill="currentColor" />
                </button>
            </div>
        </div>
    )
}

interface CardProps {
    profile: Profile
    currentUser: Profile
    isTop: boolean
    onSwipe: (dir: 'left' | 'right' | 'super') => void
}

function Card({ profile, currentUser, isTop, onSwipe }: CardProps) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-15, 15])
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

    // Calculate Match
    const { totalScore, explanation, zodiac } = calculateMatchScore(currentUser, profile)

    // Visual indicators for Like/Nope overlays
    const likeOpacity = useTransform(x, [20, 150], [0, 1])
    const nopeOpacity = useTransform(x, [-20, -150], [0, 1])

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.x > 100) {
            onSwipe('right')
        } else if (info.offset.x < -100) {
            onSwipe('left')
        }
    }

    if (!isTop) {
        return (
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gray-900 border border-white/10 scale-95 top-4 shadow-xl z-0">
                {/* Background Image Placeholder */}
                <div className="w-full h-full bg-white/5" />
            </div>
        )
    }

    const mainPhoto = profile.photos?.[0] || profile.avatar_url

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: x.get() < 0 ? -200 : 200, opacity: 0, transition: { duration: 0.2 } }}
            whileTap={{ scale: 1.05 }}
        >
            {/* Replicating the User's Reference Layout */}
            <div className="w-full h-full rounded-3xl overflow-hidden relative bg-black shadow-2xl border border-white/10">
                {mainPhoto ? (
                    <Image
                        src={mainPhoto}
                        alt={profile.full_name}
                        fill
                        className="object-cover pointer-events-none"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <span className="text-white/20 text-xl">No Photo</span>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                {/* LIKE / NOPE Stamps Overlay */}
                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 rounded-lg px-4 py-2 -rotate-12 z-20">
                    <span className="text-green-500 font-bold text-4xl uppercase tracking-widest">LIKE</span>
                </motion.div>
                <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 z-20">
                    <span className="text-red-500 font-bold text-4xl uppercase tracking-widest">NOPE</span>
                </motion.div>

                {/* Info Section (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3 pointer-events-none select-none">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-white shadow-black drop-shadow-lg flex items-center gap-3">
                                {profile.full_name} <span className="text-2xl font-medium opacity-80">{profile.age}</span>
                                {zodiac.label !== 'Unknown' && (
                                    <span className="text-sm bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30 text-purple-200">
                                        {profile.zodiac_sign}
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center text-white/80 text-sm mt-1">
                                <Info size={14} className="mr-1" />
                                <span>{profile.interests?.[0] || "New"} • {profile.gender}</span>
                            </div>

                            {/* Compatibility Badge */}
                            <div className="mt-2 flex items-center gap-2">
                                <div className={`px-2 py-0.5 rounded text-xs font-bold border ${totalScore > 75 ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-white/10 border-white/20 text-white/70'}`}>
                                    {totalScore}% Match
                                </div>
                                <span className="text-xs text-white/60 truncate max-w-[200px]">{explanation}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
                            <div className="arrow-up">↑</div>
                        </div>
                    </div>

                    {/* Interests Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        {profile.interests?.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs text-white border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
