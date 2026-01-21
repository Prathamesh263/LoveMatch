import { createClient } from '@/lib/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { MessageCircle, Heart, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default async function MatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    // 1. Fetch Matches
    const { data: matchesData } = await supabase
        .from('matches')
        .select('user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

    // Extract friend IDs
    const matchedIds = matchesData?.map(m =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
    ) || []

    // 2. Fetch Profiles for Matches
    const { data: matchedProfiles } = matchedIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', matchedIds)
        : { data: [] }


    // 3. Fetch "Likes You" (Requests)
    // People who liked me, but we haven't matched yet
    const { data: likesReceived } = await supabase
        .from('likes')
        .select('user_id, type')
        .eq('target_id', user.id)
        .in('type', ['like', 'super_like'])

    // Filter out existing matches from likes (if any logic overlap, though DB constraints usually separate)
    // Actually, if we matched, it means I liked them back.
    // We only want to show likes where I HAVEN'T liked them back yet.
    // Getting my likes to exclude
    const { data: myLikes } = await supabase
        .from('likes')
        .select('target_id')
        .eq('user_id', user.id)

    const myLikedIds = myLikes?.map(l => l.target_id) || []

    const requestIds = likesReceived
        ?.filter(l => !matchedIds.includes(l.user_id) && !myLikedIds.includes(l.user_id))
        .map(l => l.user_id) || []

    const { data: requestProfiles } = requestIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', requestIds)
        : { data: [] }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 md:p-0">
            <h1 className="text-3xl font-bold text-white mb-6">Matches & Requests</h1>

            {/* NEW MATCHES SECTION */}
            <section>
                <h2 className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Heart size={14} fill="currentColor" />
                    New Matches
                </h2>

                {matchedProfiles && matchedProfiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {matchedProfiles.map((profile) => (
                            <Link key={profile.id} href={`/messages/${profile.id}`}>
                                <GlassCard className="p-3 group hover:bg-white/10 transition-colors cursor-pointer text-center relative overflow-hidden">
                                    <div className="aspect-square rounded-full overflow-hidden mx-auto mb-3 border-2 border-pink-500 relative">
                                        <Image
                                            src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60'}
                                            alt={profile.full_name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <h3 className="font-bold text-white truncate">{profile.full_name}</h3>
                                    <p className="text-xs text-white/50">{profile.age} • Mumbai</p>

                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MessageCircle className="text-white" />
                                    </div>
                                </GlassCard>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-white/40">No matches yet. Keep swiping!</p>
                    </div>
                )}
            </section>

            {/* LIKES YOU (REQUESTS) SECTION */}
            <section>
                <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Star size={14} fill="currentColor" />
                    Likes You ({requestProfiles?.length || 0})
                </h2>

                {requestProfiles && requestProfiles.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {requestProfiles.map((profile) => (
                            <div key={profile.id} className="relative">
                                {/* Blur Effect for non-premium feel (optional, but requested "Request Box") */}
                                {/* For now, we show them cleanly so user can match back easily via Discover or here if implemented */}
                                <GlassCard className="p-0 overflow-hidden group">
                                    <div className="aspect-[3/4] relative">
                                        <Image
                                            src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60'}
                                            alt={profile.full_name}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute bottom-3 left-3">
                                            <p className="text-white font-bold">{profile.full_name}</p>
                                        </div>
                                    </div>

                                    {/* Action Overlay: To accept, simply go to discover or implement 'Accept' button here */}
                                    {/* For MVP, let's guide them to Swipe */}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                                        <p className="text-sm text-white mb-2">Liked you!</p>
                                        <Link href="/discover" className="px-4 py-2 bg-pink-500 rounded-full text-white text-xs font-bold">
                                            Find them in Discovery to Match!
                                        </Link>
                                    </div>
                                </GlassCard>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-white/40">No pending likes.</p>
                    </div>
                )}
            </section>
        </div>
    )
}
