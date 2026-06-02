import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Get the public origin dynamically from forwarded headers
  const proto = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '') || 'http'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
  const origin = `${proto}://${host}`

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
