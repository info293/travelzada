'use client'

/**
 * fetch() for admin-only API routes: attaches the logged-in user's Firebase ID token so the server can
 * check they are staff (see lib/admin/serverAuth.ts). Throws an Error with a friendly message on failure.
 */
import { auth } from '@/lib/firebase'

export async function staffFetch<T = any>(url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Please log in again.')
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    ...init,
    headers: {
      ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`)
  return data as T
}
