export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { sendMail, buildDmcSignupEmail } from '@/lib/mailer'
import { HONEYPOT_FIELD, isRateLimited } from '@/lib/spamGuard'
import { agentSignupProblem } from '@/lib/admin/botDetection'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // ── Bot protection ──────────────────────────────────────────────
    // Honeypot: a hidden field humans never fill.
    if (typeof body?.[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD].trim()) {
      return NextResponse.json({ error: 'Registration could not be completed.' }, { status: 400 })
    }
    const nameProblem = agentSignupProblem({ companyName: body?.companyName, contactName: body?.contactName })
    if (nameProblem) {
      return NextResponse.json({ error: nameProblem }, { status: 400 })
    }
    // The sign-up page calls this with { precheck: true } BEFORE it creates the login,
    // so the per-IP limit stops bulk sign-ups before any account is made.
    if (body?.precheck === true) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      if (isRateLimited(`agent-register:${ip}`, 5, 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many registration attempts from your network. Please try again in an hour, or contact us.' }, { status: 429 })
      }
      return NextResponse.json({ success: true, precheck: true })
    }

    const {
      uid,
      email,
      companyName,
      contactName,
      phone,
      gstNumber,
      agencyType,
      desiredSlug,
    } = body

    if (!uid || !email || !companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, email, companyName, contactName, phone' },
        { status: 400 }
      )
    }

    // Generate slug from company name or desired slug
    let baseSlug = slugify(desiredSlug || companyName)
    if (!baseSlug) baseSlug = 'agent'

    // Ensure slug is unique in agents collection
    let finalSlug = baseSlug
    let suffix = 1
    while (true) {
      const agentsRef = collection(db, 'agents')
      const q = query(agentsRef, where('agentSlug', '==', finalSlug))
      const snap = await getDocs(q)
      if (snap.empty) break
      finalSlug = `${baseSlug}-${suffix++}`
    }

    // Create agent document
    const agentData = {
      uid,
      email,
      agentSlug: finalSlug,
      companyName,
      contactName,
      phone,
      gstNumber: gstNumber || '',
      agencyType: agencyType || 'individual',
      logoUrl: '',
      status: 'pending',
      subscriptionPlan: 'basic',
      commissionRate: 10,
      fallbackToTravelzada: false,
      totalPackages: 0,
      totalBookings: 0,
      totalRevenue: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      adminNotes: '',
    }

    await setDoc(doc(db, 'agents', uid), agentData)

    // Update the user document with agent role and slug
    await setDoc(doc(db, 'users', uid), {
      role: 'agent',
      agentSlug: finalSlug,
      agentStatus: 'pending',
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // Send welcome email — fire and forget
    const dmcMail = buildDmcSignupEmail({ contactName, companyName })
    dmcMail.to = email
    sendMail(dmcMail).catch(() => {})

    return NextResponse.json({
      success: true,
      agentSlug: finalSlug,
      message: 'Registration submitted. Awaiting admin approval.',
    })
  } catch (error: any) {
    console.error('[Agent Register API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
