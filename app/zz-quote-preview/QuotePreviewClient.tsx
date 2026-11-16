'use client'

import { useEffect, useMemo, useState } from 'react'
import ProposalDocument from '@/components/admin/proposal/ProposalDocument'
import { sampleKashmir, sampleMaldives, sampleSingle } from '@/components/admin/proposal/sampleData'
import { PAGE_H, PAGE_W } from '@/components/admin/proposal/types'

export default function QuotePreviewClient({ page, sample, pdfCheck = false }: { page: number; sample: string; pdfCheck?: boolean }) {
  const data = useMemo(() => (sample === 'maldives' ? sampleMaldives() : sample === 'single' ? sampleSingle() : sampleKashmir()), [sample])
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState('')
  // Client-only render: sample dates/times are formatted with the browser locale (avoids hydration mismatches)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const downloadPdf = async (download = true) => {
    setBusy('Starting…')
    try {
      const { renderProposalPdf, downloadBlob } = await import('@/components/admin/proposal/renderProposalPdf')
      const blob = await renderProposalPdf(data, { onProgress: (m) => setBusy(m) })
      if (download) downloadBlob(blob, `zz-quote-${sample}.pdf`)
      if (!download) {
        // QA: how many photos could be inlined (the rest render as cream placeholders)
        const { inlinePhoto } = await import('@/components/admin/proposal/renderProposalPdf')
        const { mapProposalImages } = await import('@/components/admin/proposal/images')
        let ok = 0
        let all = 0
        await mapProposalImages(data, async (url, maxW) => { all++; const r = await inlinePhoto(url, maxW, 0.82); if (r) ok++; return r })
        setBusy(`Done · ${(blob.size / 1024 / 1024).toFixed(2)} MB · photos inlined ${ok}/${all}`)
        return
      }
      setBusy(`Done · ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
    } catch (e) {
      setBusy(`Failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ?pdf=1 → build the real PDF once (QA: size / errors show in the toolbar)
  useEffect(() => {
    if (mounted && pdfCheck) downloadPdf(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, pdfCheck])

  if (!mounted) return null

  // ?p=n → just that page at 1:1 on white (screenshot mode)
  if (page > 0) {
    return (
      <div style={{ background: '#ffffff', width: PAGE_W, minHeight: PAGE_H }} data-pages={count}>
        <ProposalDocument data={data} onReady={setCount} pageWrapper={(p, i) => (i === page - 1 ? p : null)} />
      </div>
    )
  }

  return (
    <div style={{ background: '#d9d4cf', minHeight: '100vh', padding: '24px 0' }}>
      <div style={{ width: PAGE_W, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'system-ui', fontSize: 13, color: '#3D2B1F' }}>
        <span>
          Sample: <b>{sample}</b> · {count} pages ·{' '}
          <a href="?sample=kashmir">kashmir</a> · <a href="?sample=maldives">maldives</a> · <a href="?sample=single">single</a>
        </span>
        <button type="button" id="pdf-status" onClick={() => downloadPdf()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #3D2B1F', background: '#fff', cursor: 'pointer' }}>
          {busy || 'Download PDF'}
        </button>
      </div>
      <ProposalDocument
        data={data}
        onReady={setCount}
        containerStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
        pageWrapper={(p, i) => (
          <div style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }} data-page-index={i + 1}>{p}</div>
        )}
      />
    </div>
  )
}
