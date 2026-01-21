'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Upload, Loader2, X, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'
import { ButtonGroup } from '@/components/ui/ButtonGroup'

// Steps
import { OnboardingPhotos } from './steps/OnboardingPhotos'
import { OnboardingBio } from './steps/OnboardingBio'
import { OnboardingInterests } from './steps/OnboardingInterests'
import { OnboardingPreferences } from './steps/OnboardingPreferences'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    interface PhotoItem { url: string; file?: File }

    const [formData, setFormData] = useState({
        photos: [] as PhotoItem[],
        bio: '',
        interests: [] as string[],
        ageRange: [18, 99],
        distance: 50,
        showGender: 'everyone'
    })

    const totalSteps = 4
    const progress = (step / totalSteps) * 100

    const handleNext = async () => {
        if (step < totalSteps) {
            setStep(s => s + 1)
        } else {
            await handleSubmit()
        }
    }

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1)
    }

    const handleSkip = async () => {
        // Skip current step logic or just finish? 
        // User requested "Skip option for later completion"
        // We'll try to save what we have and move on
        await handleSubmit(true)
    }

    const handleSubmit = async (isSkip = false) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let uploadedPhotoUrls: string[] = []

            // 1. Upload Photos
            if (formData.photos.length > 0) {
                // Keep existing URLs (if we had edit flow) or uploaded ones
                // In this flow, we likely just have new files or local previews

                for (const photo of formData.photos) {
                    if (photo.file) {
                        const fileExt = photo.file.name.split('.').pop()
                        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

                        const { error: uploadError } = await supabase.storage
                            .from('avatars')
                            .upload(fileName, photo.file)

                        if (uploadError) {
                            console.error('Upload failed:', uploadError)
                            continue
                        }

                        const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(fileName)

                        uploadedPhotoUrls.push(publicUrl)
                    } else if (photo.url) {
                        // Already a remote URL? (Not relevant for fresh onboarding but good practice)
                        if (!photo.url.startsWith('blob:')) {
                            uploadedPhotoUrls.push(photo.url)
                        }
                    }
                }
            }

            // 2. Update Profile
            const updates = {
                bio: formData.bio,
                interests: formData.interests,
                photos: uploadedPhotoUrls, // Save array of URLs
                avatar_url: uploadedPhotoUrls[0] || null, // Main avatar is the first one
                age_min: formData.ageRange[0],
                age_max: formData.ageRange[1],
                distance_max: formData.distance,
                show_gender: formData.showGender,
                updated_at: new Date().toISOString()
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)

            if (error) throw error

            toast.success(isSkip ? "Profile saved for later!" : "Profile setup complete!")
            router.push('/discover')

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to save profile")
        } finally {
            setLoading(false)
        }
    }

    return (
        <GlassCard className="p-8">
            <div className="flex justify-between items-center mb-6">
                {/* Progress Bar Container */}
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden mr-4">
                    <div
                        className="h-full bg-pink-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {/* Skip Button */}
                <button
                    onClick={handleSkip}
                    className="text-white/40 text-sm hover:text-white transition-colors"
                >
                    Skip
                </button>
            </div>

            <div className="min-h-[400px]">
                <AnimatePresence mode='wait'>
                    {step === 1 && (
                        <OnboardingPhotos key="step1" data={formData} update={setFormData} />
                    )}
                    {step === 2 && (
                        <OnboardingBio key="step2" data={formData} update={setFormData} />
                    )}
                    {step === 3 && (
                        <OnboardingInterests key="step3" data={formData} update={setFormData} />
                    )}
                    {step === 4 && (
                        <OnboardingPreferences key="step4" data={formData} update={setFormData} />
                    )}
                </AnimatePresence>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-white/5">
                <button
                    onClick={handleBack}
                    className={`px-6 py-2 rounded-full text-white/50 hover:text-white transition-colors ${step === 1 ? 'invisible' : ''}`}
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={loading}
                    className="px-8 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                    <span>{step === totalSteps ? 'Finish' : 'Continue'}</span>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                </button>
            </div>
        </GlassCard>
    )
}
