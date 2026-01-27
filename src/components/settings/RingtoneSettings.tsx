'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { audioManager } from '@/lib/audioManager'
import { Play, Square, Music, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function RingtoneSettings() {
    const [selectedRingtone, setSelectedRingtone] = useState('incoming-call')
    const [isPlaying, setIsPlaying] = useState<string | null>(null)
    const supabase = createClient()
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null)

    const ringtones = [
        { id: 'incoming-call', name: 'Default', file: 'incoming-call.mp3' },
        { id: 'classic', name: 'Classic Ring', file: 'ringtones/classic.mp3' },
        { id: 'modern', name: 'Modern Tone', file: 'ringtones/modern.mp3' },
        { id: 'gentle', name: 'Gentle Chime', file: 'ringtones/gentle.mp3' },
        { id: 'vibrant', name: 'Vibrant Beat', file: 'ringtones/vibrant.mp3' }
    ]

    useEffect(() => {
        // Load initial setting
        const loadRating = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('user_preferences')
                    .select('ringtone')
                    .eq('user_id', user.id)
                    .single()

                if (data?.ringtone) {
                    setSelectedRingtone(data.ringtone)
                }
            }
        }
        loadRating()
    }, [supabase])

    const handlePreview = (ringtone: typeof ringtones[0]) => {
        if (isPlaying === ringtone.id) {
            previewAudio?.pause()
            setIsPlaying(null)
            return
        }

        if (previewAudio) {
            previewAudio.pause()
        }

        // Determine path based on if it's in ringtones subfolder or root
        const path = `/sounds/${ringtone.file}`
        const audio = new Audio(path)

        audio.play().catch(e => console.error("Preview failed", e))
        audio.onended = () => setIsPlaying(null)

        setPreviewAudio(audio)
        setIsPlaying(ringtone.id)
    }

    const handleSelect = async (ringtoneId: string) => {
        setSelectedRingtone(ringtoneId)
        audioManager.setRingtone(ringtoneId)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    ringtone: ringtoneId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (error) {
                console.error("Error saving preference:", error)
                toast.error("Failed to save preference")
            } else {
                toast.success("Ringtone updated")
            }
        }
    }

    useEffect(() => {
        return () => {
            previewAudio?.pause()
        }
    }, [previewAudio])

    return (
        <div className="space-y-2">
            {ringtones.map((ringtone) => (
                <div
                    key={ringtone.id}
                    className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                        selectedRingtone === ringtone.id
                            ? "bg-pink-500/10 border-pink-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handlePreview(ringtone)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white transition-colors"
                        >
                            {isPlaying === ringtone.id ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        </button>
                        <div>
                            <p className={cn("text-sm font-medium", selectedRingtone === ringtone.id ? "text-pink-400" : "text-white")}>
                                {ringtone.name}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleSelect(ringtone.id)}
                        className={cn(
                            "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                            selectedRingtone === ringtone.id
                                ? "bg-pink-500 border-pink-500 text-white"
                                : "border-white/30 hover:border-white/60"
                        )}
                    >
                        {selectedRingtone === ringtone.id && <Check size={14} />}
                    </button>
                </div>
            ))}
        </div>
    )
}
