export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cardUnavailableReason, getCard } from '@/lib/voucherServer'
import { normalizeCardCode } from '@/lib/vouchers'

/** Public: what the QR landing page needs to show for a printed voucher card. */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const card = await getCard(normalizeCardCode(params.code))
    if (!card) return NextResponse.json({ error: cardUnavailableReason(null) }, { status: 404 })
    return NextResponse.json({
      card: {
        code: card.code,
        type: card.type,
        recipientName: card.recipientName || '',
        validUntil: card.validUntil,
        travelUntil: card.travelUntil,
      },
      unavailableReason: cardUnavailableReason(card),
    })
  } catch (error: any) {
    console.error('[Voucher card]', error)
    return NextResponse.json({ error: 'Could not load this voucher. Please try again.' }, { status: 500 })
  }
}
