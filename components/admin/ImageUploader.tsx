'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  label: string
  folder?: string
  required?: boolean
}

export default function ImageUploader({ value, onChange, label, folder = '/admin', required }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      fd.append('fileName', `${folder.replace(/\//g, '_')}_${Date.now()}`)
      const res = await fetch('/api/imagekit/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) onChange(data.url)
    } catch (e) { console.error(e) } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}{required && ' *'}
      </label>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40 group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100">
              <Upload className="w-3.5 h-3.5" /> Change
            </button>
            <button type="button" onClick={() => onChange('')}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600">
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors text-gray-400 hover:text-primary">
          {uploading
            ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-medium">Uploading…</span></>
            : <><Upload className="w-5 h-5" /><span className="text-sm font-medium">Click to upload image</span><span className="text-xs">JPG, PNG, WEBP · Max 10 MB</span></>
          }
        </button>
      )}
    </div>
  )
}
