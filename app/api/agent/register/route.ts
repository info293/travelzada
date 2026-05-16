export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore'
import { sendMail } from '@/lib/mailer'

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
    sendMail({
      to: email,
      subject: `Application Received – ${companyName} | Travelzada`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px">
          <h2 style="color:#7c3aed;margin-bottom:8px">Application Received 🎉</h2>
          <p style="color:#374151">Hi <strong>${contactName}</strong>,</p>
          <p style="color:#374151">
            Thank you for registering <strong>${companyName}</strong> as a Travelzada Partner (DMC).
            Our team is reviewing your application and will get back to you within 1–2 business days.
          </p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0">
            <p style="color:#6b7280;font-size:14px;margin:0"><strong>What happens next?</strong></p>
            <ul style="color:#6b7280;font-size:14px;margin-top:8px;padding-left:20px">
              <li>Travelzada team reviews your application</li>
              <li>You'll receive an approval email with your dashboard access</li>
              <li>Start adding packages and inviting your travel agents</li>
            </ul>
          </div>
          <p style="color:#9ca3af;font-size:12px">Questions? Reply to this email or contact support@travelzada.com</p>
        </div>
      `,
    }).catch(() => {})

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
