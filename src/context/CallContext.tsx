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
    const iceCandidatesQueue = useRef<RTCIceCandidate[]>([])

    // Config
    const rtcConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ]
    }

    // Helper: Clean up call
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
        iceCandidatesQueue.current = []
    }

    // Listen for incoming calls
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel(`calls:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `receiver_id=eq.${user.id}`,
                    },
                    async (payload) => {
                        const newSession = payload.new as CallSession
                        if (newSession.status === 'ringing') {
                            // Verify status is idle, else auto-decline "busy"
                            if (callStatus !== 'idle') {
                                // TODO: Mark as declined/busy
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
                            // Play ringtone logic here
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `receiver_id=eq.${user.id}`, // As receiver
                    },
                    (payload) => handleCallUpdate(payload.new as CallSession)
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'call_sessions',
                        filter: `caller_id=eq.${user.id}`, // As caller
                    },
                    (payload) => handleCallUpdate(payload.new as CallSession)
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }

        fetchUser()
    }, [supabase, callStatus])


    const handleCallUpdate = async (session: CallSession) => {
        if (session.status === 'ended' || session.status === 'declined') {
            cleanupCall()
            toast.info(`Call ${session.status}`)
        }

        // Handle Answer (Caller Side)
        if (session.status === 'active' && callStatus === 'outgoing' && session.sdp_answer) {
            if (peerConnection.current && !peerConnection.current.currentRemoteDescription) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(session.sdp_answer))
                // Process queued ICE candidates
                // (Simple implementation assumes candidates are exchanged via the array in DB)
            }
            setCallStatus('active')
        }

        // Handle ICE candidates update (Both sides)
        if (session.ice_candidates && session.ice_candidates.length > 0 && peerConnection.current) {
            // Simplified: In a robust app, we'd diff this. 
            // Here we just rely on Supabase pushing updates. 
            // We need a better way to signal candidates one by one or batch them.
            // For now, let's assume candidates are handled via signaling channel separately or simpler flow.
        }
    }


    const startCall = async (receiverId: string, type: CallType, receiverName: string, receiverAvatar: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            setCallerInfo({ name: receiverName, avatar: receiverAvatar })
            setCallStatus('outgoing')

            // 1. Get Local Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            })
            setLocalStream(stream)
            localStreamRef.current = stream

            // 2. Initialize Peer Connection
            const pc = new RTCPeerConnection(rtcConfig)
            peerConnection.current = pc

            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0])
            }

            const candidates: RTCIceCandidate[] = []
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidates.push(event.candidate)
                }
            }

            // 3. Create Offer
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            // 4. Create Session in DB
            // Need to wait briefly for gathering candidates or send them later.
            // For simplicity, we send offer first, then candidates as they come (future improvement)
            // Or wait a bit (trickle ICE vs vanilla)

            const { data: session, error } = await supabase
                .from('call_sessions')
                .insert({
                    caller_id: user.id,
                    receiver_id: receiverId,
                    call_type: type,
                    status: 'ringing',
                    sdp_offer: offer,
                    // match_id: ... // Need match ID, but can be inferred or optional if not strict
                })
                .select()
                .single()

            if (error) throw error
            setActiveCallSession(session)

            // Start listening for candidates to update the session?
            // For MVP, we might skip complex trickle ICE via DB and just do it if we can.

        } catch (err) {
            console.error(err)
            cleanupCall()
            toast.error("Failed to start call")
        }
    }

    const acceptCall = async () => {
        if (!activeCallSession) return

        try {
            const { data: { user } } = await supabase.auth.getUser()

            // 1. Get Local Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: activeCallSession.call_type === 'video'
            })
            setLocalStream(stream)
            localStreamRef.current = stream

            // 2. Initialize Peer Connection
            const pc = new RTCPeerConnection(rtcConfig)
            peerConnection.current = pc

            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0])
            }

            // 3. Set Remote Description (Offer)
            await pc.setRemoteDescription(new RTCSessionDescription(activeCallSession.sdp_offer))

            // 4. Create Answer
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            // 5. Update Session
            await supabase
                .from('call_sessions')
                .update({
                    status: 'active',
                    sdp_answer: answer
                })
                .eq('id', activeCallSession.id)

            setCallStatus('active')

        } catch (err) {
            console.error(err)
            toast.error("Failed to accept call")
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

        // Log to history here? Trigger via DB trigger better.
        cleanupCall()
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
        // Advanced: Requires stopping current track and getting new one from different deviceId
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
            {/* We will mount the CallOverlay here inside the provider so it's always available */}
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
