export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { getClaimArtwork } from '@/lib/voucherServer'
import { renderVoucherImage } from '@/lib/voucherArtwork'

/** Public PNG of a personal voucher (?side=front|back). Used as the WhatsApp image header. */
export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const v = await getClaimArtwork(params.code)
    if (!v) return NextResponse.json({ error: 'Voucher code not found.' }, { status: 404 })
    const side = new URL(req.url).searchParams.get('side') === 'back' ? 'back' : 'front'
    const png = await renderVoucherImage(v, side)
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    })
  } catch (error: any) {
    console.error('[Voucher image]', error)
    return NextResponse.json({ error: 'Could not render voucher.' }, { status: 500 })
  }
}
