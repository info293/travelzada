export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { requireLeadsAccess } from '@/lib/metaServer'
import { VOUCHER_CLAIMS_COLLECTION, type VoucherClaim } from '@/lib/vouchers'
import { getVoucherTemplateStatus, notifyClaim, VOUCHER_TEMPLATE } from '@/lib/voucherServer'
import { isGetGabsConfigured } from '@/lib/getgabs'

/** GetGabs setup + whether the voucher WhatsApp template exists there */
export async function GET(req: NextRequest) {
  const denied = await requireLeadsAccess(req)
  if (denied) return denied
  if (!isGetGabsConfigured()) return NextResponse.json({ template: VOUCHER_TEMPLATE, configured: false })
  try {
    return NextResponse.json({ template: VOUCHER_TEMPLATE, configured: true, found: await getVoucherTemplateStatus() })
  } catch (error: any) {
    return NextResponse.json({ template: VOUCHER_TEMPLATE, configured: true, error: error.message }, { status: 500 })
  }
}

/** Actions: resend (re-send code to customer by email + WhatsApp) */
export async function POST(req: NextRequest) {
  const denied = await requireLeadsAccess(req)
  if (denied) return denied
  try {
    const { action, code } = await req.json()
    if (action === 'resend') {
      const snap = await getDoc(doc(db, VOUCHER_CLAIMS_COLLECTION, String(code || '')))
      if (!snap.exists()) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
      return NextResponse.json({ notifications: await notifyClaim(snap.data() as VoucherClaim, { skipTeam: true }) })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Admin vouchers]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
