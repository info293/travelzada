import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

async function writeNotification(payload: {
  agentId: string
  subAgentId: string
  subAgentName: string
  type: string
  referenceId: string
  referenceTitle: string
  customerName: string
  preview: string
}) {
  try {
    await addDoc(collection(db, 'agent_notifications'), {
      ...payload,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  } catch { /* fire-and-forget */ }
}

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

    const quotData = snap.data()!

    if (action === 'message') {
      // Add a message to the messages array
      const { senderId, senderRole, senderName, text } = rest
      if (!senderId || !text) {
        return NextResponse.json({ error: 'senderId and text are required' }, { status: 400 })
      }

      const message = {
        id: uuidv4(),
        senderId,
        senderRole,
        senderName: senderName || '',
        text,
        timestamp: new Date().toISOString(),
      }

      await updateDoc(ref, {
        messages: arrayUnion(message),
        status: quotData.status === 'pending' ? 'in_discussion' : quotData.status,
        updatedAt: serverTimestamp(),
      })

      // Notify DMC when a travel agent sends a message
      if (senderRole !== 'dmc' && quotData.agentId) {
        await writeNotification({
          agentId: quotData.agentId,
          subAgentId: senderId,
          subAgentName: senderName || 'Travel Agent',
          type: 'quotation_message',
          referenceId: params.id,
          referenceTitle: quotData.packageTitle || quotData.destination || 'Quotation',
          customerName: quotData.customerName || '',
          preview: text.length > 100 ? text.slice(0, 97) + '…' : text,
        })
      }

      return NextResponse.json({ success: true, message })
    }

    // Generic field update (status, quotedPrice, agentNotes, subAgentNotes, etc.)
    const updates: Record<string, any> = { updatedAt: serverTimestamp() }
    const allowed = ['status', 'quotedPrice', 'agentNotes', 'subAgentNotes', 'customPackageData']
    allowed.forEach(f => { if (rest[f] !== undefined) updates[f] = rest[f] })

    // Notify DMC when a travel agent changes status or price
    const { requesterId, requesterRole, requesterName } = rest
    if (requesterRole !== 'dmc' && requesterId && quotData.agentId) {
      if (updates.status) {
        const statusLabels: Record<string, string> = {
          accepted: 'accepted the quotation',
          rejected: 'rejected the quotation',
          in_discussion: 'started a discussion',
        }
        await writeNotification({
          agentId: quotData.agentId,
          subAgentId: requesterId,
          subAgentName: requesterName || 'Travel Agent',
          type: 'quotation_status',
          referenceId: params.id,
          referenceTitle: quotData.packageTitle || quotData.destination || 'Quotation',
          customerName: quotData.customerName || '',
          preview: statusLabels[updates.status] || `changed status to ${updates.status}`,
        })
      }
      if (updates.quotedPrice) {
        await writeNotification({
          agentId: quotData.agentId,
          subAgentId: requesterId,
          subAgentName: requesterName || 'Travel Agent',
          type: 'price_update',
          referenceId: params.id,
          referenceTitle: quotData.packageTitle || quotData.destination || 'Quotation',
          customerName: quotData.customerName || '',
          preview: `Proposed price ₹${Number(updates.quotedPrice).toLocaleString('en-IN')} for ${quotData.customerName}`,
        })
      }
    }

    await updateDoc(ref, updates)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Quotation PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
