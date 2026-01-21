import { createClient } from '@/lib/supabase/server'
import { GlassCard } from '@/components/ui/GlassCard'
import { MessageCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default async function MessagesIndexPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    // Fetch Matches to list as "Active Conversations"
    // In a real app, we might join with 'messages' table to show "Last Message"
    const { data: matchesData } = await supabase
        .from('matches')
        .select('user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

    const matchedIds = matchesData?.map(m =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
    ) || []

    const { data: matchedProfiles } = matchedIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', matchedIds)
        : { data: [] }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-white mb-6">Messages</h1>

            <div className="space-y-4">
                {matchedProfiles && matchedProfiles.length > 0 ? (
                    matchedProfiles.map((profile) => (
                        <Link key={profile.id} href={`/messages/${profile.id}`}>
                            <GlassCard className="p-4 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer">
                                <div className="relative w-14 h-14">
                                    <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                                        <Image
                                            src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60'}
                                            alt={profile.full_name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg">{profile.full_name}</h3>
                                    <p className="text-white/40 text-sm">Tap to chat</p>
                                </div>
                                <div className="p-2 bg-pink-500/10 rounded-full text-pink-500">
                                    <MessageCircle size={20} />
                                </div>
                            </GlassCard>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                        <MessageCircle className="mx-auto text-white/20 mb-4" size={48} />
                        <p className="text-white/60">No conversations yet.</p>
                        <Link href="/discover" className="text-pink-500 hover:underline mt-2 inline-block">
                            Find a match to start chatting!
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
