'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle2, XCircle, RefreshCw, Zap, Mail, Inbox, Radio, Clock, Play } from 'lucide-react'
import { formatDateTime, type AutomationSettings } from '@/lib/metaLeadsCrm'

interface Status {
  settings: AutomationSettings
  smtpConfigured: boolean
  imapUser: string | null
  replyTo: string | null
  cronConfigured: boolean
  pageSubscribed: boolean
}

const AUTO_RUN_EVERY_MS = 3 * 60 * 1000

function useAutomationApi() {
  const { currentUser } = useAuth()
  return useCallback(
    async (method: 'GET' | 'POST', body?: unknown) => {
      if (!currentUser) throw new Error('Not logged in')
      const idToken = await currentUser.getIdToken()
      const res = await fetch('/api/automation/meta-leads', {
        method,
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
      return json
    },
    [currentUser]
  )
}

/**
 * While anyone has the Meta Leads CRM open, run the automation (new-lead emails + inbox check)
 * if it hasn't run in the last 3 minutes. Complements the webhook and the scheduled job.
 */
export function useAutomationHeartbeat(onRan?: () => void) {
  const api = useAutomationApi()
  const { currentUser } = useAuth()
  const running = useRef(false)

  useEffect(() => {
    if (!currentUser) return
    const tick = async () => {
      if (running.current) return
      running.current = true
      try {
        const status: Status = await api('GET')
        const last = status.settings.lastRunAt ? new Date(status.settings.lastRunAt).getTime() : 0
        if (Date.now() - last > AUTO_RUN_EVERY_MS) {
          await api('POST', { action: 'run' })
          onRan?.()
        }
      } catch (err) {
        console.warn('[Automation heartbeat]', err)
      } finally {
        running.current = false
      }
    }
    tick()
    const id = setInterval(tick, AUTO_RUN_EVERY_MS)
    return () => clearInterval(id)
  }, [api, currentUser, onRan])
}

export default function AutomationPanel() {
  const api = useAutomationApi()
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const s: Status = await api('GET')
      setStatus(s)
      setTestRecipient(s.settings.testRecipient || '')
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  const act = async (key: string, body: unknown, done?: (json: any) => string) => {
    setBusy(key)
    setResult(null)
    try {
      const json = await api('POST', body)
      if (done) setResult(done(json))
      await load()
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setBusy(null)
    }
  }

  const toggle = () => {
    if (!status) return
    const enabling = !status.settings.enabled
    if (
      enabling &&
      !window.confirm(
        'Turn on automatic emails?\n\nEvery NEW Meta lead from now on will get the trip-options email.' +
          (status.settings.testRecipient ? `\n\nTest mode is ON: emails go to ${status.settings.testRecipient} instead of customers.` : '\n\nEmails will go to real customers.')
      )
    )
      return
    act('toggle', { action: 'save', settings: { enabled: enabling } })
  }

  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
  if (!status)
    return (
      <div className="p-12 text-center text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Loading automation…
      </div>
    )

  const s = status.settings
  const testMode = !!s.testRecipient
  const cronUrl = typeof window !== 'undefined' ? `${window.location.origin.replace('localhost:3000', 'www.travelzada.com')}/api/automation/meta-leads?key=YOUR_CRON_SECRET` : ''

  const checks: { ok: boolean; label: string; detail: string; icon: typeof Mail; action?: JSX.Element }[] = [
    {
      ok: status.smtpConfigured,
      icon: Mail,
      label: 'Sending email',
      detail: status.smtpConfigured ? `Emails are sent through your Google Workspace mailbox. Replies go to ${status.replyTo}.` : 'Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env.',
    },
    {
      ok: !!status.imapUser,
      icon: Inbox,
      label: 'Reading replies',
      detail: status.imapUser
        ? `The inbox of ${status.imapUser} is checked for customer replies (read-only, nothing is marked as read).`
        : 'Set IMAP_USER / IMAP_PASS (or SMTP_USER / SMTP_PASS).',
    },
    {
      ok: status.pageSubscribed,
      icon: Radio,
      label: 'Instant new-lead alerts from Facebook',
      detail: status.pageSubscribed
        ? 'Your Facebook Page sends new leads to the website webhook the moment they arrive.'
        : 'Not connected yet. Leads are still picked up every 3 minutes while the CRM is open, or by the scheduled job.',
      action: !status.pageSubscribed ? (
        <button
          onClick={() => act('subscribe', { action: 'subscribePage' }, () => 'Facebook Page connected for instant lead alerts.')}
          disabled={!!busy}
          className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === 'subscribe' ? 'Connecting…' : 'Connect Facebook Page'}
        </button>
      ) : undefined,
    },
    {
      ok: status.cronConfigured,
      icon: Clock,
      label: 'Runs even when nobody has the CRM open',
      detail: status.cronConfigured
        ? 'CRON_SECRET is set. Point a scheduler at the URL below every 5–10 minutes.'
        : 'Optional: add CRON_SECRET to .env and use a free scheduler (cron-job.org) to call the URL below every 10 minutes.',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main switch */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Automatic trip-options email</h3>
              <p className="text-sm text-gray-600 mt-0.5 max-w-2xl">
                Every new Meta lead gets an email from Travelzada with 3 package options for the destination they asked about
                (photos, duration, price, link) and asks them to reply with their choice or chat on WhatsApp. Their replies, by email
                or WhatsApp, appear on the lead in this CRM.
              </p>
              {s.enabled && s.startAt && <p className="text-xs text-gray-500 mt-1">Active for leads received since {formatDateTime(s.startAt)}.</p>}
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={!!busy}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors ${s.enabled ? 'bg-emerald-500' : 'bg-gray-300'} disabled:opacity-50`}
            aria-label="Toggle automation"
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${s.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className={`px-6 py-3 border-t text-sm ${testMode ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <span className="font-medium text-gray-800">Test mode:</span>
            <span className="text-gray-600 text-xs md:text-sm">send automatic emails to this address instead of customers</span>
            <div className="flex gap-2 md:ml-auto">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your@email.com (empty = send to customers)"
                className="w-72 max-w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => act('test', { action: 'save', settings: { testRecipient } }, () => (testRecipient ? `Test mode on: emails go to ${testRecipient}.` : 'Test mode off: emails go to customers.'))}
                disabled={!!busy || testRecipient === (s.testRecipient || '')}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-900 text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
          {testMode && <p className="text-xs text-amber-700 mt-1">Test mode is ON. Customers will not receive anything until you clear this field.</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                act('sample', { action: 'sendSample' }, (j) => `Sample email sent to ${j.to} (${j.options} package option${j.options === 1 ? '' : 's'}, based on a lead from "${j.formName}"). Check that inbox.`)
              }
              disabled={!!busy || !s.testRecipient}
              title={s.testRecipient ? '' : 'Save a test email address first'}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-300 text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-40"
            >
              {busy === 'sample' ? 'Sending…' : 'Send me a sample email'}
            </button>
            <span className="text-[11px] text-gray-500">Sends the options email for your newest real lead to the test address only. Nothing is recorded on the lead.</span>
          </div>
        </div>
      </div>

      {/* Status + run */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {checks.map((c) => (
            <div key={c.label} className="p-4 flex gap-3">
              {c.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
              <div className="text-sm">
                <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <c.icon className="w-4 h-4 text-gray-400" /> {c.label}
                </div>
                <p className="text-gray-600 text-xs mt-0.5">{c.detail}</p>
                {c.label.startsWith('Runs even') && <code className="block mt-1 text-[11px] bg-gray-100 rounded px-2 py-1 break-all text-gray-700">{cronUrl}</code>}
                {c.action}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3 text-sm">
          <h4 className="font-semibold text-gray-900">Last run</h4>
          <p className="text-gray-700">{s.lastRunAt ? formatDateTime(s.lastRunAt) : 'Never'}</p>
          {s.lastRunSummary && <p className="text-xs text-gray-600">{s.lastRunSummary}</p>}
          {s.lastError && <p className="text-xs text-red-600 break-words">Last error: {s.lastError}</p>}
          <button
            onClick={() =>
              act('run', { action: 'run' }, (j) =>
                `${j.newLeads} new lead(s) checked · ${j.emailed} emailed · ${j.failed} failed · ${j.repliesFound} new email repl${j.repliesFound === 1 ? 'y' : 'ies'}${j.errors?.length ? ` · ${j.errors[0]}` : ''}`
              )
            }
            disabled={!!busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            <Play className={`w-4 h-4 ${busy === 'run' ? 'animate-pulse' : ''}`} /> {busy === 'run' ? 'Running…' : 'Run now'}
          </button>
          {result && <p className={`text-xs ${result.startsWith('Error') ? 'text-red-600' : 'text-emerald-700'}`}>{result}</p>}
          <p className="text-[11px] text-gray-500">
            Runs automatically every 3 minutes while the CRM is open, instantly when Facebook sends a new lead, and on the
            scheduled job if set up. Each lead is emailed only once.
          </p>
        </div>
      </div>
    </div>
  )
}
