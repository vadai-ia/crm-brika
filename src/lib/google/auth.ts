import { google } from 'googleapis'
import * as dal from '@/lib/dal/google-tokens'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

function createOAuth2() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(userId: string): string {
  const client = createOAuth2()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const client = createOAuth2()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return credentials
}

export async function getOAuth2Client(userId: string) {
  const token = await dal.getTokenByUserId(userId)
  if (!token) throw new Error('Not connected to Google')

  const client = createOAuth2()

  // Check if expired
  const expiry = new Date(token.token_expiry)
  if (expiry <= new Date()) {
    try {
      const newCreds = await refreshAccessToken(token.refresh_token)
      const newExpiry = new Date(newCreds.expiry_date ?? Date.now() + 3600 * 1000)
      await dal.updateAccessToken(userId, newCreds.access_token!, newExpiry)
      client.setCredentials({
        access_token: newCreds.access_token,
        refresh_token: token.refresh_token,
      })
    } catch {
      throw new Error('Token refresh failed')
    }
  } else {
    client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    })
  }

  return { client, selectedCalendarId: token.selected_calendar_id || 'primary' }
}
