export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { sendMail, buildOtpEmail } from '@/lib/mailer'
import { generateOtp, hashOtp } from '@/lib/otpHash'

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check if user already exists in Firestore users collection
    if (db) {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', normalizedEmail))
      const querySnap = await getDocs(q)
      if (!querySnap.empty) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 400 }
        )
      }
    }

    // Generate 6-digit OTP (cryptographically random)
    const otp = generateOtp()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes validity

    // Store only a keyed hash — the collection is readable with the public web config
    if (db) {
      await setDoc(doc(db, 'email_otps', normalizedEmail), {
        email: normalizedEmail,
        otpHash: hashOtp(normalizedEmail, otp),
        expiresAt,
        createdAt: Date.now(),
        attempts: 0,
      })
    }

    // Never log the code itself
    console.log(`[OTP SEND] Verification code sent to ${normalizedEmail}`)

    // Send email via mailer
    const mail = buildOtpEmail({ name: name ? name.trim() : undefined, otp })
    mail.to = normalizedEmail
    await sendMail(mail)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email address.',
    })
  } catch (error: any) {
    console.error('[send-otp] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
