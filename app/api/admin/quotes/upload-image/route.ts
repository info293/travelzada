export const dynamic = 'force-dynamic'

/**
 * POST multipart { file, folder?, fileName? } → { url, fileId }
 * Staff-only image upload for the quote builder (cover, option mosaics, rooms, day photos, flight screenshots).
 * Files land in ImageKit under /quotes/<quoteRef>. The client downsizes images before upload (builder/uploadImage.ts).
 */
import { NextResponse } from 'next/server'
import { authErrorResponse, requireStaff } from '@/lib/admin/serverAuth'

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'
const MAX_BYTES = 12 * 1024 * 1024

export async function POST(request: Request) {
  try {
    await requireStaff(request, ['create-itinerary', 'leads', 'customer-records'])
  } catch (err) {
    const res = authErrorResponse(err)
    if (res) return res
    throw err
  }

  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey) return NextResponse.json({ error: 'Image uploads are not configured (IMAGEKIT_PRIVATE_KEY).' }, { status: 500 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!String(file.type || '').startsWith('image/')) return NextResponse.json({ error: 'Only images can be uploaded.' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large (max 12 MB).' }, { status: 413 })

    // Keep everything inside /quotes; allow letters, numbers, dash and underscore in the sub folder
    const rawFolder = String(form.get('folder') || '/quotes/misc')
    const sub = rawFolder.replace(/^\/?quotes\/?/, '').replace(/[^A-Za-z0-9_\-/]/g, '').replace(/\/{2,}/g, '/').replace(/^\/|\/$/g, '').slice(0, 80)
    const folder = `/quotes/${sub || 'misc'}`
    const fileName = String(form.get('fileName') || `quote_${Date.now()}`).replace(/[^A-Za-z0-9_.\-]/g, '_').slice(0, 80)

    const body = new URLSearchParams()
    body.set('file', Buffer.from(await file.arrayBuffer()).toString('base64'))
    body.set('fileName', fileName)
    body.set('folder', folder)
    body.set('useUniqueFileName', 'true')

    const res = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${privateKey}:`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: (data as any)?.message || 'Upload failed' }, { status: res.status })
    return NextResponse.json({ success: true, url: (data as any).url, fileId: (data as any).fileId })
  } catch (error: any) {
    console.error('[quotes/upload-image]', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
