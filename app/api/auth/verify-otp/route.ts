export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const submittedOtp = otp.trim()

    if (!db) {
      return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 })
    }

    const otpDocRef = doc(db, 'email_otps', normalizedEmail)
    const otpDocSnap = await getDoc(otpDocRef)

    if (!otpDocSnap.exists()) {
      return NextResponse.json(
        { error: 'No verification code found for this email. Please request a new code.' },
        { status: 400 }
      )
    }

    const data = otpDocSnap.data()

    // Check expiration
    if (Date.now() > data.expiresAt) {
      await deleteDoc(otpDocRef)
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      )
    }

    // Check max attempts
    if (data.attempts >= 5) {
      await deleteDoc(otpDocRef)
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new verification code.' },
        { status: 400 }
      )
    }

    // Verify OTP code
    if (data.otp !== submittedOtp) {
      await updateDoc(otpDocRef, {
        attempts: (data.attempts || 0) + 1,
      })
      return NextResponse.json(
        { error: 'Invalid verification code. Please check your email and try again.' },
        { status: 400 }
      )
    }

    // Success! Delete OTP record after successful verification
    await deleteDoc(otpDocRef)

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully.',
    })
  } catch (error: any) {
    console.error('[verify-otp] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify code. Please try again.' },
      { status: 500 }
    )
  }
}
