import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { redirect } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: otherUserId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    // 1. Fetch Other User Profile
    const { data: otherUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()

    if (!otherUser) {
        return <div className="p-8 text-center text-white/50">User not found</div>
    }

    // 2. Fetch Messages between me and them
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

    return (
        <div className="max-w-4xl mx-auto md:py-6">
            <ChatWindow
                initialMessages={messages || []}
                currentUser={user}
                otherUser={otherUser}
            />
        </div>
    )
}
