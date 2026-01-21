'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { GlassCard } from '@/components/ui/GlassCard'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { SplitDateInput } from '@/components/ui/SplitDateInput'

export default function SignUpForm() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [gender, setGender] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [dob, setDob] = useState('')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      setAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const removeAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatar(null)
    setAvatarPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string

    try {
      // Frontend guards
      if (!gender || !lookingFor || !dob) {
        toast.error('Please fill in all fields')
        return
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        toast.error('Invalid date format')
        return
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }

      // 1. Sign up
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: firstName,
              dob,
              gender,
              looking_for: lookingFor
            }
          }
        })

      if (authError || !authData.user) {
        throw authError || new Error('User not created')
      }

      // 2. Upload avatar (optional)
      if (avatar) {
        const fileExt = avatar.name.split('.').pop()
        const filePath = `${authData.user.id}/avatar.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatar, { upsert: true })

        if (!uploadError) {
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

          await supabase
            .from('profiles')
            .update({ avatar_url: data.publicUrl })
            .eq('id', authData.user.id)
        } else {
          toast.warning('Account created, but avatar upload failed.')
        }
      }

      toast.success('Account created successfully!')
      router.push('/auth/sign-in?registered=true')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard className="p-0 border-none bg-black/40 md:min-w-[900px]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row min-h-[600px]"
      >
        {/* LEFT */}
        <div className="flex-1 p-8 space-y-6 border-r border-white/10">
          <h2 className="text-2xl font-bold text-white">Create account</h2>

          <input
            name="firstName"
            required
            placeholder="First Name"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"
          />

          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"
          />

          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white"
          />

          <SplitDateInput onChange={setDob} required />

          <ButtonGroup
            label="Gender"
            value={gender}
            onChange={setGender}
            options={[
              { label: 'Man', value: 'male' },
              { label: 'Woman', value: 'female' },
              { label: 'More >', value: 'other' }
            ]}
          />

          <ButtonGroup
            label="Interested in"
            value={lookingFor}
            onChange={setLookingFor}
            options={[
              { label: 'Men', value: 'male' },
              { label: 'Women', value: 'female' },
              { label: 'Everyone', value: 'everyone' }
            ]}
          />
        </div>

        {/* RIGHT */}
        <div className="flex-1 p-8 bg-black/20">
          <h3 className="text-sm font-semibold text-white mb-4">
            Profile photo
          </h3>

          <div className="relative rounded-xl border-2 border-dashed border-white/20 bg-white/5 overflow-hidden aspect-square max-w-sm mx-auto">
            {avatarPreview ? (
              <>
                <img
                  src={avatarPreview}
                  className="w-full h-full object-cover"
                  alt="Preview"
                />
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                >
                  <X size={16} className="text-white" />
                </button>
              </>
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-white/40">
                <Plus size={28} />
                <span className="text-xs mt-2">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <button
            disabled={loading}
            className="w-full mt-10 bg-white text-black font-bold py-3.5 rounded-full disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              'Continue'
            )}
          </button>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-red-400 font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </GlassCard>
  )
}
