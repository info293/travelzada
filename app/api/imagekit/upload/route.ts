import { NextResponse } from 'next/server'

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload'
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || '/packages'
    const fileName = (formData.get('fileName') as string) || `pkg_${Date.now()}`

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const body = new URLSearchParams()
    body.set('file', base64)
    body.set('fileName', fileName)
    body.set('folder', folder)
    body.set('useUniqueFileName', 'true')

    const authHeader = 'Basic ' + Buffer.from(`${PRIVATE_KEY}:`).toString('base64')

    const res = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Upload failed' }, { status: res.status })
    }

    return NextResponse.json({ success: true, url: data.url, fileId: data.fileId })
  } catch (error: any) {
    console.error('[ImageKit Upload]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
