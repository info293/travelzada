export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { VOUCHER_CLAIMS_COLLECTION, isClaimExpired, normalizeCardCode, type VoucherClaim } from '@/lib/vouchers'

/** Public: a customer's personal voucher (the code itself is the secret). Contact details are masked. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const snap = await getDoc(doc(db, VOUCHER_CLAIMS_COLLECTION, normalizeCardCode(params.code)))
    if (!snap.exists()) return NextResponse.json({ error: 'Voucher code not found.' }, { status: 404 })
    const c = snap.data() as VoucherClaim
    return NextResponse.json({
      voucher: {
        code: c.code,
        cardCode: c.cardCode,
        type: c.type,
        amount: c.amount,
        minSpend: c.minSpend,
        name: c.name,
        phoneMasked: `+91 ••••• ${c.phone.slice(-4)}`,
        status: isClaimExpired(c) ? 'expired' : c.status,
        bookBy: c.bookBy,
        travelBy: c.travelBy,
        createdAt: c.createdAt,
      },
    })
  } catch (error: any) {
    console.error('[Voucher code]', error)
    return NextResponse.json({ error: 'Could not load this voucher.' }, { status: 500 })
  }
}
