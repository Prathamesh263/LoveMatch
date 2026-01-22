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

    // Signaling Refs
    const remoteCandidatesQueue = useRef<any[]>([])
    const processedCandidateIds = useRef<Set<string>>(new Set())

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
                .subscribe((status) => {
                    console.log(`Realtime Incoming Call Status for ${userId}:`, status)
                    if (status === 'SUBSCRIBED') {
                        // toast.success("Ready for calls") // Debug only
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error("Realtime channel error")
                        toast.error("Connection error: Calls may not work")
                    } else if (status === 'TIMED_OUT') {
                        console.error("Realtime connection timed out")
                    }
                })
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


    // --- Helper Functions (Hoisted) ---

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

        // Clear Queues
        remoteCandidatesQueue.current = []
        processedCandidateIds.current.clear()

        // Ideally unsubscribe from channels here too, but they are scoped to functions currently or global
        // Real app should manage channel refs
    }

    const processRemoteCandidate = async (candidateData: { candidate: any, id?: string }) => {
        // Deduplication
        if (candidateData.id) {
            if (processedCandidateIds.current.has(candidateData.id)) {
                return
            }
            processedCandidateIds.current.add(candidateData.id)
        }

        const pc = peerConnection.current
        if (!pc) return

        const candidate = new RTCIceCandidate(candidateData.candidate)

        // If we have a remote description, add immediately
        if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
                await pc.addIceCandidate(candidate)
            } catch (e) {
                console.warn("Error adding ICE candidate:", e)
            }
        } else {
            // Otherwise buffer
            console.log("Buffering ICE candidate (remote desc not ready)")
            remoteCandidatesQueue.current.push(candidateData)
        }
    }

    const flushRemoteCandidatesQueue = async () => {
        const pc = peerConnection.current
        if (!pc || !pc.remoteDescription) return

        const queue = remoteCandidatesQueue.current
        if (queue.length === 0) return

        console.log(`Flushing ${queue.length} buffered candidates`)

        for (const candidateData of queue) {
            const candidate = new RTCIceCandidate(candidateData.candidate)
            try {
                await pc.addIceCandidate(candidate)
            } catch (e) {
                console.warn("Error flushing ICE candidate:", e)
            }
        }
        // Clear queue
        remoteCandidatesQueue.current = []
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

    // --- Core WebRTC Functions ---

    const startCall = async (receiverId: string, type: CallType, receiverName: string, receiverAvatar: string) => {
        try {
            if (!currentUser) throw new Error("Not authenticated")

            setCallerInfo({ name: receiverName, avatar: receiverAvatar })
            setCallStatus('outgoing')

            // Reset queues
            remoteCandidatesQueue.current = []
            processedCandidateIds.current = new Set()

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

            // Buffer candidates until session is created
            const candidatesQueue: RTCIceCandidate[] = []
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    candidatesQueue.push(event.candidate)
                }
            }

            // 3. Create Offer
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            // 4. Create Session in DB
            const { data: session, error } = await supabase
                .from('call_sessions')
                .insert({
                    caller_id: currentUser.id,
                    receiver_id: receiverId,
                    call_type: type,
                    status: 'ringing',
                    sdp_offer: offer,
                    // Note regarding match_id: The DB schema requires it.
                    // If you encounter errors here, ensure a trigger or logic provides a valid match_id.
                })
                .select()
                .single()

            if (error) {
                console.error("Error creating call session:", error)
                throw error
            }

            setActiveCallSession(session)

            // 5. Flush Buffered Candidates & Update Handler
            if (candidatesQueue.length > 0) {
                const inserts = candidatesQueue.map(c => ({
                    call_session_id: session.id,
                    user_id: currentUser.id,
                    candidate: c.toJSON()
                }))
                await supabase.from('ice_candidates').insert(inserts)
            }

            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    await supabase.from('ice_candidates').insert({
                        call_session_id: session.id,
                        user_id: currentUser.id,
                        candidate: event.candidate.toJSON()
                    })
                }
            }

            // 6. Subscribe to Answer & Remote Candidates
            const channel = supabase
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
                            await flushRemoteCandidatesQueue()
                            setCallStatus('active')
                        }

                        if (updated.status === 'declined' || updated.status === 'ended') {
                            cleanupCall()
                            toast.info(`Call ${updated.status}`)
                        }
                    }
                )
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
                            await processRemoteCandidate({
                                candidate: newCandidate.candidate,
                                id: newCandidate.id
                            })
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

        // Reset processing state for new call
        remoteCandidatesQueue.current = []
        processedCandidateIds.current = new Set()

        try {
            // Use currentUser (already checked) instead of re-fetching

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
                        candidate: event.candidate.toJSON()
                    })
                }
            }

            // 3. Set Remote Description (Offer)
            await pc.setRemoteDescription(new RTCSessionDescription(activeCallSession.sdp_offer))

            // 3.5 Flush any candidates that might have arrived (unlikely this early but good practice)
            await flushRemoteCandidatesQueue()

            // 4. Start Subscription EARLY (to catch candidates while we fetch existing)
            // Note: In Supabase Realtime, we should set up the listener before processing initial snapshot if possible, 
            // but here we do granular fetches. We'll start listener now.
            const channel = supabase
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
                            await processRemoteCandidate({
                                candidate: newCandidate.candidate,
                                id: newCandidate.id
                            })
                        }
                    }
                )
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

            // 5. Fetch Existing Remote Candidates
            const { data: existingCandidates } = await supabase
                .from('ice_candidates')
                .select('*')
                .eq('call_session_id', activeCallSession.id)
                .neq('user_id', currentUser.id)

            if (existingCandidates) {
                console.log(`Found ${existingCandidates.length} existing remote candidates`)
                for (const candidateData of existingCandidates) {
                    await processRemoteCandidate({
                        candidate: candidateData.candidate,
                        id: candidateData.id
                    })
                }
            }

            // 6. Create Answer
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            // 7. Update Session with Answer
            await supabase
                .from('call_sessions')
                .update({
                    status: 'active',
                    sdp_answer: answer
                })
                .eq('id', activeCallSession.id)

            setCallStatus('active')

            // Channel is already subscribed above

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
