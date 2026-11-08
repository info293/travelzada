/**
 * Server-side check that a request comes from a logged-in Travelzada staff member.
 *
 * There is no Firebase Admin SDK in this project, so the ID token is verified with Google's Identity Toolkit
 * REST endpoint (accounts:lookup), which only accepts valid, unexpired tokens for this project. The user's
 * role / permissions are then read from `users/{uid}` — same source as the admin UI.
 *
 * Client side: send `Authorization: Bearer <await auth.currentUser.getIdToken()>` (see `staffFetch`).
 */
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E'

export interface StaffUser {
  uid: string
  email: string
  isAdmin: boolean
  permissions: string[]
}

export class StaffAuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message)
  }
}

const cache = new Map<string, { user: StaffUser; until: number }>()

async function lookup(idToken: string): Promise<{ uid: string; email: string } | null> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  const u = data?.users?.[0]
  return u?.localId ? { uid: u.localId, email: String(u.email || '') } : null
}

/**
 * Throws StaffAuthError unless the caller is an admin or has one of `anyOf` permissions.
 * Results are cached for 5 minutes per token.
 */
export async function requireStaff(request: Request, anyOf: string[] = []): Promise<StaffUser> {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new StaffAuthError('Please log in to the admin first.', 401)

  let user = cache.get(token)?.until! > Date.now() ? cache.get(token)!.user : null
  if (!user) {
    const who = await lookup(token)
    if (!who) throw new StaffAuthError('Your login has expired — please refresh the page.', 401)
    const snap = await getDoc(doc(db, 'users', who.uid))
    const data = snap.exists() ? (snap.data() as any) : {}
    user = { uid: who.uid, email: who.email, isAdmin: data.role === 'admin', permissions: Array.isArray(data.permissions) ? data.permissions : [] }
    cache.set(token, { user, until: Date.now() + 5 * 60 * 1000 })
    if (cache.size > 500) cache.clear()
  }
  if (!user.isAdmin && anyOf.length && !anyOf.some((p) => user!.permissions.includes(p))) {
    throw new StaffAuthError("You don't have access to this tool.", 403)
  }
  return user
}

/** Turn a thrown error into a JSON response (use in route catch blocks) */
export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof StaffAuthError) return Response.json({ error: err.message }, { status: err.status })
  return null
}
