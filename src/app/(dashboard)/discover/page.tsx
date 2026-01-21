import { createClient } from '@/lib/supabase/server'
import { DiscoveryEngine } from '@/components/discover/DiscoveryEngine'

export default async function DiscoverPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please log in</div>
    }

    // Fetch users we haven't swiped on yet
    // NOT IN (SELECT target_id FROM likes WHERE user_id = auth.uid())
    // Supabase JS doesn't support complex NOT IN subqueries easily without rpc or client filtering
    // For MVP/small scale, client filtering or 2 queries is okay.

    // 1. Get IDs I've already swiped on
    const { data: swipedData } = await supabase
        .from('likes')
        .select('target_id')
        .eq('user_id', user.id)

    const swipedIds = swipedData?.map(d => d.target_id) || []
    swipedIds.push(user.id) // Don't show myself

    // 2. Fetch profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${swipedIds.join(',')})`)
        .limit(20)

    return (
        <div className="h-full flex flex-col justify-center">
            <DiscoveryEngine initialProfiles={profiles || []} user={user} />
        </div>
    )
}
