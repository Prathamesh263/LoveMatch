import AuthLayout from '@/components/auth/AuthLayout'
import SignUpForm from '@/components/auth/SignUpForm'

export default function SignUpPage() {
    return (
        <AuthLayout title="Create Account" subtitle="Start your journey to find love">
            <SignUpForm />
        </AuthLayout>
    )
}
