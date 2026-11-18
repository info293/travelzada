export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { requireStaff, authErrorResponse } from '@/lib/admin/serverAuth'

/** Admins only: these routes read and change B2B agent accounts */
async function adminOnly(request: Request): Promise<Response | null> {
  try {
    const staff = await requireStaff(request)
    return staff.isAdmin ? null : Response.json({ error: 'Admins only.' }, { status: 403 })
  } catch (err) {
    return authErrorResponse(err) || Response.json({ error: 'Not allowed' }, { status: 401 })
  }
}

// GET - fetch a single agent
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = await adminOnly(request)
  if (denied) return denied
  try {
    const snap = await getDoc(doc(db, 'agents', params.id))
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, agent: { id: snap.id, ...snap.data() } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - approve, suspend, reject, update commission, add notes
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const denied = await adminOnly(request)
  if (denied) return denied
  try {
    const body = await request.json()
    const { action, adminNotes, commissionRate, rejectionReason, approvedBy, subscriptionPlan } = body

    const agentRef = doc(db, 'agents', params.id)
    const snap = await getDoc(agentRef)
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agentData = snap.data()
    const updates: Record<string, any> = { updatedAt: serverTimestamp() }

    if (action === 'approve') {
      updates.status = 'active'
      updates.approvedAt = serverTimestamp()
      updates.approvedBy = approvedBy || 'admin'
      // Also update the user's agentStatus
      await updateDoc(doc(db, 'users', params.id), {
        agentStatus: 'active',
        updatedAt: serverTimestamp(),
      })
    } else if (action === 'suspend') {
      updates.status = 'suspended'
      await updateDoc(doc(db, 'users', params.id), {
        agentStatus: 'suspended',
        updatedAt: serverTimestamp(),
      })
    } else if (action === 'reject') {
      updates.status = 'rejected'
      updates.rejectionReason = rejectionReason || ''
      await updateDoc(doc(db, 'users', params.id), {
        agentStatus: 'rejected',
        updatedAt: serverTimestamp(),
      })
    } else if (action === 'reactivate') {
      updates.status = 'active'
      await updateDoc(doc(db, 'users', params.id), {
        agentStatus: 'active',
        updatedAt: serverTimestamp(),
      })
    }

    if (adminNotes !== undefined) updates.adminNotes = adminNotes
    if (commissionRate !== undefined) updates.commissionRate = Number(commissionRate)
    if (subscriptionPlan !== undefined) updates.subscriptionPlan = subscriptionPlan
    if (body.fallbackToTravelzada !== undefined) updates.fallbackToTravelzada = Boolean(body.fallbackToTravelzada)

    await updateDoc(agentRef, updates)

    return NextResponse.json({ success: true, action: action || 'updated' })
  } catch (error: any) {
    console.error('[Admin Agents PATCH] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
