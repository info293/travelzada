'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface GeneratedImage {
  url: string | null
  prompt: string
  label: string
}

interface GenerateResult {
  image1: GeneratedImage
  image2: GeneratedImage
}

export default function ImageStudioPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [userPrompt, setUserPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedPrompt, setExpandedPrompt] = useState<'image1' | 'image2' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP, etc.)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB')
      return
    }
    setError(null)
    setResult(null)
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setUploadedPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleGenerate = async () => {
    if (!uploadedPreview) {
      setError('Please upload an image first')
      return
    }
    if (!userPrompt.trim()) {
      setError('Please describe what you want')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedPreview,
          userPrompt: userPrompt.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Generation failed')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (url: string, label: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `travelzada-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setUploadedPreview(null)
    setUserPrompt('')
    setResult(null)
    setError(null)
    setExpandedPrompt(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header />

      <div className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 mb-5 shadow-sm">
              <span className="w-3.5 h-3.5 inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm" />
              <span className="text-sm text-purple-700 font-medium">Powered by Claude + GPT-4o + DALL-E 3</span>
            </div>
            <h1 className="text-4xl md:text-5xl text-gray-900 mb-3 leading-tight">
              AI Image Studio
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Upload any image, tell us what you want — get two AI-generated versions instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Input Panel ── */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-purple-500/5 p-6 flex flex-col gap-5">

              {/* Upload Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  1. Upload your image
                </label>
                {uploadedPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={uploadedPreview}
                      alt="Uploaded"
                      className="w-full max-h-64 object-contain"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-500 rounded-full p-1.5 shadow-md transition-colors"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-gray-600 shadow">
                      {uploadedFile?.name}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/30'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Drop your image here, or <span className="text-purple-600">click to browse</span>
                    </p>
                    <p className="text-xs text-gray-400">JPG, PNG, WEBP — max 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2. Describe what you want
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. Make it look like a luxury resort at golden hour with warm lighting..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent resize-none transition"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Be as descriptive as possible for best results
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !uploadedPreview || !userPrompt.trim()}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating... (~30 seconds)
                  </span>
                ) : (
                  '✦ Generate 2 Images'
                )}
              </button>

              {/* How it works */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 mb-2">How it works</p>
                <div className="space-y-1.5">
                  {[
                    { icon: '🤖', text: 'Claude writes a creative, emotional prompt' },
                    { icon: '🧠', text: 'GPT-4o writes a photorealistic, technical prompt' },
                    { icon: '🎨', text: 'DALL-E 3 generates one image from each prompt' },
                  ].map((step) => (
                    <div key={step.text} className="flex items-start gap-2">
                      <span className="text-sm">{step.icon}</span>
                      <span className="text-xs text-purple-800">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Results Panel ── */}
            <div className="flex flex-col gap-4">
              {isGenerating ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-purple-500/5 p-8 flex flex-col items-center justify-center min-h-[400px] gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                      <div className="w-10 h-10 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 mb-1">Generating your images</p>
                    <p className="text-sm text-gray-500">Claude and GPT-4o are crafting unique prompts,<br />then DALL-E 3 is painting your vision...</p>
                  </div>
                  <div className="flex gap-2">
                    {['Claude', 'GPT-4o', 'DALL-E 3'].map((name, i) => (
                      <div
                        key={name}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 animate-pulse"
                        style={{ animationDelay: `${i * 0.3}s` }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : result ? (
                <>
                  {([
                    { key: 'image1', data: result.image1 },
                    { key: 'image2', data: result.image2 },
                  ] as const).map(({ key, data }) => (
                    <div key={key} className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-purple-500/5 overflow-hidden">
                      {data.url ? (
                        <>
                          <div className="relative">
                            <img
                              src={data.url}
                              alt={data.label}
                              className="w-full object-cover"
                            />
                            <div className="absolute top-3 left-3">
                              <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                                {data.label}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 flex items-center justify-between gap-3">
                            <button
                              onClick={() =>
                                setExpandedPrompt(expandedPrompt === key ? null : key)
                              }
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 transition-colors"
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform ${expandedPrompt === key ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {expandedPrompt === key ? 'Hide prompt' : 'View prompt'}
                            </button>
                            <button
                              onClick={() => handleDownload(data.url!, data.label)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                          </div>
                          {expandedPrompt === key && (
                            <div className="px-4 pb-4">
                              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-xs text-gray-500 font-medium mb-1">Prompt used:</p>
                                <p className="text-xs text-gray-700 leading-relaxed">{data.prompt}</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-sm text-gray-400">Generation failed for {data.label}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleReset}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium py-2 transition-colors"
                  >
                    Start over with a new image
                  </button>
                </>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-purple-500/5 p-8 flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">Your generated images will appear here</p>
                    <p className="text-sm text-gray-400">Upload an image and describe what you want to get started</p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100/60 to-indigo-100/60 border-2 border-dashed border-purple-200 flex items-center justify-center">
                      <span className="text-xs text-purple-400 font-medium">Image 1</span>
                    </div>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100/60 to-pink-100/60 border-2 border-dashed border-indigo-200 flex items-center justify-center">
                      <span className="text-xs text-indigo-400 font-medium">Image 2</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
