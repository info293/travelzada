import { NextResponse } from 'next/server'

/**
 * The /api/ai-images routes spend real money on every call, so they require a signed-in user.
 * Verifies the caller's Firebase ID token the same way lib/metaServer.ts does.
 * Returns the user's uid, or a ready-to-send error response.
 */
export async function requireUser(request: Request): Promise<{ uid: string } | NextResponse> {
  const idToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!idToken) return NextResponse.json({ error: 'Please log in to use the decor studio.' }, { status: 401 })
  if (!apiKey) return NextResponse.json({ error: 'Server auth is not configured.' }, { status: 500 })

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const user = (await res.json().catch(() => ({}))).users?.[0]
  if (!res.ok || !user) return NextResponse.json({ error: 'Your session has expired. Please log in again.' }, { status: 401 })
  return { uid: user.localId }
}
