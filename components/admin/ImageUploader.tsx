'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  folder?: string
  required?: boolean
  compact?: boolean
  placeholder?: string
}

export default function ImageUploader({
  value,
  onChange,
  label,
  folder = '/admin',
  required,
  compact = false,
  placeholder = 'Upload Photo'
}: Props) {
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
      if (data.success && data.url) {
        onChange(data.url)
      } else {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onChange(reader.result)
          }
        }
        reader.readAsDataURL(file)
      }
    } catch (e) {
      console.error('Upload failed, attempting base64 fallback:', e)
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result)
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (compact) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            {label}{required && ' *'}
          </label>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {value ? (
          <div className="relative rounded-xl overflow-hidden border border-purple-200 h-14 w-full group bg-gray-50 flex items-center justify-between px-2.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src={value} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gray-200" />
              <span className="text-[11px] font-mono text-gray-600 truncate max-w-[100px] sm:max-w-[140px]">{value}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="p-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-medium transition"
                title="Change Image"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium transition"
                title="Remove Image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-11 border border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-1.5 transition text-purple-700 active:scale-98"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-semibold">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold">{placeholder}</span>
              </>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}{required && ' *'}
        </label>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40 group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <Upload className="w-3.5 h-3.5" /> Change
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600"
            >
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-500 hover:bg-amber-50/30 transition-colors text-gray-400 hover:text-amber-600"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-sm font-medium text-amber-600">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">{placeholder || 'Click to upload image'}</span>
              <span className="text-xs">JPG, PNG, WEBP · Max 10 MB</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
