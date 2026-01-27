'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const MissedCallBadge = ({ userId }: { userId: string }) => {
    const [missedCount, setMissedCount] = useState(0)
    const supabase = createClient()

    useEffect(() => {
        // Get initial count
        const fetchCount = async () => {
            // Logic: count calls where receiver = user, status = missed, viewed = false
            const { data, error } = await supabase.rpc('get_missed_calls_count', { user_uuid: userId })

            if (!error) {
                setMissedCount(data || 0)
            } else {
                // Fallback if RPC fails or doesn't exist yet
                const { count } = await supabase
                    .from('call_history')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', userId)
                    .eq('status', 'missed')
                    .eq('viewed', false)

                setMissedCount(count || 0)
            }
        }

        fetchCount()

        // Listen for new missed calls
        // Note: listening to 'call_history' inserts (assuming logging happens there)
        const channel = supabase
            .channel('missed-calls-badge')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'call_history',
                filter: `receiver_id=eq.${userId}`
            }, (payload) => {
                if (payload.new.status === 'missed') {
                    setMissedCount(prev => prev + 1)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    // Update App Badge (PWA)
    useEffect(() => {
        if ('setAppBadge' in navigator) {
            if (missedCount > 0) {
                navigator.setAppBadge(missedCount).catch(() => { })
            } else {
                navigator.clearAppBadge().catch(() => { })
            }
        }
    }, [missedCount])

    if (missedCount === 0) return null

    return (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center animate-in zoom-in">
            {missedCount > 9 ? '9+' : missedCount}
        </span>
    )
}
