import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/onboarding') &&
        request.nextUrl.pathname !== '/'
    ) {
        // no user, potentially redirect to login
        // For now, we will allow public access to validation or implement specific redirects here
        // Example: return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }

    // Specific catch for dashboard/discover protection if needed:
    if (!user && request.nextUrl.pathname.startsWith('/active-user-only')) { // Placeholder
        const url = request.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        return NextResponse.redirect(url)
    }

    return response
}
