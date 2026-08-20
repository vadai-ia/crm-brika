import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/google/auth'
import { saveTokens } from '@/lib/dal/google-tokens'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get('code')
  const state = params.get('state') // userId
  const errorParam = params.get('error')

  if (errorParam || !code || !state) {
    return NextResponse.redirect(new URL('/dashboard/calendario?error=auth_failed', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    // Get calendar email
    let email: string | null = null
    try {
      const client = new google.auth.OAuth2()
      client.setCredentials({ access_token: tokens.access_token })
      const cal = google.calendar({ version: 'v3', auth: client })
      const primary = await cal.calendarList.get({ calendarId: 'primary' })
      email = primary.data.id ?? null
    } catch {
      // email is optional
    }

    const expiry = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000)
    await saveTokens(state, tokens.access_token!, tokens.refresh_token!, expiry, email)

    return NextResponse.redirect(new URL('/dashboard/calendario?setup=true', request.url))
  } catch (err) {
    console.error('Google callback error:', err)
    return NextResponse.redirect(new URL('/dashboard/calendario?error=token_failed', request.url))
  }
}
