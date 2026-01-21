'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
    return (
        <Sonner
            position="top-center"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-white/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:border-white/20 group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                    error: 'group-[.toaster]:text-red-500',
                    success: 'group-[.toaster]:text-pink-500',
                },
            }}
        />
    )
}
