'use client'

import { useCall } from '@/context/CallContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export function CallOverlay() {
    const { callStatus } = useCall()

    if (callStatus === 'idle') return null

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            <AnimatePresence>
                {callStatus === 'incoming' && <IncomingCallScreen key="incoming" />}
                {callStatus === 'outgoing' && <OutgoingCallScreen key="outgoing" />}
                {callStatus === 'active' && <ActiveCallScreen key="active" />}
            </AnimatePresence>
        </div>
    )
}

function IncomingCallScreen() {
    const { acceptCall, rejectCall, callerInfo, activeCallSession } = useCall()

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto"
        >
            <div className="flex flex-col items-center gap-8">
                <div className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl">
                    <Image
                        src={callerInfo?.avatar || '/placeholder-avatar.jpg'}
                        alt={callerInfo?.name || 'Caller'}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">{callerInfo?.name}</h2>
                    <p className="text-white/60 text-lg animate-pulse">
                        Incoming {activeCallSession?.call_type} Call...
                    </p>
                </div>

                <div className="flex items-center gap-12 mt-8">
                    <button
                        onClick={rejectCall}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
                    >
                        <PhoneOff size={32} />
                    </button>
                    <button
                        onClick={acceptCall}
                        className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-transform hover:scale-110 shadow-lg shadow-green-500/20 animate-bounce"
                    >
                        <Phone size={32} />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

function OutgoingCallScreen() {
    const { endCall, callerInfo, activeCallSession } = useCall()

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto"
        >
            <div className="flex flex-col items-center gap-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping"></div>
                    <div className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl">
                        <Image
                            src={callerInfo?.avatar || '/placeholder-avatar.jpg'}
                            alt={callerInfo?.name || 'Caller'}
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">{callerInfo?.name}</h2>
                    <p className="text-white/60 text-lg">
                        Calling...
                    </p>
                </div>

                <div className="mt-8">
                    <button
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
                    >
                        <PhoneOff size={32} />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

function ActiveCallScreen() {
    const {
        endCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoOff,
        localStream,
        remoteStream,
        activeCallSession,
        callerInfo
    } = useCall()

    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    const isVideoCall = activeCallSession?.call_type === 'video'

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black pointer-events-auto overflow-hidden text-white"
        >
            {/* Remote Video (Full Screen) */}
            {isVideoCall ? (
                <div className="absolute inset-0 z-0">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <span className="text-white/40 animate-pulse">Waiting for video...</span>
                        </div>
                    )}
                </div>
            ) : (
                // Voice Call UI Background - Modern Blur
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-0">
                    <div className="absolute inset-0 overflow-hidden">
                        <Image
                            src={callerInfo?.avatar || '/placeholder-avatar.jpg'}
                            alt="Blur BG"
                            fill
                            className="object-cover opacity-30 blur-[100px]"
                        />
                    </div>
                    <div className="relative w-48 h-48 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl mb-8 animate-pulse-slow">
                        <Image
                            src={callerInfo?.avatar || '/placeholder-avatar.jpg'}
                            alt={callerInfo?.name || 'Caller'}
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            )}

            {/* Local Video (PiP) */}
            {isVideoCall && (
                <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden shadow-2xl border border-white/20 z-20 cursor-grab active:cursor-grabbing"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror local video
                    />
                    {isVideoOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <VideoOff size={24} className="text-white/50" />
                        </div>
                    )}
                </motion.div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-10" />

            {/* Top Header */}
            <div className="absolute top-0 left-0 right-0 p-8 flex flex-col items-center z-20">
                <h3 className="text-2xl font-bold tracking-tight shadow-black/50 drop-shadow-lg">{callerInfo?.name}</h3>
                <CallTimer />
            </div>

            {/* Controls */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 z-20">
                <button
                    onClick={toggleMute}
                    className={`p-4 md:p-5 rounded-full backdrop-blur-xl transition-all duration-300 ${isMuted ? 'bg-white text-black hover:scale-105' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'}`}
                >
                    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </button>

                <button
                    onClick={endCall}
                    className="p-6 md:p-7 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-500/30 transition-transform hover:scale-110 active:scale-95"
                >
                    <PhoneOff size={40} fill="currentColor" />
                </button>

                {isVideoCall && (
                    <button
                        onClick={toggleVideo}
                        className={`p-4 md:p-5 rounded-full backdrop-blur-xl transition-all duration-300 ${isVideoOff ? 'bg-white text-black hover:scale-105' : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'}`}
                    >
                        {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
                    </button>
                )}
            </div>
        </motion.div>
    )
}

function CallTimer() {
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setDuration(prev => prev + 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="text-white/80 font-mono text-lg mt-1 font-medium tracking-wider shadow-black/50 drop-shadow-md bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
            {formatTime(duration)}
        </div>
    )
}
