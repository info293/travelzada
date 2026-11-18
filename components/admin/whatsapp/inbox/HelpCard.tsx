'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Lightbulb, Loader2, MessageCircle, X } from 'lucide-react'

const HELP_KEY = 'tz_wa_inbox_help_dismissed'

/** First-visit help: shown until dismissed (remembered in this browser), and again from "⋯ → How WhatsApp messaging works" */
export function useHelpCard() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      setVisible(localStorage.getItem(HELP_KEY) !== '1')
    } catch {
      setVisible(true)
    }
  }, [])
  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(HELP_KEY, '1')
    } catch {
      /* private mode: just hide it for now */
    }
  }
  return { visible, show: () => setVisible(true), dismiss }
}

export default function HelpCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative rounded-xl border border-bordeaux-100 bg-bordeaux-50/50 p-3 pr-8 text-[12.5px] text-gray-700">
      <button type="button" onClick={onDismiss} className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Got it, hide">
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-gray-900">
        <Lightbulb className="w-4 h-4 text-amber-500" /> How it works
      </p>
      <ul className="list-disc space-y-1 pl-4 leading-snug">
        <li>You can reply freely for 24 hours after the customer&apos;s last message.</li>
        <li>Otherwise, start with a ready-made template message — the chat shows you the best ones.</li>
        <li>Customer numbers are only visible to admins.</li>
      </ul>
      <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-bordeaux-700 hover:underline">
        Got it
      </button>
    </div>
  )
}

/** Right side when no chat is open / while a link opens / when a link can't be opened */
export function ConversationPlaceholder({ state, message, onBack }: { state: 'empty' | 'resolving' | 'error'; message?: string; onBack?: () => void }) {
  if (state === 'resolving') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 bg-[#f7f5f3] text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-bordeaux-600" />
        <span className="text-sm">Opening the customer&apos;s chat…</span>
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f7f5f3] p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Couldn&apos;t open this chat</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>
        {onBack && (
          <button type="button" onClick={onBack} className="mt-4 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-bordeaux-300 md:hidden">
            Back to chats
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#f7f5f3] p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-bordeaux-600 shadow-sm">
        <MessageCircle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800">Your WhatsApp chats</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">Pick a chat on the left, or open a lead and tap “Chat on WhatsApp”.</p>
    </div>
  )
}
