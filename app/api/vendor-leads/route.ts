export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vendorId, vendorKey, vendorName, userName, userPhone, userEmail, rewardTitle, rewardCode } = body

    if (!userName || !userPhone || !rewardTitle) {
      return NextResponse.json({ success: false, error: 'Name, phone and reward details are required' }, { status: 400 })
    }

    // Generate unique claim voucher code e.g. CLM-849201
    const randomDigits = Math.floor(100000 + Math.random() * 900000)
    const claimCode = `CLM-${randomDigits}`

    const leadData = {
      vendorId: vendorId || '',
      vendorKey: vendorKey || '',
      vendorName: vendorName || 'Travelzada Vendor',
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      userEmail: (userEmail || '').trim(),
      rewardTitle: rewardTitle.trim(),
      rewardCode: rewardCode || '',
      claimCode,
      status: 'new',
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'vendor_leads'), leadData)

    // Increment vendor's total claims counter
    if (vendorId) {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          totalClaims: increment(1)
        })
      } catch (e) {
        console.warn('Failed to increment vendor totalClaims:', e)
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      claimCode,
      lead: { id: docRef.id, ...leadData }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error submitting vendor lead claim:', error)
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
