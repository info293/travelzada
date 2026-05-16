export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection, addDoc, query, where, getDocs, getDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { sendMail } from '@/lib/mailer'

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

function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = 'Q-'
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
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
      publicId: generatePublicId(),
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

    // Email DMC — fire and forget
    getDoc(doc(db, 'agents', agentId)).then(agentSnap => {
      if (!agentSnap.exists()) return
      const agent = agentSnap.data()
      const dmcEmail = agent.email
      const dmcName = agent.contactName || agent.companyName || 'there'
      const companyName = agent.companyName || ''
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.travelzada.com'}/dmc-dashboard`
      const pkgLabel = packageTitle || destination || 'a trip'
      const paxLabel = `${Number(adults) || 1} adult${(Number(adults) || 1) !== 1 ? 's' : ''}${Number(kids) > 0 ? `, ${kids} kid${Number(kids) !== 1 ? 's' : ''}` : ''}`

      sendMail({
        to: dmcEmail,
        subject: `New Quotation Request — ${pkgLabel} | ${companyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
            <h2 style="color:#7c3aed;margin-bottom:8px">New Quotation Request 📋</h2>
            <p style="color:#374151">Hi <strong>${dmcName}</strong>,</p>
            <p style="color:#374151">
              <strong>${subAgentName || 'A travel agent'}</strong> has created a new quotation request on your platform.
            </p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0">
              <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#6b7280;width:120px">Customer</td><td><strong>${customerName}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#6b7280">Package</td><td><strong>${pkgLabel}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#6b7280">Passengers</td><td>${paxLabel} · ${Number(rooms) || 1} room${(Number(rooms) || 1) !== 1 ? 's' : ''}</td></tr>
                ${preferredDates ? `<tr><td style="padding:6px 0;color:#6b7280">Travel Dates</td><td>${preferredDates}</td></tr>` : ''}
                <tr><td style="padding:6px 0;color:#6b7280">Agent</td><td>${subAgentName || '—'}</td></tr>
              </table>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="${dashboardUrl}" style="background:#7c3aed;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
                Open Dashboard →
              </a>
            </div>
            <p style="color:#9ca3af;font-size:12px">Go to Quotations in your DMC Dashboard to review and respond.</p>
          </div>
        `,
      }).catch(() => {})
    }).catch(() => {})

    return NextResponse.json({ success: true, quotationId: ref.id })
  } catch (error: any) {
    console.error('[Quotations POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
