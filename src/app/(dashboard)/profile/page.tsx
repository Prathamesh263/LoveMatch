import { createClient } from '@/lib/supabase/server'
import { ProfileView } from '@/components/profile/ProfileView'

export default async function ProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-white/60">Please sign in to view your profile.</p>
            </div>
        )
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-white/60">Profile not found.</p>
            </div>
        )
    }

    return <ProfileView profile={profile} user={user} />
}
