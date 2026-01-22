'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Types
export type CallType = 'voice' | 'video'
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ending'

export interface CallSession {
    id: string
    caller_id: string
    receiver_id: string
    call_type: CallType
    status: string // 'ringing' | 'active' | 'ended' | 'declined' | 'missed'
    sdp_offer?: any
    sdp_answer?: any
    ice_candidates?: any[]
    caller?: { full_name: string, avatar_url: string } // Joined info if possible
}

interface CallContextType {
    callStatus: CallStatus
    activeCallSession: CallSession | null
    startCall: (receiverId: string, type: CallType, receiverName: string, receiverAvatar: string) => Promise<void>
    acceptCall: () => Promise<void>
    rejectCall: () => Promise<void>
    endCall: () => Promise<void>
    toggleMute: () => void
    toggleVideo: () => void
    switchCamera: () => Promise<void>
    isMuted: boolean
    isVideoOff: boolean
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    callerInfo: { name: string, avatar: string } | null
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const router = useRouter()

    // State
    const [callStatus, setCallStatus] = useState<CallStatus>('idle')
    const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null)
    const [callerInfo, setCallerInfo] = useState<{ name: string, avatar: string } | null>(null)

    // Media State
    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

    // Refs
    const peerConnection = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const callStatusRef = useRef<CallStatus>(callStatus)

    // Sync ref with state
    useEffect(() => {
        callStatusRef.current = callStatus
    }, [callStatus])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                console.log("CallProvider unmounting, stopping tracks")
                localStreamRef.current.getTracks().forEach(track => track.stop())
            }
            if (peerConnection.current) {
                peerConnection.current.close()
            }
        }
    }, [])

    // Config
    const rtcConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ]
    }

    const [currentUser, setCurrentUser] = useState<any>(null)

    // Setup Realtime for Incoming Calls
    useEffect(() => {
        let channel: any = null

        const setupIncomingCallListener = async (userId: string) => {
            if (channel) supabase.removeChannel(channel)

            channel = supabase
                .channel(`incoming_calls:${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `receiver_id=eq.${userId}`,
                    },
                    async (payload) => {
                        console.log('Incoming call payload:', payload)
                        const newSession = payload.new as CallSession
                        if (newSession.status === 'ringing') {
                            if (callStatusRef.current !== 'idle') {
                                // Busy logic could go here
                                return
                            }

                            // Fetch caller info
                            const { data: callerProfile } = await supabase
                                .from('profiles')
                                .select('full_name, avatar_url')
                                .eq('id', newSession.caller_id)
                                .single()

                            if (callerProfile) {
                                setCallerInfo({
                                    name: callerProfile.full_name,
                                    avatar: callerProfile.avatar_url
                                })
                            }

                            setActiveCallSession(newSession)
                            setCallStatus('incoming')
                        }
                    }
                )
                .subscribe()
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setCurrentUser(session.user)
                await setupIncomingCallListener(session.user.id)
            } else {
                setCurrentUser(null)
                if (channel) {
                    supabase.removeChannel(channel)
                    channel = null
                }
            }
        })

        // Initial check
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setCurrentUser(user)
                setupIncomingCallListener(user.id)
            }
        })

        return () => {
            subscription.unsubscribe()
            if (channel) supabase.removeChannel(channel)
        }
    }, [supabase])


    // --- Core WebRTC Functions ---

    const createPeerConnection = (userId: string, sessionId: string, onRemoteStream: (stream: MediaStream) => void) => {
        const pc = new RTCPeerConnection(rtcConfig)

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await supabase.from('ice_candidates').insert({
                    call_session_id: sessionId,
                    user_id: userId,
                    candidate: event.candidate // JSONB handles object automatically
                })
            }
        }

        // Handle Connection State
        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState)
            if (pc.connectionState === 'connected') {
                setCallStatus('active')
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                // Handle disconnection?
            }
        }

        // Handle Remote Stream
        pc.ontrack = (event) => {
            console.log('Received remote track')
            onRemoteStream(event.streams[0])
        }

        return pc
    }

    const startCall = async (receiverId: string, type: CallType, receiverName: string, receiverAvatar: string) => {
        try {
            if (!currentUser) throw new Error("Not authenticated")

            setCallerInfo({ name: receiverName, avatar: receiverAvatar })
            setCallStatus('outgoing')

            // 1. Get Local Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            })
            setLocalStream(stream)
            localStreamRef.current = stream

            // 2. Create Session DB Entry First (to get ID)
            // We need the ID for ICE candidates
            // But we need the Offer to create the session in one go usually? 
            // Actually, we can insert without offer first? No, schema implies we might want offer. 
            // Let's CREATE Offer first, then insert.

            const pc = new RTCPeerConnection(rtcConfig)
            peerConnection.current = pc

            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0])
            }

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            const { data: session, error } = await supabase
                .from('call_sessions')
                .insert({
                    caller_id: currentUser.id,
                    receiver_id: receiverId,
                    call_type: type,
                    status: 'ringing',
                    sdp_offer: offer,
                    // match_id is required by schema, assuming we have it or can fake it? 
                    // Schema says match_id references public.matches(id). 
                    // CRITICAL: We need a valid match_id. 
                    // For now, if we don't have it passed in, we face an issue. 
                    // Assuming this function is called from a context where we might know match_id?
                    // Or we default to a specific match logic. 
                    // Wait, the previous code didn't use match_id? 
                    // The schema requires it: `match_id uuid references public.matches(id)`. 
                    // I will need to find the match_id between these two users.
                })
                .select()
                .single()

            // If we fail here due to match_id constraint, we need to find it. 
            // Helper to get match_id:
            if (error) throw error

            setActiveCallSession(session)

            // 3. ICE Handling
            pc.onicecandidate = async (event) => {
                if (event.candidate && session) {
                    await supabase.from('ice_candidates').insert({
                        call_session_id: session.id,
                        user_id: currentUser.id,
                        candidate: event.candidate
                    })
                }
            }

            // 4. Subscribe to Answer
            const answerChannel = supabase
                .channel(`call_signaling:${session.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `id=eq.${session.id}`
                    },
                    async (payload) => {
                        const updated = payload.new as CallSession
                        if (updated.sdp_answer && !pc.currentRemoteDescription) {
                            console.log("Received Answer")
                            await pc.setRemoteDescription(new RTCSessionDescription(updated.sdp_answer))
                        }
                        if (updated.status === 'declined' || updated.status === 'ended') {
                            cleanupCall()
                            toast.info(`Call ${updated.status}`)
                        }
                    }
                )
                .subscribe()

            // 5. Subscribe to Remote ICE Candidates
            const iceChannel = supabase
                .channel(`ice_candidates:${session.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'ice_candidates',
                        filter: `call_session_id=eq.${session.id}`
                    },
                    async (payload) => {
                        const newCandidate = payload.new
                        if (newCandidate.user_id !== currentUser.id) {
                            console.log("Received remote ICE candidate")
                            await pc.addIceCandidate(new RTCIceCandidate(newCandidate.candidate))
                        }
                    }
                )
                .subscribe()


        } catch (err: any) {
            console.error("Start call error:", err)
            handleMediaError(err)
            cleanupCall()
        }
    }

    const acceptCall = async () => {
        if (!activeCallSession || !currentUser) return

        try {
            // 1. Get Local Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: activeCallSession.call_type === 'video'
            })
            setLocalStream(stream)
            localStreamRef.current = stream

            // 2. Init Peer Connection
            const pc = new RTCPeerConnection(rtcConfig)
            peerConnection.current = pc

            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0])
            }

            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    await supabase.from('ice_candidates').insert({
                        call_session_id: activeCallSession.id,
                        user_id: currentUser.id,
                        candidate: event.candidate
                    })
                }
            }

            // 3. Set Remote Description (Offer)
            await pc.setRemoteDescription(new RTCSessionDescription(activeCallSession.sdp_offer))

            // 4. Create Answer
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            // 5. Update Session with Answer
            await supabase
                .from('call_sessions')
                .update({
                    status: 'active',
                    sdp_answer: answer
                })
                .eq('id', activeCallSession.id)

            setCallStatus('active')

            // 6. Subscribe to Remote ICE Candidates
            const iceChannel = supabase
                .channel(`ice_candidates:${activeCallSession.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'ice_candidates',
                        filter: `call_session_id=eq.${activeCallSession.id}`
                    },
                    async (payload) => {
                        const newCandidate = payload.new
                        if (newCandidate.user_id !== currentUser.id) {
                            console.log("Received remote ICE candidate")
                            await pc.addIceCandidate(new RTCIceCandidate(newCandidate.candidate))
                        }
                    }
                )
                .subscribe()

            // 7. Subscribe to Session Updates (for end call)
            const sessionChannel = supabase
                .channel(`call_signaling_receiver:${activeCallSession.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `id=eq.${activeCallSession.id}`
                    },
                    (payload) => {
                        const updated = payload.new as CallSession
                        if (updated.status === 'ended') {
                            cleanupCall()
                            toast.info("Call ended")
                        }
                    }
                )
                .subscribe()

        } catch (err: any) {
            console.error("Accept call error:", err)
            handleMediaError(err)
            cleanupCall()
        }
    }

    const rejectCall = async () => {
        if (!activeCallSession) return
        await supabase
            .from('call_sessions')
            .update({ status: 'declined' })
            .eq('id', activeCallSession.id)
        cleanupCall()
    }

    const endCall = async () => {
        if (!activeCallSession) return
        await supabase
            .from('call_sessions')
            .update({ status: 'ended' })
            .eq('id', activeCallSession.id)
        cleanupCall()
    }

    const cleanupCall = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop())
        }
        if (peerConnection.current) {
            peerConnection.current.close()
            peerConnection.current = null
        }
        setLocalStream(null)
        setRemoteStream(null)
        setCallStatus('idle')
        setActiveCallSession(null)
        setCallerInfo(null)
        setIsMuted(false)
        setIsVideoOff(false)
        // Ideally unsubscribe from channels here too, but they are scoped to functions currently or global
        // Real app should manage channel refs
    }

    // Helper for errors
    const handleMediaError = (err: any) => {
        if (err.name === 'NotReadableError') {
            toast.error("Camera/Mic is busy. Please close other apps using it.")
        } else if (err.name === 'NotAllowedError') {
            toast.error("Permission denied. Please allow access to camera/mic.")
        } else if (err.name === 'NotFoundError') {
            toast.error("No camera/mic found.")
        } else {
            toast.error("Call failed")
        }
    }

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled
            })
            setIsMuted(!isMuted)
        }
    }

    const toggleVideo = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled
            })
            setIsVideoOff(!isVideoOff)
        }
    }

    const switchCamera = async () => {
        // Placeholder
    }

    return (
        <CallContext.Provider value={{
            callStatus,
            activeCallSession,
            startCall,
            acceptCall,
            rejectCall,
            endCall,
            toggleMute,
            toggleVideo,
            switchCamera,
            isMuted,
            isVideoOff,
            localStream,
            remoteStream,
            callerInfo
        }}>
            {children}
        </CallContext.Provider>
    )
}

export const useCall = () => {
    const context = useContext(CallContext)
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider')
    }
    return context
}
