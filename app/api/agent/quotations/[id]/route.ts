import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

// GET a single quotation with all messages
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const snap = await getDoc(doc(db, 'quotations', params.id))
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, quotation: { id: snap.id, ...snap.data() } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH — update status/price OR add a message
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { action, ...rest } = body

    const ref = doc(db, 'quotations', params.id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    if (action === 'message') {
      // Add a message to the messages array
      const { senderId, senderRole, senderName, text } = rest
      if (!senderId || !text) {
        return NextResponse.json({ error: 'senderId and text are required' }, { status: 400 })
      }

      const message = {
        id: uuidv4(),
        senderId,
        senderRole,   // 'dmc' | 'travel_agent'
        senderName: senderName || '',
        text,
        timestamp: new Date().toISOString(),
      }

      await updateDoc(ref, {
        messages: arrayUnion(message),
        status: snap.data()?.status === 'pending' ? 'in_discussion' : snap.data()?.status,
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({ success: true, message })
    }

    // Generic field update (status, quotedPrice, agentNotes, subAgentNotes, etc.)
    const updates: Record<string, any> = { updatedAt: serverTimestamp() }
    const allowed = ['status', 'quotedPrice', 'agentNotes', 'subAgentNotes', 'customPackageData']
    allowed.forEach(f => { if (rest[f] !== undefined) updates[f] = rest[f] })

    await updateDoc(ref, updates)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Quotation PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
