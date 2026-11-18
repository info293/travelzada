'use client'

import { Clock, Loader2 } from 'lucide-react'

export type ReplyState = { kind: 'loading' } | { kind: 'open'; hoursLeft: number } | { kind: 'closed'; isNew?: boolean }

/** ONE pill that says what you can do right now in this chat */
export default function StatusPill({ state }: { state: ReplyState }) {
  if (state.kind === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Checking…
      </span>
    )
  }
  if (state.kind === 'open') {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
        title="WhatsApp lets you send normal messages for 24 hours after the customer's last message."
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        You can reply freely · {state.hoursLeft}h left
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
      title={
        state.isNew
          ? "This customer hasn't written to us yet, so WhatsApp only allows a pre-approved message first."
          : "The customer hasn't written in the last 24 hours, so WhatsApp only allows a pre-approved message until they reply."
      }
    >
      <Clock className="w-3 h-3" />
      Send a template to start
    </span>
  )
}
