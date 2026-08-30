export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore'

export async function GET(req: NextRequest, { params }: { params: { vendorKey: string } }) {
  try {
    const { vendorKey } = params

    if (!vendorKey) {
      return NextResponse.json({ success: false, error: 'Vendor key is required' }, { status: 400 })
    }

    const vendorsRef = collection(db, 'vendors')
    const q = query(vendorsRef, where('vendorKey', '==', vendorKey))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 })
    }

    const vendorDoc = querySnapshot.docs[0]
    const vendorData = { id: vendorDoc.id, ...vendorDoc.data() }

    // Increment scan count asynchronously
    try {
      await updateDoc(doc(db, 'vendors', vendorDoc.id), {
        totalScans: increment(1)
      })
    } catch (e) {
      console.warn('Failed to increment vendor scan count:', e)
    }

    return NextResponse.json({ success: true, vendor: vendorData })
  } catch (error: any) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
