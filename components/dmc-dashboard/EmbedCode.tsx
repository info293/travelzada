'use client'

import { useState } from 'react'
import { Check, Copy, Code2, Globe, Puzzle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  agentSlug: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg"
    >
      {copied ? <><Check className="w-3.5 h-3.5 text-green-600" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono">
        {code}
      </pre>
      <div className="absolute top-3 right-3">
        <CopyButton text={code} />
      </div>
    </div>
  )
}

export default function EmbedCode({ agentSlug }: Props) {
  const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://www.travelzada.com'
  const plannerUrl = `${BASE}/tailored-travel/${agentSlug}?embed=1`
  const widgetUrl = `${BASE}/embed/widget.js`

  const [activeTab, setActiveTab] = useState<'script' | 'webcomponent' | 'iframe'>('script')
  const [height, setHeight] = useState('720')
  const [rounded, setRounded] = useState('16')
  const [showPreview, setShowPreview] = useState(false)

  const scriptCode =
`<!-- Travelzada AI Planner — ${agentSlug} -->
<script
  src="${widgetUrl}"
  data-agent="${agentSlug}"
  data-height="${height}px"
  data-rounded="${rounded}">
</script>`

  const webComponentCode =
`<!-- Step 1: Load the script once (in <head> or before </body>) -->
<script src="${widgetUrl}"></script>

<!-- Step 2: Place the component anywhere on your page -->
<travelzada-planner
  agent="${agentSlug}"
  height="${height}px"
  rounded="${rounded}">
</travelzada-planner>`

  const iframeCode =
`<iframe
  src="${plannerUrl}"
  width="100%"
  height="${height}px"
  style="border:none;border-radius:${rounded}px;display:block;"
  allow="geolocation"
  allowfullscreen>
</iframe>`

  const TABS = [
    { id: 'script' as const, label: 'Script Tag', icon: Code2, desc: 'Easiest — one line of code' },
    { id: 'webcomponent' as const, label: 'Web Component', icon: Puzzle, desc: 'Modern — full control' },
    { id: 'iframe' as const, label: 'Plain iFrame', icon: Globe, desc: 'Universal — works everywhere' },
  ]

  const activeCode =
    activeTab === 'script' ? scriptCode :
    activeTab === 'webcomponent' ? webComponentCode : iframeCode

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Embed Your Planner</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Add your AI travel planner to any website — static sites, WordPress, Wix, Webflow, and more.
        </p>
      </div>

      {/* Customise */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Customise</h3>
        <div className="flex flex-wrap gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Height (px)</label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              min={400}
              max={1200}
              className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Border Radius (px)</label>
            <input
              type="number"
              value={rounded}
              onChange={e => setRounded(e.target.value)}
              min={0}
              max={32}
              className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-end">
            <a
              href={`/tailored-travel/${agentSlug}?embed=1`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview embed URL
            </a>
          </div>
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
              activeTab === t.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              activeTab === t.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              <t.icon className="w-4 h-4" />
            </div>
            <div>
              <p className={`text-sm font-bold ${activeTab === t.id ? 'text-primary' : 'text-gray-800'}`}>
                {t.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">
            {activeTab === 'script' ? 'Script Tag' : activeTab === 'webcomponent' ? 'Web Component' : 'iFrame'} Code
          </h3>
          <CopyButton text={activeCode} />
        </div>

        <CodeBlock code={activeCode} />

        {/* Explainer per tab */}
        {activeTab === 'script' && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>How to use:</strong> Paste this single{' '}
            <code className="bg-blue-100 px-1 rounded">&lt;script&gt;</code> tag anywhere in your HTML page body.
            The planner will appear exactly where you place it.
          </div>
        )}
        {activeTab === 'webcomponent' && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800">
            <strong>How to use:</strong> Load the script once in your{' '}
            <code className="bg-purple-100 px-1 rounded">&lt;head&gt;</code>, then use the{' '}
            <code className="bg-purple-100 px-1 rounded">&lt;travelzada-planner&gt;</code> tag anywhere on your page.
            You can place multiple planners with different settings.
          </div>
        )}
        {activeTab === 'iframe' && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <strong>How to use:</strong> Paste this{' '}
            <code className="bg-amber-100 px-1 rounded">&lt;iframe&gt;</code> wherever you want the planner.
            Works on any platform including website builders that don't allow custom scripts.
          </div>
        )}
      </div>

      {/* Live preview toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <span>Live Preview</span>
          {showPreview ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showPreview && (
          <div className="border-t border-gray-100 p-4">
            <iframe
              src={plannerUrl}
              width="100%"
              height={`${height}px`}
              style={{ border: 'none', borderRadius: `${rounded}px`, display: 'block', background: '#f9fafb' }}
              allow="geolocation"
            />
          </div>
        )}
      </div>

      {/* What's different in embed mode */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-800 mb-2">What's different in embed mode?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Travelzada header & footer are hidden</li>
          <li>Login gate is skipped — visitors go straight to the planner as guests</li>
          <li>All bookings and sessions are still tracked in your CRM</li>
          <li>The agent branding banner (your logo + name) stays visible</li>
        </ul>
      </div>
    </div>
  )
}
