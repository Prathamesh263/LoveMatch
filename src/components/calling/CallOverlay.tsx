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
            className="fixed inset-0 bg-black pointer-events-auto overflow-hidden"
        >
            {/* Remote Video (Full Screen) */}
            {isVideoCall ? (
                <div className="absolute inset-0">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <span className="text-white/40">Waiting for video...</span>
                        </div>
                    )}
                </div>
            ) : (
                // Voice Call UI Background
                <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center">
                    <div className="w-40 h-40 rounded-full border-4 border-pink-500/30 overflow-hidden mb-8">
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
                    dragConstraints={{ left: 0, right: 200, top: 0, bottom: 400 }}
                    className="absolute top-4 right-4 w-32 h-48 bg-zinc-800 rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                </motion.div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 z-20">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button
                    onClick={endCall}
                    className="p-5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                >
                    <PhoneOff size={32} />
                </button>

                {isVideoCall && (
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full backdrop-blur-md transition-all ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                )}
            </div>

            {/* Header Info */}
            <div className="absolute top-0 left-0 right-0 p-8 pt-12 bg-gradient-to-b from-black/80 to-transparent z-10">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-white shadow-black/50 drop-shadow-md">{callerInfo?.name}</h3>
                    <p className="text-white/70 shadow-black/50 drop-shadow-md">00:00</p>
                </div>
            </div>
        </motion.div>
    )
}
