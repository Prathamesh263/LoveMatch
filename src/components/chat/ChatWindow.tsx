'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, MoreVertical, Phone, Video, ChevronLeft, Mic, Square, Trash2, Play, Pause } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
    type?: 'text' | 'audio' | 'image'
    media_url?: string
}

interface ChatWindowProps {
    initialMessages: Message[]
    currentUser: any
    otherUser: any // Profile of the person we are chatting with
}

export function ChatWindow({ initialMessages, currentUser, otherUser }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Voice Note State
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Scroll to bottom on load and new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isRecording, audioBlob])

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [audioUrl])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
            setRecordingDuration(0)
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1)
            }, 1000)
        } catch (err) {
            console.error('Error accessing microphone:', err)
            alert('Could not access microphone')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
            setAudioBlob(null)
            setAudioUrl(null)
        } else {
            setAudioBlob(null)
            setAudioUrl(null)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Real-time Subscription settings
    useEffect(() => {
        const channel = supabase
            .channel('chat_room')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}`, // Listen for messages sent TO me
                },
                (payload) => {
                    const newMsg = payload.new as Message
                    // Check if the message is from the person we are currently chatting with
                    if (newMsg.sender_id === otherUser.id) {
                        setMessages((prev) => [...prev, newMsg])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUser.id, otherUser.id, supabase])

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if ((!newMessage.trim() && !audioBlob) || sending) return

        const tempId = Math.random().toString()
        const msgContent = audioBlob ? 'Voice Message' : newMessage
        const msgType = audioBlob ? 'audio' : 'text'
        let finalMediaUrl = ''

        setSending(true)

        // Optimistic UI Update (Text Only)
        // For audio, we wait for upload to ensure we have a URL, 
        // or we could optimistically render the blob URL.
        const optimisticMsg: Message = {
            id: tempId,
            sender_id: currentUser.id,
            receiver_id: otherUser.id,
            content: msgContent,
            created_at: new Date().toISOString(),
            type: msgType,
            media_url: audioUrl || undefined
        }

        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage('')

        // Don't clear audio yet if we need to upload

        try {
            if (audioBlob) {
                const fileName = `${currentUser.id}/${Date.now()}.webm`
                const { error: uploadError } = await supabase.storage
                    .from('chat_attachments')
                    .upload(fileName, audioBlob)

                if (uploadError) throw uploadError

                const { data } = supabase.storage
                    .from('chat_attachments')
                    .getPublicUrl(fileName)

                finalMediaUrl = data.publicUrl

                // Clear audio state after upload preparation
                setAudioBlob(null)
                setAudioUrl(null)
            }

            const payload = {
                sender_id: currentUser.id,
                receiver_id: otherUser.id,
                content: msgContent,
                type: msgType,
                media_url: finalMediaUrl || null
            }
            console.log('Inserting message:', payload)

            const { error } = await supabase
                .from('messages')
                .insert(payload)

            if (error) throw error
        } catch (err) {
            console.error('Failed to send', err)
            setMessages(prev => prev.filter(m => m.id !== tempId))
        } finally {
            setSending(false)
        }
    }



    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[85vh] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-white/5">
                <div className="flex items-center gap-3">
                    <Link href="/matches" className="md:hidden text-white/60 hover:text-white">
                        <ChevronLeft />
                    </Link>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                            <Image
                                src={otherUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60'}
                                alt={otherUser.full_name}
                                width={40}
                                height={40}
                                className="object-cover"
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black"></div>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">{otherUser.full_name}</h3>
                        <p className="text-white/40 text-xs">Active now</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-pink-500">
                    <button className="hover:bg-white/10 p-2 rounded-full transition-colors"><Phone size={20} /></button>
                    <button className="hover:bg-white/10 p-2 rounded-full transition-colors"><Video size={20} /></button>
                    <button className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/40"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <MessageCircle size={32} />
                        </div>
                        <p>Say hello to {otherUser.full_name.split(' ')[0]}!</p>
                        <p className="text-xs">It's a Match! Start the conversation.</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender_id === currentUser.id
                        return (
                            <motion.div
                                key={msg.id || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe
                                    ? 'bg-pink-600 text-white rounded-tr-none'
                                    : 'bg-white/10 text-white rounded-tl-none'
                                    }`}>
                                    {msg.type === 'audio' && msg.media_url ? (
                                        <div className="flex items-center gap-2 min-w-[200px]">
                                            <audio controls src={msg.media_url} className="w-full h-8" />
                                        </div>
                                    ) : (
                                        <p>{msg.content}</p>
                                    )}
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-white/40'}`}>
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-center gap-2">
                    {/* Recording UI */}
                    {isRecording ? (
                        <div className="flex-1 flex items-center gap-3 bg-red-500/10 border border-red-500/50 rounded-full px-4 py-3 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span className="text-red-500 font-mono font-bold flex-1">Recording {formatTime(recordingDuration)}</span>
                            <button type="button" onClick={cancelRecording} className="p-1 hover:bg-black/20 rounded-full text-white/60 hover:text-white">
                                <Trash2 size={18} />
                            </button>
                            <button type="button" onClick={stopRecording} className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600">
                                <Square size={18} fill="currentColor" />
                            </button>
                        </div>
                    ) : audioBlob ? (
                        <div className="flex-1 flex items-center gap-3 bg-pink-500/10 border border-pink-500/50 rounded-full px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                                <Mic size={16} className="text-white" />
                            </div>
                            <span className="text-white font-medium flex-1">Voice Message Recorded</span>
                            <button type="button" onClick={cancelRecording} className="p-2 hover:bg-black/20 rounded-full text-white/60 hover:text-red-400">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 transition-colors"
                        />
                    )}

                    {!isRecording && !audioBlob && (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-pink-500 transition-colors"
                        >
                            <Mic size={20} />
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !audioBlob) || sending}
                        className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} className={sending ? 'opacity-50' : 'ml-0.5'} />
                    </button>
                </div>
            </form>
        </div>
    )
}

function MessageCircle({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg>
    )
}
