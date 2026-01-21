'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { MapPin, Calendar, Heart, MessageCircle, Edit2, Settings, ShieldCheck, X, Save, Loader2, Plus, Star } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ButtonGroup } from '@/components/ui/ButtonGroup'

import { getZodiacSign } from '@/lib/astrology'
import { Profile, PersonalityType } from '@/types'

interface ProfileViewProps {
    profile: Profile
    user: any
}

export function ProfileView({ profile: initialProfile, user }: ProfileViewProps) {
    const supabase = createClient()
    const [profile, setProfile] = useState(initialProfile)
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form State (for editing)
    const [formData, setFormData] = useState({
        bio: profile.bio || '',
        interests: profile.interests || [] as string[],
        looking_for: profile.looking_for || 'female',
        gender: profile.gender || 'male',
        dob: profile.dob || '',
        personality_type: profile.personality_type || '' as PersonalityType | '',
    })

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bio: formData.bio,
                    interests: formData.interests,
                    looking_for: formData.looking_for,
                    gender: formData.gender,
                    dob: formData.dob,
                    zodiac_sign: formData.dob ? getZodiacSign(formData.dob) : null,
                    personality_type: formData.personality_type,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (error) throw error

            const updatedProfile: Profile = {
                ...profile,
                ...formData,
                zodiac_sign: formData.dob ? getZodiacSign(formData.dob) : undefined,
                personality_type: formData.personality_type || undefined
            }
            setProfile(updatedProfile)
            setIsEditing(false)
            toast.success("Profile updated successfully")
        } catch (error: any) {
            toast.error("Failed to update profile: " + error.message)
        } finally {
            setSaving(false)
        }
    }

    const toggleInterest = (tag: string) => {
        const current = formData.interests
        if (current.includes(tag)) {
            setFormData({ ...formData, interests: current.filter((t: string) => t !== tag) })
        } else {
            if (current.length >= 10) return // Max 10 limits
            setFormData({ ...formData, interests: [...current, tag] })
        }
    }

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('File size must be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const currentPhotos = profile.photos && profile.photos.length > 0
                ? profile.photos
                : (profile.avatar_url ? [profile.avatar_url] : [])

            const updatedPhotos = [...currentPhotos, publicUrl]

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    photos: updatedPhotos,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (updateError) throw updateError

            setProfile({ ...profile, photos: updatedPhotos })
            toast.success('Photo uploaded successfully')
        } catch (error: any) {
            console.error('Error uploading photo:', error)
            toast.error('Failed to upload photo: ' + error.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    // Default to photos array or single avatar
    const photos = profile.photos && profile.photos.length > 0
        ? profile.photos
        : (profile.avatar_url ? [profile.avatar_url] : [])

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header / Hero Section */}
            <div className="relative">
                {/* Banner Background */}
                <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-r from-pink-500/20 to-rose-600/20 border border-white/5 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=2572&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                </div>

                {/* Profile Info Overlay */}
                <div className="relative px-6 md:px-10 -mt-16 md:-mt-20 flex flex-col md:flex-row items-end gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0a0a0a] bg-[#1a1a1a] overflow-hidden shadow-2xl relative">
                            {profile.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
                                    <span className="text-4xl font-bold">{profile.full_name?.[0]}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name & Stats */}
                    <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between md:justify-start gap-4 mb-1">
                            <h1 className="text-3xl font-bold text-white">{profile.full_name}</h1>
                            {!isEditing && <ShieldCheck className="text-blue-400 fill-blue-500/20" size={24} />}
                        </div>
                        <p className="text-white/60 flex items-center gap-2 text-sm">
                            {/* Age/Zodiac Badge */}
                            <span className="bg-white/10 px-2 py-0.5 rounded text-white/80 flex items-center gap-1">
                                {profile.age || 24}
                                {profile.zodiac_sign && <span className="opacity-50">| {profile.zodiac_sign}</span>}
                            </span>
                            <span>•</span>
                            <MapPin size={14} /> Mumbai, India
                            <span>•</span>
                            <span className="capitalize">{isEditing ? formData.gender : profile.gender}</span>
                            {profile.personality_type && (
                                <>
                                    <span>•</span>
                                    <span className="text-pink-400 font-bold">{profile.personality_type}</span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="pb-2 flex gap-3">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    disabled={uploading}
                                />
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 rounded-full bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-6 py-2 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="space-y-6">
                    {/* ABOUT */}
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            About Me
                        </h3>
                        {isEditing ? (
                            <div>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 resize-none text-sm"
                                    placeholder="Tell potential matches about yourself..."
                                    maxLength={300}
                                />
                                <div className="text-right text-xs text-white/40 mt-1">{formData.bio.length}/300</div>
                            </div>
                        ) : (
                            <p className="text-white/70 leading-relaxed text-sm whitespace-pre-wrap">
                                {profile.bio || "No bio yet. Tap edit to tell people about yourself!"}
                            </p>
                        )}
                    </GlassCard>

                    {/* INTERESTS */}
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Interests</h3>
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {formData.interests.map((tag: string) => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-pink-500 text-white text-xs flex items-center gap-1">
                                            {tag}
                                            <button onClick={() => toggleInterest(tag)}><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-xs text-white/40 mb-2">Add more (Popular ones):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Travel', 'Foodie', 'Music', 'Fitness', 'Movies', 'Tech', 'Art', 'Gaming'].map(tag => (
                                            !formData.interests.includes(tag) && (
                                                <button
                                                    key={tag}
                                                    onClick={() => toggleInterest(tag)}
                                                    className="px-3 py-1 rounded-full border border-white/10 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-colors"
                                                >
                                                    + {tag}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.interests && profile.interests.length > 0 ? (
                                    profile.interests.map((tag: string) => (
                                        <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
                                            {tag}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-white/40 text-sm">No interests added.</p>
                                )}
                            </div>
                        )}
                    </GlassCard>

                    {/* INFO CARD */}
                    <GlassCard className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-white mb-2">Basics</h3>

                        <div className="flex items-center gap-3 text-white/60 text-sm">
                            <Calendar size={16} />
                            {isEditing ? (
                                <div className="flex-1">
                                    <label className="text-xs block text-white/40 mb-1">Looking For</label>
                                    <select
                                        value={formData.looking_for}
                                        onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
                                    >
                                        <option value="male" className="bg-gray-900 text-white">Men</option>
                                        <option value="female" className="bg-gray-900 text-white">Women</option>
                                        <option value="everyone" className="bg-gray-900 text-white">Everyone</option>
                                    </select>
                                </div>
                            ) : (
                                <span>Looking for: <strong className="text-white capitalize">{profile.looking_for}</strong></span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-white/60 text-sm">
                            <Heart size={16} />
                            {isEditing ? (
                                <div className="flex-1">
                                    <label className="text-xs block text-white/40 mb-1">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
                                    >
                                        <option value="male" className="bg-gray-900 text-white">Man</option>
                                        <option value="female" className="bg-gray-900 text-white">Woman</option>
                                        <option value="other" className="bg-gray-900 text-white">Other</option>
                                    </select>
                                </div>
                            ) : (
                                <span>Gender: <strong className="text-white capitalize">{profile.gender}</strong></span>
                            )}
                        </div>

                        {/* DOB & Personality */}
                        {isEditing && (
                            <div className="flex items-center gap-3 text-white/60 text-sm">
                                <Calendar size={16} />
                                <div className="flex-1">
                                    <label className="text-xs block text-white/40 mb-1">Birthday (for Zodiac)</label>
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 text-white/60 text-sm">
                            <div className="flex items-center gap-3">
                                <Star size={16} />
                                <span className={isEditing ? "text-xs text-white/40 block" : ""}>
                                    Personality Type {isEditing && "(MBTI)"}
                                </span>
                                {!isEditing && (
                                    <span>: <strong className="text-white">{profile.personality_type || 'Add yours'}</strong></span>
                                )}
                            </div>

                            {isEditing && (
                                <div className="pl-7 space-y-3">
                                    {[
                                        { label: 'Energy', left: 'Extravert (E)', right: 'Introvert (I)', vals: ['E', 'I'] },
                                        { label: 'Mind', left: 'Sensing (S)', right: 'Intuitive (N)', vals: ['S', 'N'] },
                                        { label: 'Nature', left: 'Thinking (T)', right: 'Feeling (F)', vals: ['T', 'F'] },
                                        { label: 'Tactics', left: 'Judging (J)', right: 'Prospecting (P)', vals: ['J', 'P'] },
                                    ].map((row, idx) => {
                                        // Safe default if empty: E, S, T, J
                                        const currentVal = (formData.personality_type || 'ESTJ')[idx]
                                        return (
                                            <div key={idx} className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase tracking-wider text-white/30">{row.label}</span>
                                                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                                    <button
                                                        onClick={() => {
                                                            const current = (formData.personality_type || 'ESTJ').split('')
                                                            current[idx] = row.vals[0]
                                                            setFormData({ ...formData, personality_type: current.join('') as any })
                                                        }}
                                                        className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-all ${currentVal === row.vals[0] ? 'bg-pink-500 text-white font-bold shadow-lg' : 'text-white/50 hover:bg-white/5'}`}
                                                    >
                                                        {row.left}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const current = (formData.personality_type || 'ESTJ').split('')
                                                            current[idx] = row.vals[1]
                                                            setFormData({ ...formData, personality_type: current.join('') as any })
                                                        }}
                                                        className={`flex-1 py-1.5 px-2 rounded-md text-xs transition-all ${currentVal === row.vals[1] ? 'bg-pink-500 text-white font-bold shadow-lg' : 'text-white/50 hover:bg-white/5'}`}
                                                    >
                                                        {row.right}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div className="text-center mt-2">
                                        <span className="text-xs text-white/40">Result: </span>
                                        <span className="text-lg font-bold text-white tracking-widest">{formData.personality_type || 'ESTJ'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Photos */}
                <div className="md:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">
                                My Photos
                                {photos.length > 0 && <span className="ml-2 text-sm text-white/50 font-normal">({photos.length})</span>}
                            </h3>
                            {/* Photo editing is complex (upload/delete), limiting to Profile Setup scope for now or future task */}
                            {isEditing && <p className="text-xs text-white/40">Photo management coming soon</p>}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {photos.map((photo: string, index: number) => (
                                <div key={index} className="aspect-[3/4] rounded-xl overflow-hidden relative group">
                                    <Image
                                        src={photo}
                                        alt={`Photo ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}

                            {/* Placeholder for adding photos */}
                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:text-pink-500 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={24} />
                                    <span className="text-xs mt-2 font-medium">
                                        {uploading ? 'Uploading...' : 'Add Photo'}
                                    </span>
                                </button>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
