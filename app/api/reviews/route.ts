import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

// POST /api/reviews — Submit a new review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { packageId, packageName, destinationName, name, rating, review } = body

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }
    if (!review || review.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters.' }, { status: 400 })
    }
    if (!destinationName) {
      return NextResponse.json({ error: 'Destination is required.' }, { status: 400 })
    }

    const reviewData = {
      packageId: packageId || null,
      packageName: packageName || null,
      destinationName: destinationName.trim(),
      name: name.trim(),
      rating: Number(rating),
      review: review.trim(),
      approved: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'reviews'), reviewData)

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 })
  } catch (error) {
    console.error('Error submitting review:', error)
    return NextResponse.json({ error: 'Failed to submit review. Please try again.' }, { status: 500 })
  }
}

// GET /api/reviews?destinationName=Bali or ?packageId=XYZ
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const destinationName = searchParams.get('destinationName')
    const packageId = searchParams.get('packageId')

    let q

    if (packageId) {
      q = query(
        collection(db, 'reviews'),
        where('packageId', '==', packageId),
        where('approved', '==', true),
        orderBy('createdAt', 'desc')
      )
    } else if (destinationName) {
      q = query(
        collection(db, 'reviews'),
        where('destinationName', '==', destinationName),
        where('approved', '==', true),
        orderBy('createdAt', 'desc')
      )
    } else {
      // Return all approved reviews
      q = query(
        collection(db, 'reviews'),
        where('approved', '==', true),
        orderBy('createdAt', 'desc')
      )
    }

    const snapshot = await getDocs(q)
    const reviews: any[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      reviews.push({
        id: doc.id,
        packageId: data.packageId,
        packageName: data.packageName,
        destinationName: data.destinationName,
        name: data.name,
        rating: data.rating,
        review: data.review,
        approved: data.approved,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      })
    })

    return NextResponse.json({ reviews }, { status: 200 })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ reviews: [] }, { status: 200 })
  }
}
