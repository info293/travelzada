export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { claimVoucher, VoucherError } from '@/lib/voucherServer'
import { normalizeCardCode } from '@/lib/vouchers'
import { HONEYPOT_FIELD, isRateLimited, isSpamLead } from '@/lib/spamGuard'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

    if (isRateLimited(`voucher:${ip}`, 5)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 })
    }
    if (isSpamLead({ name: data?.name, destination: data?.destination, message: data?.notes, honeypot: data?.[HONEYPOT_FIELD], elapsedMs: data?.elapsedMs })) {
      console.warn('[Voucher claim] Blocked suspected spam', { ip, name: data?.name })
      return NextResponse.json({ error: 'We could not verify this request. Please call or WhatsApp us.' }, { status: 400 })
    }

    const result = await claimVoucher({
      cardCode: normalizeCardCode(String(data?.cardCode || '')),
      name: String(data?.name || ''),
      phone: String(data?.phone || ''),
      email: String(data?.email || ''),
      destination: data?.destination ? String(data.destination) : undefined,
      travelMonth: data?.travelMonth ? String(data.travelMonth) : undefined,
      notes: data?.notes ? String(data.notes) : undefined,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof VoucherError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[Voucher claim]', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again or WhatsApp us.' }, { status: 500 })
  }
}
