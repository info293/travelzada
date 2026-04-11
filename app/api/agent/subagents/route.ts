import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection, query, where, getDocs,
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore'

// GET - list all sub-agents for an agent
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const q = query(collection(db, 'sub_agents'), where('agentId', '==', agentId))
    const snap = await getDocs(q)
    const subAgents = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Sort by createdAt client-side
    subAgents.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

    return NextResponse.json({ success: true, subAgents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - create a sub-agent using Firebase Auth REST API
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agentId, name, email, password, phone } = body

    if (!agentId || !name || !email || !password) {
      return NextResponse.json(
        { error: 'agentId, name, email, and password are required' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // Verify parent agent
    const agentSnap = await getDoc(doc(db, 'agents', agentId))
    if (!agentSnap.exists()) {
      return NextResponse.json({ error: 'Parent agent not found' }, { status: 404 })
    }
    const agentData = agentSnap.data()

    // Create Firebase Auth user via REST API (no Admin SDK needed)
    const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E'
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    )

    const authData = await authRes.json()

    if (!authRes.ok || authData.error) {
      const msg = authData.error?.message || 'Failed to create account'
      if (msg === 'EMAIL_EXISTS') {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const uid: string = authData.localId

    // Create users/{uid} document
    await setDoc(doc(db, 'users', uid), {
      email,
      displayName: name,
      role: 'subagent',
      agentId,
      parentAgentSlug: agentData.agentSlug,
      agentStatus: 'active',
      isActive: true,
      createdAt: serverTimestamp(),
      permissions: [],
    })

    // Create sub_agents/{uid} document
    const subAgentDoc = {
      agentId,
      agentSlug: agentData.agentSlug,
      name,
      email,
      phone: phone || '',
      isActive: true,
      totalBookings: 0,
      totalRevenue: 0,
      createdAt: serverTimestamp(),
      createdBy: agentId,
    }
    await setDoc(doc(db, 'sub_agents', uid), subAgentDoc)

    return NextResponse.json({ success: true, subAgent: { id: uid, ...subAgentDoc } })
  } catch (error: any) {
    console.error('[SubAgent POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create sub-agent' }, { status: 500 })
  }
}
