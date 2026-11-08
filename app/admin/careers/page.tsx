'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore'
import { ClipboardList, Download, FileText, Linkedin, Mail, Phone, RefreshCw, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import {
  Button, Card, Drawer, EmptyState, FilterChips, PageHeader, SearchInput, Spinner, StatCard, StatRow,
  Table, Td, Th, Toolbar, cx, exportToCsv, formatDate, inputClass, statusTone, timeAgo, toMillis, waLink,
} from '@/components/admin/ui'

interface Application {
  id: string
  name: string
  email: string
  phone: string
  linkedin: string
  resumeUrl: string
  position: string
  coverLetter: string
  status: Stage
  rawStatus: string
  createdAt: any
  read: boolean
}

const STAGES = ['new', 'reviewing', 'shortlisted', 'hired', 'rejected'] as const
type Stage = (typeof STAGES)[number]
const STAGE_LABEL: Record<Stage, string> = { new: 'New', reviewing: 'Reviewing', shortlisted: 'Shortlisted', hired: 'Hired', rejected: 'Rejected' }

/** Old admin used new / read / reviewed / contacted — map them onto the pipeline. */
function normalizeStage(s?: string): Stage {
  const v = String(s || 'new').toLowerCase()
  if ((STAGES as readonly string[]).includes(v)) return v as Stage
  if (v === 'read' || v === 'reviewed') return 'reviewing'
  if (v === 'contacted' || v === 'interview') return 'shortlisted'
  if (v === 'declined') return 'rejected'
  return 'new'
}

const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)

export default function CareersPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('all')
  const [stage, setStage] = useState<'all' | Stage>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setError('')
    try {
      let snap
      try {
        snap = await getDocs(query(collection(db, 'job_applications'), orderBy('createdAt', 'desc')))
      } catch {
        snap = await getDocs(collection(db, 'job_applications'))
      }
      const list = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          linkedin: data.linkedin || '',
          resumeUrl: data.resumeUrl || data.resume || data.cvUrl || '',
          position: data.position || 'General Application',
          coverLetter: data.coverLetter || '',
          status: normalizeStage(data.status),
          rawStatus: data.status || 'new',
          createdAt: data.createdAt || null,
          read: !!data.read,
        } as Application
      })
      list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      setApps(list)
    } catch (e: any) {
      console.error('Error fetching job applications:', e)
      setError(e?.message || 'Could not load applications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchApps() }, [fetchApps])

  const positions = useMemo(() => Array.from(new Set(apps.map((a) => a.position))).sort(), [apps])

  const byPosition = apps.filter((a) => position === 'all' || a.position === position)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return byPosition
      .filter((a) => stage === 'all' || a.status === stage)
      .filter((a) => !q || `${a.name} ${a.email} ${a.phone} ${a.position}`.toLowerCase().includes(q))
  }, [byPosition, stage, search])

  const countStage = (s: Stage) => byPosition.filter((a) => a.status === s).length
  const open = apps.find((a) => a.id === openId) || null

  const patch = (id: string, changes: Partial<Application>) => setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)))

  const openApp = async (a: Application) => {
    setOpenId(a.id)
    if (!a.read) {
      patch(a.id, { read: true })
      updateDoc(doc(db, 'job_applications', a.id), { read: true }).catch((e) => console.error(e))
    }
  }

  const setStatus = async (a: Application, s: Stage) => {
    if (a.status === s && a.rawStatus === s) return
    setBusy(a.id)
    try {
      await updateDoc(doc(db, 'job_applications', a.id), { status: s, read: true })
      patch(a.id, { status: s, rawStatus: s, read: true })
    } catch (e: any) {
      alert('Could not update status: ' + (e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const remove = async (a: Application) => {
    if (!confirm(`Delete the application from ${a.name || a.email}? This cannot be undone.`)) return
    setBusy(a.id)
    try {
      await deleteDoc(doc(db, 'job_applications', a.id))
      setApps((prev) => prev.filter((x) => x.id !== a.id))
      if (openId === a.id) setOpenId(null)
    } catch (e: any) {
      alert('Could not delete: ' + (e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const exportCsv = () =>
    exportToCsv(
      `job-applications-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((a) => ({ name: a.name, email: a.email, phone: a.phone, position: a.position, status: a.status, linkedin: a.linkedin, resume: a.resumeUrl, applied: formatDate(a.createdAt), coverLetter: a.coverLetter })),
    )

  const unread = apps.filter((a) => !a.read).length

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Job applications from the Careers page. Move each one through the pipeline."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}><Download className="w-4 h-4" /> Export CSV</Button>
            <Button variant="secondary" onClick={() => { setLoading(true); fetchApps() }}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          </>
        }
      />

      <StatRow>
        <StatCard label="All applications" value={apps.length} hint={unread ? `${unread} unread` : undefined} icon={<ClipboardList className="w-5 h-5" />} />
        <StatCard label="New" value={apps.filter((a) => a.status === 'new').length} tone="blue" onClick={() => setStage('new')} />
        <StatCard label="Shortlisted" value={apps.filter((a) => a.status === 'shortlisted').length} tone="amber" onClick={() => setStage('shortlisted')} />
        <StatCard label="Hired" value={apps.filter((a) => a.status === 'hired').length} tone="green" onClick={() => setStage('hired')} />
      </StatRow>

      <Card padded={false}>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <Toolbar>
            <FilterChips<'all' | Stage>
              value={stage}
              onChange={setStage}
              options={[{ value: 'all', label: 'All', count: byPosition.length }, ...STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], count: countStage(s) }))]}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={position} onChange={(e) => setPosition(e.target.value)} className={cx(inputClass, 'sm:w-56')}>
                <option value="all">All positions ({apps.length})</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p} ({apps.filter((a) => a.position === p).length})</option>
                ))}
              </select>
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" className="sm:w-64" />
            </div>
          </Toolbar>
        </div>

        {loading ? <Spinner label="Loading applications…" /> : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ClipboardList className="w-5 h-5" />} title={apps.length ? 'No applications match your filters' : 'No applications yet'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Applicant</Th>
                <Th>Position</Th>
                <Th className="hidden md:table-cell">Links</Th>
                <Th>Stage</Th>
                <Th className="hidden md:table-cell">Applied</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className={cx('cursor-pointer hover:bg-gray-50', !a.read && 'bg-blue-50/40')} onClick={() => openApp(a)}>
                  <Td>
                    <p className={cx('text-gray-900', a.read ? 'font-medium' : 'font-bold')}>
                      {!a.read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 align-middle" />}
                      {a.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500">{a.email}{a.phone ? ` · ${a.phone}` : ''}</p>
                  </Td>
                  <Td>{a.position}</Td>
                  <Td className="hidden md:table-cell">
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {a.linkedin && <a href={toHref(a.linkedin)} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-gray-400 hover:text-bordeaux-600"><Linkedin className="w-4 h-4" /></a>}
                      {a.resumeUrl && <a href={toHref(a.resumeUrl)} target="_blank" rel="noopener noreferrer" title="Resume" className="text-gray-400 hover:text-bordeaux-600"><FileText className="w-4 h-4" /></a>}
                      {a.email && <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application for ${a.position} at Travelzada`)}`} title="Email" className="text-gray-400 hover:text-bordeaux-600"><Mail className="w-4 h-4" /></a>}
                      {!a.linkedin && !a.resumeUrl && !a.email && <span className="text-gray-300">—</span>}
                    </div>
                  </Td>
                  <Td>
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={a.status}
                        disabled={busy === a.id}
                        onChange={(e) => setStatus(a, e.target.value as Stage)}
                        className={cx('rounded-full border-0 px-2.5 py-1 text-xs font-semibold cursor-pointer focus:ring-2 focus:ring-bordeaux-200', toneSelect(a.status))}
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                      </select>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell whitespace-nowrap text-gray-500" >{timeAgo(a.createdAt)}</Td>
                  <Td className="text-right">
                    <button type="button" onClick={(e) => { e.stopPropagation(); remove(a) }} disabled={busy === a.id} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        title={open ? `${open.name || open.email} · ${open.position}` : ''}
        footer={open ? (
          <>
            <Button variant="ghost" className="!text-red-600 mr-auto" onClick={() => remove(open)} disabled={busy === open.id}><Trash2 className="w-4 h-4" /> Delete</Button>
            {open.email && (
              <a href={`mailto:${open.email}?subject=${encodeURIComponent(`Your application for ${open.position} at Travelzada`)}`} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-bordeaux-600 text-white hover:bg-bordeaux-700">
                <Mail className="w-4 h-4" /> Email applicant
              </a>
            )}
          </>
        ) : undefined}
      >
        {open && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy === open.id}
                    onClick={() => setStatus(open, s)}
                    className={cx('rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors', open.status === s ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-700 border-gray-300 hover:border-bordeaux-300')}
                  >
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              {open.rawStatus !== open.status && <p className="text-xs text-gray-400 mt-1.5">Saved as “{open.rawStatus}” by the old dashboard.</p>}
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${open.email}`} className="text-bordeaux-700 hover:underline break-all">{open.email || '—'}</a></div>
              {open.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${open.phone}`} className="text-gray-800 hover:underline">{open.phone}</a>
                  {waLink(open.phone) && <a href={waLink(open.phone)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline">WhatsApp</a>}
                </div>
              )}
              {open.linkedin && <div className="flex items-center gap-2"><Linkedin className="w-4 h-4 text-gray-400" /><a href={toHref(open.linkedin)} target="_blank" rel="noopener noreferrer" className="text-bordeaux-700 hover:underline break-all">{open.linkedin}</a></div>}
              {open.resumeUrl && <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><a href={toHref(open.resumeUrl)} target="_blank" rel="noopener noreferrer" className="text-bordeaux-700 hover:underline">Open resume</a></div>}
              <div className="text-xs text-gray-500">Applied {formatDate(open.createdAt, true)}</div>
            </dl>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cover letter</p>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {open.coverLetter || <span className="text-gray-400">No cover letter provided.</span>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function toneSelect(s: Stage) {
  const t = statusTone(s === 'shortlisted' ? 'reviewing' : s)
  return {
    blue: 'bg-blue-50 text-blue-700',
    amber: s === 'shortlisted' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
    wine: 'bg-bordeaux-50 text-bordeaux-700',
    purple: 'bg-purple-50 text-purple-700',
  }[t]
}
