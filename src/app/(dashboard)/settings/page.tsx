'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Bell, Lock, Globe, Shield, Trash2, LogOut, Moon, Volume2, ChevronRight, Mail, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RingtoneSettings } from '@/components/settings/RingtoneSettings'

export default function SettingsPage() {
    const supabase = createClient()
    const router = useRouter()

    // Mock States for Toggles
    const [settings, setSettings] = useState({
        newMatches: true,
        messages: true,
        promotions: false,
        onlineStatus: true,
        globalMode: false,
        soundEffects: true,
    })

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }))
        toast.success("Setting updated", { description: "Changes saved locally." })
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        toast.success('Signed out successfully')
        router.push('/')
    }

    const handleDeleteAccount = () => {
        // In a real app, this would be a modal confirmation -> API call
        toast.error("Critical Action", { description: "This would permanently delete your account." })
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

            {/* Notifications */}
            <Section title="Notifications" icon={Bell}>
                <ToggleRow
                    label="New Matches"
                    desc="Get notified when you match with someone"
                    isOn={settings.newMatches}
                    onToggle={() => handleToggle('newMatches')}
                />
                <ToggleRow
                    label="Messages"
                    desc="Receive notifications for new messages"
                    isOn={settings.messages}
                    onToggle={() => handleToggle('messages')}
                />
                <ToggleRow
                    label="Promotions & Tips"
                    desc="Receive news and dating advice"
                    isOn={settings.promotions}
                    onToggle={() => handleToggle('promotions')}
                />
            </Section>

            {/* Privacy & Discovery */}
            <Section title="Privacy & Discovery" icon={Lock}>
                <ToggleRow
                    label="Show Online Status"
                    desc="Let matches see when you were last active"
                    isOn={settings.onlineStatus}
                    onToggle={() => handleToggle('onlineStatus')}
                />
                <ToggleRow
                    label="Global Mode"
                    desc="See people from all over the world"
                    isOn={settings.globalMode}
                    onToggle={() => handleToggle('globalMode')}
                    icon={<Globe size={16} />}
                />
            </Section>

            {/* App Settings */}
            <Section title="Application" icon={Shield}>
                <ToggleRow
                    label="Sound Effects"
                    desc="Play sounds when swiping and matching"
                    isOn={settings.soundEffects}
                    onToggle={() => handleToggle('soundEffects')}
                    icon={<Volume2 size={16} />}
                />
                <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                        <Moon size={18} className="text-white/60" />
                        <div>
                            <h4 className="text-white font-medium text-sm">Dark Mode</h4>
                            <p className="text-white/40 text-xs">Always On</p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Call Settings */}
            <Section title="Call Settings" icon={Music}>
                <div className="p-2">
                    <h3 className="text-white font-medium text-sm mb-3 px-2">Incoming Call Ringtone</h3>
                    <RingtoneSettings />
                </div>
            </Section>

            {/* Support & Legal */}
            <Section title="Support" icon={Mail}>
                <LinkRow label="Help Center" />
                <LinkRow label="Privacy Policy" />
                <LinkRow label="Terms of Service" />
            </Section>

            {/* Account Actions */}
            <div className="pt-6 border-t border-white/10 space-y-4">
                <button
                    onClick={handleSignOut}
                    className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>

                <div className="text-center">
                    <button
                        onClick={handleDeleteAccount}
                        className="text-red-500/70 text-sm hover:text-red-500 transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <Trash2 size={14} />
                        Delete Data & Account
                    </button>
                    <p className="text-white/20 text-[10px] mt-2">Version 1.0.0 • LoveMatch Inc.</p>
                </div>
            </div>
        </div>
    )
}

// --- Subcomponents ---

function Section({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <GlassCard className="overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
                <div className="p-1.5 rounded-md bg-pink-500/20 text-pink-400">
                    <Icon size={18} />
                </div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            <div className="p-2">
                {children}
            </div>
        </GlassCard>
    )
}

interface ToggleRowProps {
    label: string
    desc: string
    isOn: boolean
    onToggle: () => void
    icon?: React.ReactNode
}

function ToggleRow({ label, desc, isOn, onToggle, icon }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                {icon && <div className="text-white/60">{icon}</div>}
                <div>
                    <h4 className="text-white font-medium text-sm">{label}</h4>
                    <p className="text-white/40 text-xs">{desc}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={cn(
                    "w-11 h-6 rounded-full relative transition-colors duration-300 focus:outline-none",
                    isOn ? "bg-pink-500" : "bg-white/20"
                )}
            >
                <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow",
                    isOn ? "translate-x-5" : "translate-x-0"
                )} />
            </button>
        </div>
    )
}

function LinkRow({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <h4 className="text-white/80 font-medium text-sm group-hover:text-white">{label}</h4>
            <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
        </div>
    )
}
