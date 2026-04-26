import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection, addDoc, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'

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

// GET /api/agent/quotations?agentId=X  or  ?subAgentId=X
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const subAgentId = searchParams.get('subAgentId')

    if (!agentId && !subAgentId) {
      return NextResponse.json({ error: 'agentId or subAgentId is required' }, { status: 400 })
    }

    const field = agentId ? 'agentId' : 'subAgentId'
    const value = (agentId || subAgentId) as string

    const snap = await getDocs(
      query(collection(db, 'quotations'), where(field, '==', value))
    )

    const quotations = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    quotations.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

    return NextResponse.json({ success: true, quotations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/agent/quotations — travel agent creates a quotation request
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      agentId, agentSlug,
      subAgentId, subAgentName,
      packageId, packageTitle, destination,
      customerName, customerEmail, customerPhone,
      preferredDates, groupSize, adults, kids, rooms,
      specialRequests, wizardData, selectedPackage,
    } = body

    if (!agentId || !subAgentId || !customerName) {
      return NextResponse.json(
        { error: 'agentId, subAgentId, and customerName are required' },
        { status: 400 }
      )
    }

    const quotation = {
      agentId,
      agentSlug: agentSlug || '',
      subAgentId,
      subAgentName: subAgentName || '',
      packageId: packageId || '',
      packageTitle: packageTitle || destination || 'Custom Request',
      destination: destination || '',
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      preferredDates: preferredDates || '',
      groupSize: Number(groupSize) || 1,
      adults: Number(adults) || 1,
      kids: Number(kids) || 0,
      rooms: Number(rooms) || 1,
      specialRequests: specialRequests || '',
      wizardData: wizardData || null,
      selectedPackage: selectedPackage || null,
      status: 'pending',       // pending | in_discussion | quoted | accepted | rejected | converted
      quotedPrice: null,
      agentNotes: '',
      subAgentNotes: '',
      messages: [],             // {senderId, senderRole, senderName, text, timestamp}
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const ref = await addDoc(collection(db, 'quotations'), quotation)

    // Notify DMC of new quotation request from travel agent
    await writeNotification({
      agentId,
      subAgentId,
      subAgentName: subAgentName || 'Travel Agent',
      type: 'new_quotation',
      referenceId: ref.id,
      referenceTitle: packageTitle || destination || 'Custom Request',
      customerName: customerName || '',
      preview: `New quotation request for ${packageTitle || destination || 'a trip'} · ${Number(groupSize) || 1} pax${preferredDates ? ` · ${preferredDates}` : ''}`,
    })

    return NextResponse.json({ success: true, quotationId: ref.id })
  } catch (error: any) {
    console.error('[Quotations POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
