export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getClaimArtwork } from '@/lib/voucherServer'
import { renderVoucherPdf } from '@/lib/voucherArtwork'

/** Public PDF download of a personal voucher (front + T&C). */
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const v = await getClaimArtwork(params.code)
    if (!v) return NextResponse.json({ error: 'Voucher code not found.' }, { status: 404 })
    const pdf = await renderVoucherPdf(v)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Travelzada-Voucher-${v.code}.pdf"`,
        'Cache-Control': 'private, max-age=600',
      },
    })
  } catch (error: any) {
    console.error('[Voucher pdf]', error)
    return NextResponse.json({ error: 'Could not create the PDF.' }, { status: 500 })
  }
}
