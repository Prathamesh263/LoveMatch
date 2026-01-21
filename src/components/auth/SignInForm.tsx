'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'

export default function SignInForm() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const registered = searchParams.get('registered')

    const [loading, setLoading] = useState(false)

    if (registered) {
        toast.success('Account created! Please sign in.')
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            toast.success('Welcome back to LoveMatch!')
            router.push('/discover')
            router.refresh()

        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'facebook') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (err: any) {
            toast.error(`Failed to sign in with ${provider}: ${err.message}`)
        }
    }

    return (
        <GlassCard className="p-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2 font-serif">Welcome Back</h2>
                <p className="text-red-100/80">Sign in to continue your love story</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-white/80 text-sm pl-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                        <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 transition-colors" placeholder="hello@lovematch.com" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-white/80 text-sm pl-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                        <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 transition-colors" placeholder="••••••••" />
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500" />
                        <span className="text-white/70">Remember me</span>
                    </label>
                    <Link href="/auth/forgot-password" className="text-red-400 hover:text-red-300">Forgot Password?</Link>
                </div>

                <button disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                </button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="bg-transparent px-2 text-white/40">Or continue with</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => handleSocialLogin('google')} className="flex items-center justify-center py-2.5 border border-white/20 rounded-xl hover:bg-white/5 transition-colors text-white">
                        Google
                    </button>
                    <button type="button" onClick={() => handleSocialLogin('facebook')} className="flex items-center justify-center py-2.5 border border-white/20 rounded-xl hover:bg-white/5 transition-colors text-white">
                        Facebook
                    </button>
                </div>

                <p className="text-center text-white/60 text-sm mt-6">
                    Don't have an account? <Link href="/auth/sign-up" className="text-red-400 hover:text-red-300 font-semibold hover:underline">Sign Up</Link>
                </p>
            </form>
        </GlassCard>
    )
}
