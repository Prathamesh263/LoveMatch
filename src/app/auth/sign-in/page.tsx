import AuthLayout from '@/components/auth/AuthLayout'
import SignInForm from '@/components/auth/SignInForm'
import { Suspense } from 'react'

export default function SignInPage() {
    return (
        <AuthLayout title="Welcome Back" subtitle="Sign in to continue your love story">
            <Suspense fallback={<div>Loading...</div>}>
                <SignInForm />
            </Suspense>
        </AuthLayout>
    )
}
