'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare, Search, Loader2, IndianRupee, Send,
  CheckCircle, XCircle, Clock, Package, Phone, Mail,
  MapPin, Calendar, Users, User, BookCheck, Edit3, X,
  Eye, Star, Save, ChevronDown, ChevronUp, FileEdit, Share2, FileText, Printer, SlidersHorizontal,
  Plus, GripVertical
} from 'lucide-react'

interface Message {
  id: string
  senderId: string
  senderRole: 'dmc' | 'travel_agent' | 'system'
  senderName: string
  text: string
  timestamp: string
}

interface DayItem {
  id: string
  title: string
  description: string
  tags: string[]
}

interface PackageData {
  id: string
  title: string
  destination: string
  destinationCountry?: string
  overview?: string
  durationDays?: number
  durationNights?: number
  pricePerPerson?: number
  maxGroupSize?: number
  minGroupSize?: number
  travelType?: string
  theme?: string
  mood?: string
  starCategory?: string
  inclusions?: string[]
  exclusions?: string[]
  highlights?: string[]
  dayWiseItinerary?: string
  primaryImageUrl?: string
  seasonalAvailability?: string
}

interface Quotation {
  id: string
  publicId?: string
  subAgentId: string
  subAgentName: string
  packageId?: string
  packageTitle: string
  destination: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  preferredDates?: string
  groupSize: number
  adults: number
  kids: number
  rooms?: number
  specialRequests?: string
  status: string
  quotedPrice?: number | null
  agentNotes?: string
  customPackageData?: PackageData | null
  messages: Message[]
  createdAt?: { seconds: number }
  updatedAt?: { seconds: number }
}

interface Props {
  agentId: string
  agentSlug: string
  agentName: string
  currentUserId: string
}

const TRAVEL_TYPES = ['Leisure', 'Adventure', 'Honeymoon', 'Family', 'Corporate', 'Pilgrimage', 'Wildlife']
const STAR_CATEGORIES = ['3-Star', '4-Star', '5-Star', 'Luxury', 'Budget', 'Homestay']
const THEMES = ['Beach', 'Wildlife', 'Cultural', 'Hills', 'Desert', 'Adventure', 'Wellness', 'Heritage', 'Backpacking']
const MOODS = ['Relaxing', 'Adventurous', 'Romantic', 'Family Fun', 'Spiritual', 'Exploratory']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:       { label: 'Pending',       color: 'bg-gray-100 text-gray-600',    icon: Clock },
  in_discussion: { label: 'In Discussion', color: 'bg-blue-100 text-blue-700',    icon: MessageSquare },
  quoted:        { label: 'Quoted',        color: 'bg-amber-100 text-amber-700',  icon: IndianRupee },
  accepted:      { label: 'Accepted',      color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:      { label: 'Rejected',      color: 'bg-red-100 text-red-700',      icon: XCircle },
  converted:     { label: 'Booked ✓',      color: 'bg-purple-100 text-purple-700', icon: BookCheck },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  return isToday
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(ts?: { seconds: number }) {
  if (!ts) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDayItems(text: string): DayItem[] {
  if (!text?.trim()) return []
  const items: DayItem[] = []
  let current: DayItem | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^day\s*\d+/i.test(line)) {
      if (current) items.push(current)
      current = { id: crypto.randomUUID(), title: line, description: '', tags: [] }
    } else if (current) {
      current.description += (current.description ? '\n' : '') + line
    }
  }
  if (current) items.push(current)
  return items
}

function serializeDayItems(items: DayItem[]): string {
  return items.map(d => [d.title, d.description].filter(Boolean).join('\n')).join('\n\n')
}

export default function QuotationsManager({ agentId, agentSlug, agentName, currentUserId }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState<'today' | '7d' | '30d' | 'all'>('all')
  const [filterSubAgent, setFilterSubAgent] = useState('all')
  const [filterDest, setFilterDest] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [pdfQuot, setPdfQuot] = useState<Quotation | null>(null)
  // Price editing
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  // Booking conversion
  const [converting, setConverting] = useState(false)
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set())
  // Package view / customize
  const [viewPkg, setViewPkg] = useState<PackageData | null>(null)
  const [loadingPkg, setLoadingPkg] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customForm, setCustomForm] = useState<Partial<PackageData>>({})
  const [customDayItems, setCustomDayItems] = useState<DayItem[]>([])
  const [savingCustom, setSavingCustom] = useState(false)
  const [creatingPkg, setCreatingPkg] = useState(false)
  const originalCustomFormRef = useRef<Partial<PackageData>>({})
  const originalCustomDayItemsRef = useRef<DayItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── View full package details ────────────────────────────────────────────────
  async function fetchAndViewPackage(q: Quotation) {
    // If quotation has customPackageData already, show that; otherwise fetch real package
    if (q.customPackageData) { setViewPkg(q.customPackageData); return }
    if (!q.packageId) {
      // No packageId — build a minimal view from quotation fields
      setViewPkg({ id: '', title: q.packageTitle, destination: q.destination })
      return
    }
    setLoadingPkg(true)
    try {
      const res = await fetch(`/api/agent/packages/${q.packageId}`)
      const data = await res.json()
      if (data.success && data.package) setViewPkg(data.package)
      else setViewPkg({ id: q.packageId, title: q.packageTitle, destination: q.destination })
    } catch { setViewPkg({ id: q.packageId || '', title: q.packageTitle, destination: q.destination }) }
    finally { setLoadingPkg(false) }
  }

  // ── Open customize form ──────────────────────────────────────────────────────
  async function openCustomize(q: Quotation) {
    setShowCustomize(true)
    if (q.customPackageData) {
      const items = parseDayItems(q.customPackageData.dayWiseItinerary || '')
      setCustomForm(q.customPackageData)
      setCustomDayItems(items)
      originalCustomFormRef.current = { ...q.customPackageData }
      originalCustomDayItemsRef.current = items.map(i => ({ ...i }))
      return
    }
    if (!q.packageId) {
      const form = { title: q.packageTitle, destination: q.destination }
      setCustomForm(form)
      setCustomDayItems([])
      originalCustomFormRef.current = { ...form }
      originalCustomDayItemsRef.current = []
      return
    }
    setLoadingPkg(true)
    try {
      const res = await fetch(`/api/agent/packages/${q.packageId}`)
      const data = await res.json()
      if (data.success && data.package) {
        const items = parseDayItems(data.package.dayWiseItinerary || '')
        setCustomForm(data.package)
        setCustomDayItems(items)
        originalCustomFormRef.current = { ...data.package }
        originalCustomDayItemsRef.current = items.map(i => ({ ...i }))
      } else {
        const form = { title: q.packageTitle, destination: q.destination }
        setCustomForm(form)
        setCustomDayItems([])
        originalCustomFormRef.current = { ...form }
        originalCustomDayItemsRef.current = []
      }
    } catch {
      const form = { title: q.packageTitle, destination: q.destination }
      setCustomForm(form)
      setCustomDayItems([])
      originalCustomFormRef.current = { ...form }
      originalCustomDayItemsRef.current = []
    }
    finally { setLoadingPkg(false) }
  }

  // ── Save custom package data to quotation ────────────────────────────────────
  async function saveCustomPackage() {
    if (!activeId || !active) return
    setSavingCustom(true)
    try {
      const dayWise = customDayItems.length > 0 ? serializeDayItems(customDayItems) : customForm.dayWiseItinerary || ''
      const merged = { ...customForm, dayWiseItinerary: dayWise }
      const groupSize = active.groupSize || active.adults || 1
      const newQuotedPrice = merged.pricePerPerson
        ? Number(merged.pricePerPerson) * groupSize
        : undefined
      const patchBody: Record<string, any> = { customPackageData: merged }
      if (newQuotedPrice) patchBody.quotedPrice = newQuotedPrice

      await fetch(`/api/agent/quotations/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      setQuotations(prev => prev.map(q => q.id === activeId ? {
        ...q,
        customPackageData: merged as PackageData,
        ...(newQuotedPrice ? { quotedPrice: newQuotedPrice, status: q.status === 'pending' ? 'quoted' : q.status } : {}),
      } : q))
      setShowCustomize(false)
    } catch { }
    finally { setSavingCustom(false) }
  }

  // ── Create a real package in Package Manager from the custom form ─────────────
  async function createNewPackage() {
    if (!customForm.title || !customForm.destination) {
      alert('Package title and destination are required.')
      return
    }
    if (!activeId || !active) return
    setCreatingPkg(true)
    try {
      const dayWise = customDayItems.length > 0 ? serializeDayItems(customDayItems) : customForm.dayWiseItinerary || ''
      const merged = { ...customForm, dayWiseItinerary: dayWise }

      // 1. Create the package in Package Manager
      const pkgRes = await fetch('/api/agent/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          title: merged.title,
          destination: merged.destination || '',
          destinationCountry: merged.destinationCountry || 'India',
          overview: merged.overview || '',
          durationDays: Number(merged.durationDays) || 0,
          durationNights: Number(merged.durationNights) || 0,
          pricePerPerson: Number(merged.pricePerPerson) || 0,
          maxGroupSize: Number(merged.maxGroupSize) || 20,
          minGroupSize: Number(merged.minGroupSize) || 1,
          travelType: merged.travelType || '',
          theme: merged.theme || '',
          mood: merged.mood || '',
          starCategory: merged.starCategory || '3-Star',
          inclusions: Array.isArray(merged.inclusions) ? merged.inclusions.filter(Boolean) : [],
          exclusions: Array.isArray(merged.exclusions) ? merged.exclusions.filter(Boolean) : [],
          highlights: Array.isArray(merged.highlights) ? merged.highlights.filter(Boolean) : [],
          dayWiseItinerary: dayWise,
          primaryImageUrl: merged.primaryImageUrl || '',
          seasonalAvailability: merged.seasonalAvailability || 'Year Round',
        }),
      })
      const pkgData = await pkgRes.json()
      if (!pkgRes.ok) throw new Error(pkgData.error || 'Failed to create package')

      // 2. Also save the same data to the quotation so travel agent sees the update
      const groupSize = active.groupSize || active.adults || 1
      const newQuotedPrice = merged.pricePerPerson
        ? Number(merged.pricePerPerson) * groupSize
        : undefined
      const patchBody: Record<string, any> = { customPackageData: merged }
      if (newQuotedPrice) patchBody.quotedPrice = newQuotedPrice

      await fetch(`/api/agent/quotations/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      setQuotations(prev => prev.map(q => q.id === activeId ? {
        ...q,
        customPackageData: merged as PackageData,
        ...(newQuotedPrice ? { quotedPrice: newQuotedPrice, status: q.status === 'pending' ? 'quoted' : q.status } : {}),
      } : q))

      // Update the original snapshot so the dirty flag resets
      originalCustomFormRef.current = { ...merged }
      originalCustomDayItemsRef.current = customDayItems.map(i => ({ ...i }))

      alert(`✅ Package "${merged.title}" created in Package Manager and saved to this quotation!`)
    } catch (err: any) {
      alert('Failed to create package: ' + err.message)
    } finally {
      setCreatingPkg(false)
    }
  }

  function addCustomDayItem() {
    const idx = customDayItems.length + 1
    setCustomDayItems(prev => [...prev, { id: crypto.randomUUID(), title: `Day ${idx}:`, description: '', tags: [] }])
  }

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/quotations?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) {
        setQuotations(data.quotations.map((q: any) => ({ ...q, messages: q.messages || [] })))
      }
    } catch { } finally { setLoading(false) }
  }, [agentId])

  useEffect(() => { fetchQuotations() }, [fetchQuotations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, quotations])

  // Reset package states when switching quotations
  useEffect(() => {
    setShowCustomize(false)
    setViewPkg(null)
    setCustomDayItems([])
  }, [activeId])

  const active = quotations.find(q => q.id === activeId) || null

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!messageText.trim() || !activeId) return
    setSending(true)
    const res = await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message', senderId: currentUserId, senderRole: 'dmc',
        senderName: agentName, text: messageText.trim(),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setQuotations(prev => prev.map(q => q.id === activeId
        ? { ...q, messages: [...q.messages, data.message], status: q.status === 'pending' ? 'in_discussion' : q.status }
        : q
      ))
      setMessageText('')
    }
    setSending(false)
  }

  // ── Set / update quoted price ────────────────────────────────────────────────
  async function savePrice() {
    if (!activeId || !priceInput) return
    const newPrice = Number(priceInput)
    if (isNaN(newPrice) || newPrice <= 0) return
    setSavingPrice(true)

    const currentPrice = active?.quotedPrice
    const isUpdate = currentPrice && currentPrice !== newPrice

    // Save price + status → quoted
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotedPrice: newPrice, status: 'quoted' }),
    })

    // Auto-send a chat notification so travel agent sees the change
    const msgText = isUpdate
      ? `💰 Quote updated: ₹${newPrice.toLocaleString('en-IN')} (was ₹${currentPrice!.toLocaleString('en-IN')})`
      : `💰 Quote set: ₹${newPrice.toLocaleString('en-IN')} for ${active?.packageTitle}`

    const msgRes = await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'message', senderId: currentUserId, senderRole: 'dmc',
        senderName: agentName, text: msgText,
      }),
    })
    const msgData = await msgRes.json()

    setQuotations(prev => prev.map(q => {
      if (q.id !== activeId) return q
      return {
        ...q,
        quotedPrice: newPrice,
        status: 'quoted',
        messages: msgData.success ? [...q.messages, msgData.message] : q.messages,
      }
    }))
    setEditingPrice(false)
    setSavingPrice(false)
  }

  // ── Update status only ───────────────────────────────────────────────────────
  async function updateStatus(status: string) {
    if (!activeId) return
    await fetch(`/api/agent/quotations/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setQuotations(prev => prev.map(q => q.id === activeId ? { ...q, status } : q))
  }

  // ── Convert quotation → booking ──────────────────────────────────────────────
  async function convertToBooking() {
    if (!active || converting) return
    setConverting(true)
    try {
      const res = await fetch('/api/agent/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          agentSlug,
          packageTitle: active.packageTitle,
          destination: active.destination,
          customerName: active.customerName,
          customerEmail: active.customerEmail || '',
          customerPhone: active.customerPhone || '',
          preferredDates: active.preferredDates || '',
          groupSize: active.groupSize || 1,
          adults: active.adults || 1,
          kids: active.kids || 0,
          rooms: active.rooms || 1,
          specialRequests: active.specialRequests || '',
          subAgentId: active.subAgentId,
          quotedPrice: active.quotedPrice || null,
          bookingValue: active.quotedPrice || null,
        }),
      })
      const bookingData = await res.json()
      if (!res.ok) throw new Error(bookingData.error || 'Failed to create booking')

      // Mark quotation as converted + send system message
      await fetch(`/api/agent/quotations/${active.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'converted' }),
      })
      const msgRes = await fetch(`/api/agent/quotations/${active.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message', senderId: currentUserId, senderRole: 'dmc',
          senderName: agentName,
          text: `✅ Booking confirmed! This quotation has been converted to a booking${active.quotedPrice ? ` for ₹${active.quotedPrice.toLocaleString('en-IN')}` : ''}.`,
        }),
      })
      const msgData = await msgRes.json()

      setConvertedIds(prev => new Set([...prev, active.id]))
      setQuotations(prev => prev.map(q => {
        if (q.id !== active.id) return q
        return {
          ...q,
          status: 'converted',
          messages: msgData.success ? [...q.messages, msgData.message] : q.messages,
        }
      }))
    } catch (err: any) {
      alert('Failed to create booking: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  // ── Open a standalone print window with the full quotation ──────────────────
  function openPrintWindow(q: Quotation) {
    const pkg = q.customPackageData
    const heroImage = pkg?.primaryImageUrl || ''
    const inclusions = Array.isArray(pkg?.inclusions) ? pkg!.inclusions.filter(Boolean) : []
    const exclusions = Array.isArray(pkg?.exclusions) ? pkg!.exclusions.filter(Boolean) : []
    const highlights = Array.isArray(pkg?.highlights) ? pkg!.highlights.filter(Boolean) : []
    const groupSize = q.groupSize || 1
    const pricePerPerson = pkg?.pricePerPerson
      || (q.quotedPrice && groupSize > 1 ? Math.round(Number(q.quotedPrice) / groupSize) : null)

    // Parse itinerary string into day objects
    const days: { title: string; desc: string }[] = []
    if (pkg?.dayWiseItinerary) {
      let cur: { title: string; desc: string } | null = null
      for (const line of pkg.dayWiseItinerary.split('\n').filter(Boolean)) {
        if (/^day\s*\d+/i.test(line)) {
          if (cur) days.push(cur)
          cur = { title: line, desc: '' }
        } else if (cur) {
          cur.desc += (cur.desc ? '\n' : '') + line
        }
      }
      if (cur) days.push(cur)
    }

    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${esc(q.packageTitle)} — Quotation</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;background:#fff}
@page{margin:0;size:A4}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.hero{position:relative;height:260px;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover}
.hero-bg{width:100%;height:100%;background:linear-gradient(135deg,#4338ca,#7c3aed)}
.overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.1) 100%)}
.hero-top{position:absolute;top:16px;left:20px;right:20px;display:flex;justify-content:space-between;align-items:flex-start}
.hero-bot{position:absolute;bottom:20px;left:20px;right:20px}
.badge{background:#fff;color:#111;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px}
.ref{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:10px;font-family:monospace;font-weight:700;padding:4px 10px;border-radius:999px}
.qlabel{font-size:9px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.15em;margin-bottom:6px}
.ptitle{font-size:26px;font-weight:800;color:#fff;line-height:1.2}
.dest{font-size:13px;color:rgba(255,255,255,.75);margin-top:6px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);background:#4338ca}
.sc{padding:10px 8px;text-align:center;border-left:1px solid rgba(255,255,255,.15)}
.sc:first-child{border-left:none}
.sicon{font-size:16px}
.slabel{font-size:8px;color:#a5b4fc;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.sval{font-size:11px;font-weight:700;color:#fff;margin-top:2px;line-height:1.3}
.body{padding:24px 28px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.precard{background:#f9fafb;border-radius:12px;padding:16px}
.slbl{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.cname{font-size:20px;font-weight:800;color:#111;margin-bottom:10px}
.irow{display:flex;align-items:center;gap:6px;font-size:11px;color:#6b7280;margin-bottom:4px}
.divhr{border:none;border-top:1px solid #e5e7eb;margin:8px 0}
.pcard{border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:center}
.pamount{font-size:32px;font-weight:800;color:#fff;line-height:1;margin-bottom:4px}
.psub{font-size:11px;color:rgba(255,255,255,.75)}
.pper{font-size:11px;color:rgba(255,255,255,.6);margin-top:2px}
.phr{border:none;border-top:1px solid rgba(255,255,255,.2);margin:10px 0}
.pdlbl{font-size:9px;color:rgba(255,255,255,.5)}
.pdval{font-size:11px;font-weight:600;color:rgba(255,255,255,.85);margin-top:2px}
.sec{margin-bottom:20px}
.stitle{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.overview{font-size:13px;color:#374151;line-height:1.6}
.hgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hpill{display:flex;align-items:flex-start;gap:8px;background:#eef2ff;border-radius:10px;padding:8px 12px}
.hstar{color:#6366f1;font-size:13px;flex-shrink:0}
.htext{font-size:12px;color:#374151;line-height:1.4}
.iegrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.icard{background:#f0fdf4;border-radius:12px;padding:14px}
.ecard{background:#fff1f2;border-radius:12px;padding:14px}
.ititle{font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
.etitle{font-size:10px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
.li{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}
.idot{width:16px;height:16px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:#fff;font-size:8px;font-weight:700}
.edot{width:16px;height:16px;border-radius:50%;background:#f87171;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:#fff;font-size:8px;font-weight:700}
.litext{font-size:12px;color:#374151;line-height:1.4}
.dayitem{display:flex;gap:12px;margin-bottom:4px}
.dayleft{display:flex;flex-direction:column;align-items:center}
.daynum{width:28px;height:28px;border-radius:50%;background:#4338ca;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dayline{width:2px;background:#e0e7ff;flex:1;margin-top:4px;min-height:16px}
.daycontent{padding-bottom:14px;flex:1}
.daytitle{font-size:13px;font-weight:700;color:#111;line-height:1.4}
.daydesc{font-size:11px;color:#6b7280;margin-top:3px;line-height:1.5}
.sreq{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:20px}
.sreqt{font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
.sreqb{font-size:12px;color:#374151}
.terms{border-top:1px solid #f3f4f6;padding-top:16px;margin-bottom:16px}
.termrow{display:flex;gap:6px;font-size:11px;color:#9ca3af;margin-bottom:4px}
.footer{background:#4338ca;border-radius:12px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
.ftname{font-size:14px;font-weight:700;color:#fff}
.ftsub{font-size:10px;color:#a5b4fc;margin-top:2px}
.ftthanks{font-size:11px;color:#a5b4fc}
</style></head><body>
<div class="hero">
  ${heroImage ? `<img src="${heroImage}" alt="" />` : '<div class="hero-bg"></div>'}
  <div class="overlay"></div>
  <div class="hero-top">
    <span class="badge">${esc(agentName)}</span>
    <span class="ref">${esc(q.publicId || q.id.slice(-8).toUpperCase())}</span>
  </div>
  <div class="hero-bot">
    <p class="qlabel">Travel Quotation</p>
    <h1 class="ptitle">${esc(q.packageTitle)}</h1>
    <p class="dest">📍 ${esc(q.destination)}${pkg?.destinationCountry ? ', ' + esc(pkg.destinationCountry) : ''}</p>
  </div>
</div>
<div class="stats">
  ${[
    ['🌙','Duration', pkg?.durationNights ? `${pkg.durationNights}N / ${pkg.durationDays}D` : pkg?.durationDays ? `${pkg.durationDays} Days` : '—'],
    ['⭐','Category', pkg?.starCategory || '—'],
    ['✈️','Travel Type', pkg?.travelType || '—'],
    ['👥','Travellers', `${groupSize} pax (${q.adults}A${q.kids ? ` + ${q.kids}K` : ''})`],
  ].map(([icon,label,val]) => `<div class="sc"><div class="sicon">${icon}</div><div class="slabel">${label}</div><div class="sval">${val}</div></div>`).join('')}
</div>
<div class="body">
  <div class="grid2">
    <div class="precard">
      <div class="slbl">Prepared For</div>
      <div class="cname">${esc(q.customerName)}</div>
      ${q.customerEmail ? `<div class="irow">📧 ${esc(q.customerEmail)}</div>` : ''}
      ${q.customerPhone ? `<div class="irow">📱 ${esc(q.customerPhone)}</div>` : ''}
      ${q.preferredDates ? `<div class="irow">📅 ${esc(q.preferredDates)}</div>` : ''}
      <hr class="divhr"/>
      <div class="irow">👤 via ${esc(q.subAgentName || agentName)}</div>
    </div>
    <div class="pcard" style="background:${q.quotedPrice ? '#059669' : '#d97706'}">
      <div class="slbl" style="color:rgba(255,255,255,.6)">${q.quotedPrice ? 'Quoted Price' : 'Price'}</div>
      ${q.quotedPrice
        ? `<div class="pamount">₹${Number(q.quotedPrice).toLocaleString('en-IN')}</div>
           <div class="psub">Total for ${groupSize} traveller${groupSize !== 1 ? 's' : ''}</div>
           ${pricePerPerson && groupSize > 1 ? `<div class="pper">₹${Number(pricePerPerson).toLocaleString('en-IN')} per person</div>` : ''}`
        : `<div class="pamount" style="font-size:18px">To be confirmed</div>`}
      <hr class="phr"/>
      <div class="pdlbl">Date issued</div>
      <div class="pdval">${dateStr}</div>
    </div>
  </div>
  ${pkg?.overview ? `<div class="sec"><div class="stitle">Overview</div><p class="overview">${esc(pkg.overview)}</p></div>` : ''}
  ${highlights.length ? `<div class="sec"><div class="stitle">Highlights</div><div class="hgrid">${highlights.map(h=>`<div class="hpill"><span class="hstar">✦</span><span class="htext">${esc(h)}</span></div>`).join('')}</div></div>` : ''}
  ${(inclusions.length || exclusions.length) ? `<div class="sec"><div class="iegrid">
    ${inclusions.length ? `<div class="icard"><div class="ititle">✓ Inclusions</div>${inclusions.map(i=>`<div class="li"><div class="idot">✓</div><span class="litext">${esc(i)}</span></div>`).join('')}</div>` : ''}
    ${exclusions.length ? `<div class="ecard"><div class="etitle">✗ Exclusions</div>${exclusions.map(e=>`<div class="li"><div class="edot">✗</div><span class="litext">${esc(e)}</span></div>`).join('')}</div>` : ''}
  </div></div>` : ''}
  ${days.length ? `<div class="sec"><div class="stitle">Day-Wise Itinerary</div>${days.map((d,i)=>`<div class="dayitem"><div class="dayleft"><div class="daynum">${String(i+1).padStart(2,'0')}</div>${i<days.length-1?'<div class="dayline"></div>':''}</div><div class="daycontent"><div class="daytitle">${esc(d.title)}</div>${d.desc?`<div class="daydesc">${esc(d.desc).replace(/\n/g,'<br>')}</div>`:''}</div></div>`).join('')}</div>` : ''}
  ${q.specialRequests ? `<div class="sreq"><div class="sreqt">Special Requests</div><p class="sreqb">${esc(q.specialRequests)}</p></div>` : ''}
  <div class="terms">
    <div class="stitle">Terms &amp; Conditions</div>
    ${['This quotation is valid for 7 days from the date of issue.','Prices are subject to availability at the time of booking.','A deposit may be required to confirm the booking.','For queries, please contact your travel agent directly.'].map(t=>`<div class="termrow"><span>•</span><span>${t}</span></div>`).join('')}
  </div>
  <div class="footer">
    <div><div class="ftname">${esc(agentName)}</div><div class="ftsub">Your trusted travel partner</div></div>
    <div class="ftthanks">Thank you for choosing us ✈️</div>
  </div>
</div>
</body></html>`

    const win = window.open('', '_blank', 'width=850,height=1100')
    if (!win) { alert('Please allow pop-ups to generate the PDF.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 800)
  }

  // ── WhatsApp quotation share ─────────────────────────────────────────────────
  function shareOnWhatsApp(q: Quotation) {
    const price = q.quotedPrice ? `₹${Number(q.quotedPrice).toLocaleString('en-IN')}` : 'To be confirmed'
    const lines = [
      `🌍 *Travel Quotation*`,
      ``,
      `Hello ${q.customerName},`,
      ``,
      `Here is your travel quotation from *${agentName}*:`,
      ``,
      `📦 *Package:* ${q.packageTitle}`,
      `📍 *Destination:* ${q.destination}`,
      `👥 *Travellers:* ${q.groupSize} pax (${q.adults} adults${q.kids ? `, ${q.kids} kids` : ''})`,
      q.preferredDates ? `📅 *Dates:* ${q.preferredDates}` : null,
      ``,
      `💰 *Quoted Price:* ${price}`,
      ``,
      q.specialRequests ? `📝 *Special Notes:* ${q.specialRequests}\n` : null,
      `For more details or to confirm your booking, please reply to this message.`,
      ``,
      `Thank you for choosing *${agentName}* ✈️`,
    ].filter(Boolean).join('\n')

    const phone = q.customerPhone?.replace(/\D/g, '')
    const encoded = encodeURIComponent(lines)
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`
    window.open(url, '_blank')
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const countByStatus = quotations.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const subAgentOptions = Array.from(new Set(quotations.map(q => q.subAgentName).filter(Boolean))).sort()
  const destOptions = Array.from(new Set(quotations.map(q => q.destination).filter(Boolean))).sort()
  const hasActiveFilters = filterStatus !== 'all' || filterDate !== 'all' || filterSubAgent !== 'all' || filterDest !== 'all' || search

  const filtered = quotations.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false

    if (filterDate !== 'all') {
      const now = Date.now()
      const created = q.createdAt ? q.createdAt.seconds * 1000 : 0
      if (filterDate === 'today') {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        if (created < todayStart.getTime()) return false
      } else if (filterDate === '7d') {
        if (created < now - 7 * 24 * 60 * 60 * 1000) return false
      } else if (filterDate === '30d') {
        if (created < now - 30 * 24 * 60 * 60 * 1000) return false
      }
    }

    if (filterSubAgent !== 'all' && q.subAgentName !== filterSubAgent) return false
    if (filterDest !== 'all' && q.destination !== filterDest) return false

    if (search) {
      const s = search.toLowerCase()
      return (q.customerName?.toLowerCase().includes(s) ||
        q.subAgentName?.toLowerCase().includes(s) ||
        q.destination?.toLowerCase().includes(s) ||
        q.packageTitle?.toLowerCase().includes(s) ||
        q.publicId?.toLowerCase().includes(s)) ?? false
    }
    return true
  })

  const isClosed = active && ['converted', 'rejected'].includes(active.status)

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <>
    <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[600px]">

      {/* ── LEFT — quotation list ─────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quotations</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {hasActiveFilters ? `${filtered.length} of ${quotations.length}` : `${quotations.length} total`}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('all'); setFilterDate('all'); setFilterSubAgent('all'); setFilterDest('all') }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <X className="w-3 h-3" />Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, package, destination…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {/* Date filter pills */}
        <div className="flex gap-1 mb-2">
          {(['all', 'today', '7d', '30d'] as const).map(d => (
            <button key={d} onClick={() => setFilterDate(d)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterDate === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {d === 'all' ? 'All time' : d === 'today' ? 'Today' : d === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>

        {/* Sub-agent + Destination dropdowns */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="relative">
            <select value={filterSubAgent} onChange={e => setFilterSubAgent(e.target.value)}
              className="w-full appearance-none text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-gray-700 truncate">
              <option value="all">All agents</option>
              {subAgentOptions.map(sa => <option key={sa} value={sa}>{sa}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterDest} onChange={e => setFilterDest(e.target.value)}
              className="w-full appearance-none text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-gray-700 truncate">
              <option value="all">All destinations</option>
              {destOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
            All ({quotations.length})
          </button>
          {Object.keys(STATUS_CONFIG).map(s => (countByStatus[s] || 0) > 0 ? (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-primary text-white' : STATUS_CONFIG[s].color}`}>
              {STATUS_CONFIG[s].label} ({countByStatus[s]})
            </button>
          ) : null)}
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No quotations found</div>
          ) : filtered.map(q => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending
            const isConverted = q.status === 'converted'
            return (
              <button key={q.id}
                onClick={() => { setActiveId(q.id); setEditingPrice(false); setPriceInput(String(q.quotedPrice || '')) }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                  activeId === q.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{q.customerName}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{q.packageTitle}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400 truncate">via {q.subAgentName || 'Agent'}</span>
                  {q.quotedPrice ? (
                    <span className={`text-xs font-bold ${isConverted ? 'text-purple-700' : 'text-emerald-700'}`}>
                      ₹{Number(q.quotedPrice).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  )}
                </div>
                {q.publicId && (
                  <div className="mt-1.5">
                    <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {q.publicId}
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT — detail + chat ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3" />
            <p className="font-medium">Select a quotation to view details and messages</p>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{active.customerName}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_CONFIG[active.status]?.color || ''}`}>
                      {STATUS_CONFIG[active.status]?.label}
                    </span>
                    {active.publicId && (
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md flex-shrink-0">
                        {active.publicId}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" />{active.packageTitle}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{active.destination}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{active.groupSize} pax</span>
                    {active.preferredDates && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{active.preferredDates}</span>}
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />via {active.subAgentName}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {active.customerEmail && (
                    <a href={`mailto:${active.customerEmail}`}
                      className="flex items-center gap-1 text-xs border border-gray-200 bg-white text-gray-600 px-2.5 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors">
                      <Mail className="w-3 h-3" />Email
                    </a>
                  )}
                  {active.customerPhone && (
                    <a href={`https://wa.me/${active.customerPhone.replace(/\D/g, '')}`} target="_blank"
                      className="flex items-center gap-1 text-xs border border-green-200 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => shareOnWhatsApp(active)}
                    className="flex items-center gap-1 text-xs border border-green-300 bg-green-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    title="Share quotation via WhatsApp"
                  >
                    <Share2 className="w-3 h-3" />Share Quote
                  </button>
                  <button
                    onClick={() => setPdfQuot(active)}
                    className="flex items-center gap-1 text-xs border border-primary bg-primary text-white px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                    title="Generate printable quotation"
                  >
                    <FileText className="w-3 h-3" />PDF
                  </button>
                  <button
                    onClick={() => fetchAndViewPackage(active)}
                    disabled={loadingPkg}
                    className="flex items-center gap-1 text-xs border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="View full package details"
                  >
                    {loadingPkg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    {active.customPackageData ? 'View Custom' : 'View Package'}
                  </button>
                  {!isClosed && (
                    <button
                      onClick={() => openCustomize(active)}
                      className="flex items-center gap-1 text-xs border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      title="Customize package for this quote only"
                    >
                      <FileEdit className="w-3 h-3" />
                      {active.customPackageData ? 'Edit Custom' : 'Customize Package'}
                    </button>
                  )}
                  {active.customPackageData && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full self-center">
                      Customized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Controls row (price + status + book button) ── */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-4 flex-wrap">

                {/* ── Quoted price block ── */}
                <div className="flex items-center gap-3">
                  {active.quotedPrice && !editingPrice ? (
                    // Price is set — show it prominently
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-700">
                          {Number(active.quotedPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">quoted</span>
                      </div>
                      {!isClosed && (
                        <button onClick={() => { setEditingPrice(true); setPriceInput(String(active.quotedPrice || '')) }}
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit price">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : !isClosed ? (
                    // No price yet OR editing — show input
                    <div className="flex items-center gap-2">
                      {editingPrice && (
                        <button onClick={() => setEditingPrice(false)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                        {editingPrice ? 'Update price (₹)' : 'Set quote price (₹)'}
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') savePrice() }}
                          placeholder="e.g. 58000"
                          className="pl-7 pr-3 py-1.5 w-32 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <button onClick={savePrice} disabled={savingPrice || !priceInput}
                        className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">
                        {savingPrice ? 'Saving…' : editingPrice ? 'Update' : 'Set & Notify'}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* ── Status buttons + Convert to Booking ── */}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {!isClosed && ['in_discussion', 'accepted', 'rejected'].map(s => (
                    <button key={s} disabled={active.status === s}
                      onClick={() => updateStatus(s)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        active.status === s
                          ? `${STATUS_CONFIG[s]?.color || ''} border-transparent`
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>
                      {STATUS_CONFIG[s]?.label}
                    </button>
                  ))}

                  {/* ── Convert to Booking button ── */}
                  {active.status !== 'converted' && active.status !== 'rejected' && (
                    <button
                      onClick={convertToBooking}
                      disabled={converting}
                      className="flex items-center gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-xl transition-colors ml-1"
                    >
                      {converting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Converting…</>
                        : <><BookCheck className="w-3.5 h-3.5" />Mark as Booked</>
                      }
                    </button>
                  )}

                  {/* Booked badge */}
                  {active.status === 'converted' && (
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-purple-100 text-purple-700 px-3.5 py-1.5 rounded-xl">
                      <BookCheck className="w-3.5 h-3.5" />Booked ✓
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active.specialRequests && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold mb-1">Customer Notes / Special Requests</p>
                  {active.specialRequests}
                </div>
              )}

              {active.messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                active.messages.map(msg => {
                  // System / price-update messages
                  if (msg.senderRole === 'system' || msg.text.startsWith('💰') || msg.text.startsWith('✅')) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1.5 rounded-full">
                          {msg.text} · {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )
                  }
                  const isDmc = msg.senderRole === 'dmc'
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isDmc ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDmc ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className={`max-w-[72%] flex flex-col ${isDmc ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isDmc ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 px-1">
                          {msg.senderName} · {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Message input ── */}
            {!isClosed ? (
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2">
                  <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    rows={2} placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={sendMessage} disabled={sending || !messageText.trim()}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 self-end">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-gray-100 text-center text-xs text-gray-400 flex-shrink-0">
                {active.status === 'converted'
                  ? '✅ This quotation has been converted to a booking.'
                  : '❌ This quotation has been rejected.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* ── Package View Full-Screen Overlay ───────────────────────────────────── */}
    {viewPkg && active && (() => {
      const groupSize = active.groupSize || active.adults || 1
      const viewTotalPrice = viewPkg.pricePerPerson ? Number(viewPkg.pricePerPerson) * groupSize : 0
      const isCustom = !!active.customPackageData
      return (
        <div className="fixed left-0 md:left-60 right-0 top-0 bottom-0 z-[60] flex flex-col bg-[#f4f5f9]">

          {/* Top bar */}
          <div className="flex items-center justify-between bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewPkg(null)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                Back
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCustom ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {isCustom ? 'Custom Package' : 'Original Package'}
              </span>
              <p className="text-sm font-semibold text-gray-700 truncate max-w-xs hidden sm:block">{viewPkg.title || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isClosed && (
                <button
                  onClick={() => { setViewPkg(null); openCustomize(active) }}
                  className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  {isCustom ? 'Edit Custom' : 'Customize for this Quote'}
                </button>
              )}
              <button
                onClick={() => setViewPkg(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Two-column body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: read-only details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">

              {/* ── Title card ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`px-5 pt-5 pb-4 ${viewPkg.primaryImageUrl ? 'relative h-48 flex flex-col justify-end' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                  {viewPkg.primaryImageUrl && (
                    <>
                      <img src={viewPkg.primaryImageUrl} alt={viewPkg.title} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </>
                  )}
                  <div className="relative">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Package Title</p>
                    <h2 className="text-2xl font-bold text-white leading-snug">{viewPkg.title || '—'}</h2>
                    {(viewPkg.destination) && (
                      <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />{viewPkg.destination}{viewPkg.destinationCountry ? `, ${viewPkg.destinationCountry}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {(viewPkg.durationDays || viewPkg.starCategory || viewPkg.travelType || viewPkg.theme || viewPkg.mood) && (
                  <div className="flex flex-wrap gap-2 px-5 py-3">
                    {(viewPkg.durationDays || viewPkg.durationNights) && (
                      <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3" />{viewPkg.durationDays || '?'}D / {viewPkg.durationNights || '?'}N
                      </span>
                    )}
                    {viewPkg.starCategory && (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Star className="w-3 h-3" />{viewPkg.starCategory}
                      </span>
                    )}
                    {viewPkg.travelType && <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{viewPkg.travelType}</span>}
                    {viewPkg.theme && <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">{viewPkg.theme}</span>}
                    {viewPkg.mood && <span className="bg-pink-50 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full">{viewPkg.mood}</span>}
                  </div>
                )}
              </div>

              {/* ── Basic Info ── */}
              {(viewPkg.destination || viewPkg.durationDays || viewPkg.minGroupSize || viewPkg.seasonalAvailability) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📍</span>
                    <p className="text-sm font-bold text-gray-800">Basic Info</p>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-4">
                    {[
                      { label: 'Destination', value: viewPkg.destination },
                      { label: 'Country', value: viewPkg.destinationCountry },
                      { label: 'Days', value: viewPkg.durationDays },
                      { label: 'Nights', value: viewPkg.durationNights },
                      { label: 'Min Group', value: viewPkg.minGroupSize },
                      { label: 'Max Group', value: viewPkg.maxGroupSize },
                      { label: 'Season', value: viewPkg.seasonalAvailability, full: true },
                    ].filter(f => f.value).map(({ label, value, full }) => (
                      <div key={label} className={full ? 'col-span-2' : ''}>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Package Type ── */}
              {(viewPkg.travelType || viewPkg.starCategory || viewPkg.theme || viewPkg.mood) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🎯</span>
                    <p className="text-sm font-bold text-gray-800">Package Type</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {viewPkg.travelType && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Travel Type</p>
                        <div className="flex flex-wrap gap-2">
                          {TRAVEL_TYPES.map(t => (
                            <span key={t} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${viewPkg.travelType === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewPkg.starCategory && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Star Category</p>
                        <div className="flex flex-wrap gap-2">
                          {STAR_CATEGORIES.map(s => (
                            <span key={s} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${viewPkg.starCategory === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewPkg.theme && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Theme</p>
                        <div className="flex flex-wrap gap-2">
                          {THEMES.map(t => (
                            <span key={t} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${viewPkg.theme === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewPkg.mood && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Mood / Vibe</p>
                        <div className="flex flex-wrap gap-2">
                          {MOODS.map(m => (
                            <span key={m} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${viewPkg.mood === m ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Description & Content ── */}
              {(viewPkg.overview || (Array.isArray(viewPkg.highlights) && viewPkg.highlights.filter(Boolean).length > 0) ||
                (Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.filter(Boolean).length > 0) ||
                (Array.isArray(viewPkg.exclusions) && viewPkg.exclusions.filter(Boolean).length > 0)) && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-sm">📝</span>
                    <p className="text-sm font-bold text-gray-800">Description & Content</p>
                  </div>
                  <div className="p-5 space-y-5">
                    {viewPkg.overview && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Overview</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{viewPkg.overview}</p>
                      </div>
                    )}
                    {Array.isArray(viewPkg.highlights) && viewPkg.highlights.filter(Boolean).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">Highlights</p>
                        <ul className="space-y-1.5">
                          {viewPkg.highlights.filter(Boolean).map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-indigo-400 mt-0.5 flex-shrink-0">✦</span>{h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.filter(Boolean).length > 0 ||
                      Array.isArray(viewPkg.exclusions) && viewPkg.exclusions.filter(Boolean).length > 0) && (
                      <div className="grid grid-cols-2 gap-4">
                        {Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.filter(Boolean).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-2">✓ Inclusions</p>
                            <ul className="space-y-1">
                              {viewPkg.inclusions.filter(Boolean).map((inc, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                  <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>{inc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(viewPkg.exclusions) && viewPkg.exclusions.filter(Boolean).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-2">✗ Exclusions</p>
                            <ul className="space-y-1">
                              {viewPkg.exclusions.filter(Boolean).map((exc, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>{exc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Pricing ── */}
              {viewPkg.pricePerPerson && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">💰</span>
                    <p className="text-sm font-bold text-gray-800">Pricing</p>
                  </div>
                  <div className="p-5 flex items-center gap-5">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Price per Person</p>
                      <p className="text-3xl font-bold text-gray-900">₹{Number(viewPkg.pricePerPerson).toLocaleString('en-IN')}</p>
                    </div>
                    {viewTotalPrice > 0 && (
                      <div className="bg-indigo-600 text-white rounded-2xl p-4 min-w-[160px] text-center shadow-lg shadow-indigo-100">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-1">Total for this Quote</p>
                        <p className="text-2xl font-bold leading-tight">₹{viewTotalPrice.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] opacity-60 mt-1">for {groupSize} pax</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Day-Wise Itinerary ── */}
              {viewPkg.dayWiseItinerary && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">🗺️</span>
                    <p className="text-sm font-bold text-gray-800">Day-Wise Itinerary</p>
                  </div>
                  <div className="p-5 space-y-1.5">
                    {viewPkg.dayWiseItinerary.split('\n').filter(Boolean).map((line, i) => (
                      <div key={i} className={`text-sm ${line.toLowerCase().startsWith('day') ? 'font-semibold text-gray-900 mt-3 first:mt-0' : 'text-gray-600 pl-4'}`}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right: Live Preview */}
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Preview</span>
                <p className="text-[10px] text-gray-400 mt-0.5">for {active.customerName} · {groupSize} pax</p>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                  <div className="relative h-40">
                    {viewPkg.primaryImageUrl ? (
                      <img src={viewPkg.primaryImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-200 to-purple-300 flex items-center justify-center">
                        <Package className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow ${isCustom ? 'bg-amber-400 text-white' : 'bg-white text-gray-800'}`}>
                        {isCustom ? 'Custom' : 'Travelzada'}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-bold text-sm leading-snug line-clamp-2">{viewPkg.title || 'Package'}</p>
                      {viewPkg.destination && (
                        <p className="text-white/70 text-[10px] flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />{viewPkg.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { emoji: '🏨', label: 'Stay', val: viewPkg.starCategory || '–' },
                        { emoji: '✈️', label: 'Type', val: viewPkg.travelType || '–' },
                        { emoji: '🌙', label: 'Nights', val: viewPkg.durationNights || '–' },
                      ].map(({ emoji, label, val }) => (
                        <div key={label} className="text-center">
                          <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-1 text-sm">{emoji}</div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
                          <p className="text-[10px] font-bold text-gray-700">{String(val)}</p>
                        </div>
                      ))}
                    </div>

                    {viewPkg.pricePerPerson && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center mb-3">
                        <p className="text-[10px] text-indigo-400 font-semibold uppercase">Starting from</p>
                        <p className="text-xl font-bold text-indigo-700">₹{Number(viewPkg.pricePerPerson).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-indigo-400">per person</p>
                        {viewTotalPrice > 0 && (
                          <p className="text-[10px] font-semibold text-indigo-600 mt-1 border-t border-indigo-100 pt-1">
                            Total ₹{viewTotalPrice.toLocaleString('en-IN')} for {groupSize} pax
                          </p>
                        )}
                      </div>
                    )}

                    {Array.isArray(viewPkg.highlights) && viewPkg.highlights.filter(Boolean).length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-gray-700 mb-1.5">Highlights</p>
                        <ul className="space-y-1">
                          {viewPkg.highlights.filter(Boolean).slice(0, 4).map((h, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                              <span className="text-indigo-400 mt-0.5 flex-shrink-0">✦</span>{h}
                            </li>
                          ))}
                          {viewPkg.highlights.filter(Boolean).length > 4 && (
                            <li className="text-[10px] text-gray-400 pl-4">+{viewPkg.highlights.filter(Boolean).length - 4} more…</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {Array.isArray(viewPkg.inclusions) && viewPkg.inclusions.filter(Boolean).length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-green-700 mb-1">✓ Inclusions</p>
                        <ul className="space-y-0.5">
                          {viewPkg.inclusions.filter(Boolean).slice(0, 3).map((inc, i) => (
                            <li key={i} className="text-[10px] text-gray-500 flex items-start gap-1">
                              <span className="text-green-400 flex-shrink-0">•</span>{inc}
                            </li>
                          ))}
                          {viewPkg.inclusions.filter(Boolean).length > 3 && (
                            <li className="text-[10px] text-gray-400 pl-3">+{viewPkg.inclusions.filter(Boolean).length - 3} more…</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Quotation Context</p>
                  <p>Customer: <span className="font-medium text-gray-800">{active.customerName}</span></p>
                  <p>Group: <span className="font-medium text-gray-800">{active.adults}A{active.kids ? ` + ${active.kids}K` : ''}</span></p>
                  {active.preferredDates && <p>Dates: <span className="font-medium text-gray-800">{active.preferredDates}</span></p>}
                  <p>Agent: <span className="font-medium text-gray-800">{active.subAgentName}</span></p>
                  <p className="text-gray-400 pt-1 border-t border-gray-200">
                    {isCustom ? 'Customized version — not from Package Manager.' : 'Original package from Package Manager.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )
    })()}

    {/* ── Full-Screen Customize Overlay ─────────────────────────────────────── */}
    {showCustomize && active && (() => {
      const groupSize = active.groupSize || active.adults || 1
      const totalPrice = customForm.pricePerPerson ? Number(customForm.pricePerPerson) * groupSize : 0
      const isFormDirty =
        JSON.stringify(customForm) !== JSON.stringify(originalCustomFormRef.current) ||
        JSON.stringify(customDayItems) !== JSON.stringify(originalCustomDayItemsRef.current)
      return (
        <div className="fixed left-0 md:left-60 right-0 top-0 bottom-0 z-[60] flex flex-col bg-[#f4f5f9]">

          {/* Top bar */}
          <div className="flex items-center justify-between bg-white border-b border-gray-100 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCustomize(false)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                Back
              </button>
              <div className="h-4 w-px bg-gray-200" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {active.customPackageData ? 'Editing Custom' : 'Customizing'}
              </span>
              <p className="text-sm font-semibold text-gray-700 truncate max-w-xs hidden sm:block">
                {customForm.title || active.packageTitle || '—'}
              </p>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium hidden sm:block">
                Not saved to Package Manager
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createNewPackage}
                disabled={creatingPkg || savingCustom || !isFormDirty}
                className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg transition-colors"
                title={!isFormDirty ? 'Make changes first to create a new package' : 'Create this as a new package in Package Manager'}
              >
                {creatingPkg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creatingPkg ? 'Creating…' : 'Create New Package'}
              </button>
              <button
                onClick={saveCustomPackage}
                disabled={savingCustom || creatingPkg}
                className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-3.5 py-1.5 rounded-lg transition-colors"
              >
                {savingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {savingCustom ? 'Saving…' : 'Save Custom Package'}
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Two-column body */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">

              {/* ── 1. Title ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 pt-4 pb-3">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Package Title</p>
                  <input
                    value={customForm.title || ''}
                    onChange={e => setCustomForm(p => ({ ...p, title: e.target.value }))}
                    placeholder={active.packageTitle || 'e.g. Customized Goa Beach Package'}
                    className="w-full text-xl font-bold text-white bg-transparent border-none outline-none placeholder:text-white/30"
                  />
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-3">
                  <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />{customForm.durationDays || '?'}D / {customForm.durationNights || '?'}N
                  </span>
                  {customForm.starCategory && (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Star className="w-3 h-3" />{customForm.starCategory}
                    </span>
                  )}
                  {customForm.travelType && <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{customForm.travelType}</span>}
                  {customForm.theme && <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">{customForm.theme}</span>}
                  {customForm.mood && <span className="bg-pink-50 text-pink-700 text-xs font-semibold px-2.5 py-1 rounded-full">{customForm.mood}</span>}
                </div>
              </div>

              {/* ── 2. Basic Info ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-sm">📍</span>
                  <p className="text-sm font-bold text-gray-800">Basic Info</p>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Destination</label>
                    <input value={customForm.destination || ''} onChange={e => setCustomForm(p => ({ ...p, destination: e.target.value }))}
                      placeholder={active.destination}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Country</label>
                    <input value={customForm.destinationCountry || ''} onChange={e => setCustomForm(p => ({ ...p, destinationCountry: e.target.value }))}
                      placeholder="India"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Days</label>
                    <input type="number" min="1" value={customForm.durationDays || ''} onChange={e => setCustomForm(p => ({ ...p, durationDays: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Nights</label>
                    <input type="number" min="0" value={customForm.durationNights || ''} onChange={e => setCustomForm(p => ({ ...p, durationNights: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Min Group</label>
                    <input type="number" min="1" value={customForm.minGroupSize || ''} onChange={e => setCustomForm(p => ({ ...p, minGroupSize: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Max Group</label>
                    <input type="number" min="1" value={customForm.maxGroupSize || ''} onChange={e => setCustomForm(p => ({ ...p, maxGroupSize: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Seasonal Availability</label>
                    <input value={customForm.seasonalAvailability || ''} onChange={e => setCustomForm(p => ({ ...p, seasonalAvailability: e.target.value }))}
                      placeholder="Oct–Mar / Year Round"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                </div>
              </div>

              {/* ── 3. Package Type ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                  <span className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-sm">🎯</span>
                  <p className="text-sm font-bold text-gray-800">Package Type</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Travel Type</label>
                    <div className="flex flex-wrap gap-2">
                      {TRAVEL_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => setCustomForm(p => ({ ...p, travelType: t }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${customForm.travelType === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Star Category</label>
                    <div className="flex flex-wrap gap-2">
                      {STAR_CATEGORIES.map(s => (
                        <button key={s} type="button" onClick={() => setCustomForm(p => ({ ...p, starCategory: s }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${customForm.starCategory === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Theme</label>
                    <div className="flex flex-wrap gap-2">
                      {THEMES.map(t => (
                        <button key={t} type="button" onClick={() => setCustomForm(p => ({ ...p, theme: customForm.theme === t ? '' : t }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${customForm.theme === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Mood / Vibe</label>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map(m => (
                        <button key={m} type="button" onClick={() => setCustomForm(p => ({ ...p, mood: customForm.mood === m ? '' : m }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${customForm.mood === m ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-pink-300'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. Description & Content ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-sm">📝</span>
                  <p className="text-sm font-bold text-gray-800">Description & Content</p>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Overview</label>
                    <textarea rows={3} value={customForm.overview || ''} onChange={e => setCustomForm(p => ({ ...p, overview: e.target.value }))}
                      placeholder="Describe this package in a few sentences…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Highlights <span className="font-normal text-gray-400">(one per line)</span></label>
                    <textarea rows={3}
                      value={Array.isArray(customForm.highlights) ? customForm.highlights.join('\n') : (customForm.highlights || '')}
                      onChange={e => setCustomForm(p => ({ ...p, highlights: e.target.value.split('\n') }))}
                      placeholder="Sunset cruise&#10;Scuba diving&#10;Island hopping"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-green-700 block mb-1">✓ Inclusions</label>
                      <textarea rows={4}
                        value={Array.isArray(customForm.inclusions) ? customForm.inclusions.join('\n') : (customForm.inclusions || '')}
                        onChange={e => setCustomForm(p => ({ ...p, inclusions: e.target.value.split('\n') }))}
                        placeholder="Flights&#10;Hotel accommodation&#10;Daily breakfast"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-red-500 block mb-1">✗ Exclusions</label>
                      <textarea rows={4}
                        value={Array.isArray(customForm.exclusions) ? customForm.exclusions.join('\n') : (customForm.exclusions || '')}
                        onChange={e => setCustomForm(p => ({ ...p, exclusions: e.target.value.split('\n') }))}
                        placeholder="Travel insurance&#10;Visa fees&#10;Tips & gratuities"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. Pricing ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">💰</span>
                  <p className="text-sm font-bold text-gray-800">Pricing for This Quotation</p>
                </div>
                <div className="p-5 flex items-start gap-5">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price per Person (₹)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-gray-400 font-semibold text-lg">₹</span>
                      <input
                        type="number"
                        value={customForm.pricePerPerson || ''}
                        onChange={e => setCustomForm(p => ({ ...p, pricePerPerson: Number(e.target.value) || undefined }))}
                        placeholder="0"
                        className="text-3xl font-bold text-gray-900 border-none outline-none w-40 bg-transparent focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-gray-400">{groupSize} pax · will auto-set quoted price</p>
                  </div>
                  <div className="bg-amber-600 text-white rounded-2xl p-4 min-w-[160px] text-center shadow-lg shadow-amber-100">
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-1">Total Quoted Price</p>
                    <p className="text-2xl font-bold leading-tight">
                      ₹{totalPrice > 0 ? totalPrice.toLocaleString('en-IN') : '—'}
                    </p>
                    <p className="text-[10px] opacity-60 mt-1">for {groupSize} pax</p>
                  </div>
                </div>
              </div>

              {/* ── 6. Cover Image ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
                  <span className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-sm">🖼️</span>
                  <p className="text-sm font-bold text-gray-800">Cover Image URL</p>
                </div>
                <div className="p-5 space-y-3">
                  <input value={customForm.primaryImageUrl || ''} onChange={e => setCustomForm(p => ({ ...p, primaryImageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  {customForm.primaryImageUrl && (
                    <div className="relative rounded-xl overflow-hidden h-36 border border-gray-200">
                      <img src={customForm.primaryImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── 7. Master Itinerary ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-sm">🗺️</span>
                    <p className="text-sm font-bold text-gray-800">Master Itinerary</p>
                    {customDayItems.length > 0 && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {customDayItems.length} day{customDayItems.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={addCustomDayItem}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />Add New Day
                  </button>
                </div>
                <div className="p-5">
                  {customDayItems.length === 0 ? (
                    <button
                      onClick={addCustomDayItem}
                      className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                    >
                      + Add your first day
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {customDayItems.map((day, idx) => (
                        <QuotDayCard
                          key={day.id}
                          day={day}
                          idx={idx}
                          onTitleChange={v => setCustomDayItems(prev => prev.map(d => d.id === day.id ? { ...d, title: v } : d))}
                          onDescChange={v => setCustomDayItems(prev => prev.map(d => d.id === day.id ? { ...d, description: v } : d))}
                          onAddTag={tag => { const t = tag.trim(); if (!t) return; setCustomDayItems(prev => prev.map(d => d.id === day.id && !d.tags.includes(t) ? { ...d, tags: [...d.tags, t] } : d)) }}
                          onRemoveTag={tag => setCustomDayItems(prev => prev.map(d => d.id === day.id ? { ...d, tags: d.tags.filter(t => t !== tag) } : d))}
                          onRemove={() => setCustomDayItems(prev => prev.filter(d => d.id !== day.id))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right: Live Preview */}
            <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">Live Preview</span>
                <p className="text-[10px] text-gray-400 mt-0.5">for {active.customerName} · {groupSize} pax</p>
              </div>
              <div className="p-4">
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                  {/* Hero */}
                  <div className="relative h-40">
                    {customForm.primaryImageUrl ? (
                      <img src={customForm.primaryImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                        <Package className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full text-gray-800 shadow">Custom Quote</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-bold text-sm leading-snug line-clamp-2">
                        {customForm.title || active.packageTitle || 'Your Package'}
                      </p>
                      {(customForm.destination || active.destination) && (
                        <p className="text-white/70 text-[10px] flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />{customForm.destination || active.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { emoji: '🏨', label: 'Stay', val: customForm.starCategory || '–' },
                        { emoji: '✈️', label: 'Type', val: customForm.travelType || '–' },
                        { emoji: '🌙', label: 'Nights', val: customForm.durationNights || '–' },
                      ].map(({ emoji, label, val }) => (
                        <div key={label} className="text-center">
                          <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-1 text-sm">{emoji}</div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
                          <p className="text-[10px] font-bold text-gray-700">{String(val)}</p>
                        </div>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center mb-3">
                      <p className="text-[10px] text-amber-500 font-semibold uppercase">Total Quoted Price</p>
                      <p className="text-xl font-bold text-amber-700">
                        {totalPrice > 0 ? `₹${totalPrice.toLocaleString('en-IN')}` : '—'}
                      </p>
                      {customForm.pricePerPerson && totalPrice > 0 && (
                        <p className="text-[10px] text-amber-400">₹{Number(customForm.pricePerPerson).toLocaleString('en-IN')}/person × {groupSize}</p>
                      )}
                    </div>

                    {/* Highlights */}
                    {Array.isArray(customForm.highlights) && customForm.highlights.filter(Boolean).length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-gray-700 mb-1.5">Highlights</p>
                        <ul className="space-y-1">
                          {customForm.highlights.filter(Boolean).slice(0, 4).map((h, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                              <span className="text-amber-400 mt-0.5 flex-shrink-0">✦</span>{h}
                            </li>
                          ))}
                          {customForm.highlights.filter(Boolean).length > 4 && (
                            <li className="text-[10px] text-gray-400 pl-4">+{customForm.highlights.filter(Boolean).length - 4} more…</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Inclusions preview */}
                    {Array.isArray(customForm.inclusions) && customForm.inclusions.filter(Boolean).length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-green-700 mb-1">✓ Inclusions</p>
                        <ul className="space-y-0.5">
                          {customForm.inclusions.filter(Boolean).slice(0, 3).map((inc, i) => (
                            <li key={i} className="text-[10px] text-gray-500 flex items-start gap-1">
                              <span className="text-green-400 flex-shrink-0">•</span>{inc}
                            </li>
                          ))}
                          {customForm.inclusions.filter(Boolean).length > 3 && (
                            <li className="text-[10px] text-gray-400 pl-3">+{customForm.inclusions.filter(Boolean).length - 3} more…</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {customDayItems.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-700 mb-1.5">Itinerary ({customDayItems.length} days)</p>
                        <div className="space-y-1.5">
                          {customDayItems.slice(0, 3).map((d, i) => (
                            <div key={d.id} className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <div>
                                <p className="text-[10px] font-bold text-gray-800 leading-tight">{d.title}</p>
                                {d.description && <p className="text-[10px] text-gray-400 leading-snug line-clamp-1 mt-0.5">{d.description}</p>}
                              </div>
                            </div>
                          ))}
                          {customDayItems.length > 3 && <p className="text-[10px] text-gray-400 pl-7">+{customDayItems.length - 3} more days…</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quotation context */}
                <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Quotation Context</p>
                  <p>Customer: <span className="font-medium text-gray-800">{active.customerName}</span></p>
                  <p>Group: <span className="font-medium text-gray-800">{active.adults}A{active.kids ? ` + ${active.kids}K` : ''}</span></p>
                  {active.preferredDates && <p>Dates: <span className="font-medium text-gray-800">{active.preferredDates}</span></p>}
                  <p>Agent: <span className="font-medium text-gray-800">{active.subAgentName}</span></p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )
    })()}

    {/* ── Quotation PDF Modal ────────────────────────────────────────────────── */}
    {pdfQuot && (() => {
      const pkg = pdfQuot.customPackageData
      const heroImage = pkg?.primaryImageUrl || ''
      const inclusions = Array.isArray(pkg?.inclusions) ? pkg!.inclusions.filter(Boolean) : []
      const exclusions = Array.isArray(pkg?.exclusions) ? pkg!.exclusions.filter(Boolean) : []
      const highlights = Array.isArray(pkg?.highlights) ? pkg!.highlights.filter(Boolean) : []
      const itineraryLines = pkg?.dayWiseItinerary ? pkg.dayWiseItinerary.split('\n').filter(Boolean) : []
      const groupSize = pdfQuot.groupSize || 1
      const pricePerPerson = pkg?.pricePerPerson || (pdfQuot.quotedPrice ? Math.round(Number(pdfQuot.quotedPrice) / groupSize) : null)

      return (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 print:relative print:bg-white print:p-0 print:flex print:items-start print:justify-start">
          <div className="bg-white w-full max-w-2xl flex flex-col h-[92vh] overflow-hidden rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:h-auto print:max-w-none print:overflow-visible print:w-full">

            {/* ── Toolbar (hidden on print) ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 print:hidden bg-white">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-gray-900 text-sm">Quotation Preview</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => shareOnWhatsApp(pdfQuot)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3.5 py-1.5 rounded-xl transition-colors">
                  <Share2 className="w-3.5 h-3.5" />WhatsApp
                </button>
                <button onClick={() => openPrintWindow(pdfQuot)}
                  className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl transition-colors">
                  <Printer className="w-3.5 h-3.5" />Print / Save PDF
                </button>
                <button onClick={() => setPdfQuot(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Printable content ── */}
            <div className="flex-1 min-h-0 overflow-y-auto print:overflow-visible print:flex-none">

              {/* Hero */}
              <div className="relative" style={{ height: '220px' }}>
                {heroImage ? (
                  <img src={heroImage} alt={pdfQuot.packageTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

                {/* Top row: agency + ref */}
                <div className="absolute top-4 left-5 right-5 flex items-center justify-between">
                  <span className="bg-white text-gray-900 text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">{agentName}</span>
                  <span className="bg-white/15 border border-white/30 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full">
                    {pdfQuot.publicId || pdfQuot.id.slice(-8).toUpperCase()}
                  </span>
                </div>

                {/* Bottom: package name + destination */}
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">Travel Quotation</p>
                  <h1 className="text-2xl font-bold text-white leading-tight">{pdfQuot.packageTitle}</h1>
                  <p className="flex items-center gap-1.5 text-white/75 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{pdfQuot.destination}
                    {pkg?.destinationCountry && `, ${pkg.destinationCountry}`}
                  </p>
                </div>
              </div>

              {/* Stats strip */}
              <div style={{ backgroundColor: '#4338ca', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
                {[
                  { icon: '🌙', label: 'Duration', val: pkg?.durationNights ? `${pkg.durationNights}N / ${pkg.durationDays}D` : pkg?.durationDays ? `${pkg.durationDays} Days` : '—' },
                  { icon: '⭐', label: 'Category', val: pkg?.starCategory || '—' },
                  { icon: '✈️', label: 'Travel Type', val: pkg?.travelType || '—' },
                  { icon: '👥', label: 'Travellers', val: `${groupSize} pax (${pdfQuot.adults}A${pdfQuot.kids ? ` + ${pdfQuot.kids}K` : ''})` },
                ].map(({ icon, label, val }, i) => (
                  <div key={label} style={{ padding: '10px 12px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                    <span style={{ fontSize: '16px' }}>{icon}</span>
                    <p style={{ fontSize: '9px', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</p>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginTop: '2px', lineHeight: 1.2 }}>{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 space-y-6 print:p-8 print:space-y-5">

                {/* Customer + Price row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Prepared For */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Prepared For</p>
                    <p className="text-lg font-bold text-gray-900">{pdfQuot.customerName}</p>
                    <div className="mt-2 space-y-1">
                      {pdfQuot.customerEmail && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail className="w-3 h-3 flex-shrink-0" />{pdfQuot.customerEmail}
                        </p>
                      )}
                      {pdfQuot.customerPhone && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3 flex-shrink-0" />{pdfQuot.customerPhone}
                        </p>
                      )}
                      {pdfQuot.preferredDates && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 flex-shrink-0" />{pdfQuot.preferredDates}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
                        <User className="w-3 h-3 flex-shrink-0" />via {pdfQuot.subAgentName || agentName}
                      </p>
                    </div>
                  </div>

                  {/* Quoted price */}
                  <div
                    className="rounded-2xl p-4 flex flex-col justify-center"
                    style={{ backgroundColor: pdfQuot.quotedPrice ? '#059669' : '#d97706' }}
                  >
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      {pdfQuot.quotedPrice ? 'Quoted Price' : 'Price'}
                    </p>
                    {pdfQuot.quotedPrice ? (
                      <>
                        <p style={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                          ₹{Number(pdfQuot.quotedPrice).toLocaleString('en-IN')}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                          Total for {groupSize} traveller{groupSize !== 1 ? 's' : ''}
                        </p>
                        {pricePerPerson && groupSize > 1 && (
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                            ₹{Number(pricePerPerson).toLocaleString('en-IN')} per person
                          </p>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>To be confirmed</p>
                    )}
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Date issued</p>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
                        {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Overview */}
                {pkg?.overview && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Overview</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{pkg.overview}</p>
                  </div>
                )}

                {/* Highlights */}
                {highlights.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Highlights</p>
                    <div className="grid grid-cols-2 gap-2">
                      {highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                          <span className="text-indigo-500 mt-0.5 text-sm flex-shrink-0">✦</span>
                          <p className="text-xs text-gray-700 leading-snug">{h}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inclusions / Exclusions */}
                {(inclusions.length > 0 || exclusions.length > 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    {inclusions.length > 0 && (
                      <div className="bg-emerald-50 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2.5">✓ Inclusions</p>
                        <ul className="space-y-1.5">
                          {inclusions.map((inc, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-[8px] font-bold">✓</span>
                              </span>
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {exclusions.length > 0 && (
                      <div className="bg-red-50 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2.5">✗ Exclusions</p>
                        <ul className="space-y-1.5">
                          {exclusions.map((exc, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                              <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-[8px] font-bold">✗</span>
                              </span>
                              {exc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Day-wise itinerary */}
                {itineraryLines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Day-Wise Itinerary</p>
                    <div className="space-y-2">
                      {(() => {
                        const days: { title: string; lines: string[] }[] = []
                        let cur: { title: string; lines: string[] } | null = null
                        for (const line of itineraryLines) {
                          if (/^day\s*\d+/i.test(line)) {
                            if (cur) days.push(cur)
                            cur = { title: line, lines: [] }
                          } else if (cur) {
                            cur.lines.push(line)
                          }
                        }
                        if (cur) days.push(cur)
                        return days.length > 0 ? days.map((day, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              {i < days.length - 1 && <div className="w-px flex-1 bg-indigo-100 mt-1" />}
                            </div>
                            <div className="pb-4 flex-1">
                              <p className="text-sm font-bold text-gray-900 leading-snug">{day.title}</p>
                              {day.lines.map((l, j) => (
                                <p key={j} className="text-xs text-gray-500 mt-1 leading-relaxed">{l}</p>
                              ))}
                            </div>
                          </div>
                        )) : itineraryLines.map((line, i) => (
                          <p key={i} className={`text-sm ${/^day\s*\d+/i.test(line) ? 'font-bold text-gray-900 mt-2' : 'text-gray-600 pl-4'}`}>{line}</p>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Special requests */}
                {pdfQuot.specialRequests && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Special Requests</p>
                    <p className="text-sm text-gray-700">{pdfQuot.specialRequests}</p>
                  </div>
                )}

                {/* Terms */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</p>
                  <ul className="space-y-1">
                    {[
                      'This quotation is valid for 7 days from the date of issue.',
                      'Prices are subject to availability at the time of booking.',
                      'A deposit may be required to confirm the booking.',
                      'For queries, please contact your travel agent directly.',
                    ].map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                        <span className="text-gray-300 flex-shrink-0">•</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div style={{ backgroundColor: '#4338ca', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{agentName}</p>
                    <p style={{ fontSize: '10px', color: '#a5b4fc', marginTop: '2px' }}>Your trusted travel partner</p>
                  </div>
                  <p style={{ fontSize: '11px', color: '#a5b4fc' }}>Thank you for choosing us ✈️</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}

// ── QuotDayCard — inline day card for the customize overlay ──────────────────
interface QuotDayCardProps {
  day: DayItem
  idx: number
  onTitleChange: (v: string) => void
  onDescChange: (v: string) => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onRemove: () => void
}

function QuotDayCard({ day, idx, onTitleChange, onDescChange, onAddTag, onRemoveTag, onRemove }: QuotDayCardProps) {
  const [tagInput, setTagInput] = useState('')

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      onAddTag(tagInput)
      setTagInput('')
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-100">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0">
          {String(idx + 1).padStart(2, '0')}
        </span>
        <input
          value={day.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={`Day ${idx + 1}: Title`}
          className="flex-1 text-sm font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300"
        />
        <button onClick={onRemove} className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        <textarea
          value={day.description}
          onChange={e => onDescChange(e.target.value)}
          rows={2}
          placeholder="Describe activities for this day…"
          className="w-full text-sm text-gray-600 bg-transparent border-none outline-none resize-none placeholder:text-gray-300"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {day.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {tag}
              <button onClick={() => onRemoveTag(tag)} className="text-gray-300 hover:text-red-400 ml-0.5">×</button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            placeholder="+ tag, Enter"
            className="text-[10px] text-gray-400 bg-transparent border-none outline-none w-20 placeholder:text-gray-300"
          />
        </div>
      </div>
    </div>
  )
}

