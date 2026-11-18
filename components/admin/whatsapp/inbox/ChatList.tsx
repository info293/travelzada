'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { FileText, Loader2, MessageSquare, Plus, Search, User, X } from 'lucide-react'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp'
import { formatTime, realName, type WhatsAppChat } from './types'

export type ChatFilter = 'all' | 'unread' | 'needs_reply'

/** Needs a reply = the customer wrote last and nobody answered yet */
export const needsReply = (c: WhatsAppChat) => !c.isNew && c.lastDirection === 'inbound'

export function filterChats(list: WhatsAppChat[], filter: ChatFilter) {
  if (filter === 'unread') return list.filter((c) => (c.unreadCount || 0) > 0)
  if (filter === 'needs_reply') return list.filter(needsReply)
  return list
}

export function Avatar({ chat, size = 'md', tone = 'soft' }: { chat: WhatsAppChat; size?: 'md' | 'sm'; tone?: 'soft' | 'solid' }) {
  const n = realName(chat)
  const dim = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'
  const color = tone === 'solid' ? 'bg-bordeaux-600 text-white' : 'bg-bordeaux-50 text-bordeaux-700'
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {n ? n[0].toUpperCase() : <User className="w-5 h-5" />}
    </div>
  )
}

/**
 * Left column: search, All · Unread · Needs reply, the chats (WhatsApp-style rows) and — admins only — "New chat".
 */
export default function ChatList({
  chats,
  totalCounts,
  loading,
  selectedId,
  onSelect,
  search,
  onSearch,
  filter,
  onFilter,
  canSeePhone,
  displayName,
  isOldNumber,
  onNewChat,
  pendingTemplateTitle,
  onCancelPendingTemplate,
  helpCard,
}: {
  /** Already searched + filtered */
  chats: WhatsAppChat[]
  totalCounts: { unread: number; needsReply: number }
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearch: (q: string) => void
  filter: ChatFilter
  onFilter: (f: ChatFilter) => void
  canSeePhone: boolean
  displayName: (chat: WhatsAppChat) => string
  /** True when this chat's last activity was on the old business number */
  isOldNumber: (chat: WhatsAppChat) => boolean
  /** Admins only: open a chat with a typed number */
  onNewChat?: (phone: string, name: string) => void
  /** Came from the Templates page with ?template=: "Choose a customer to send …" */
  pendingTemplateTitle?: string
  onCancelPendingTemplate?: () => void
  helpCard?: ReactNode
}) {
  const [newOpen, setNewOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')

  const submitNew = (e: FormEvent) => {
    e.preventDefault()
    if (!onNewChat || normalizeWhatsAppNumber(phone).length < 10) return
    onNewChat(phone, name)
    setNewOpen(false)
    setPhone('')
    setName('')
  }

  const chips: { value: ChatFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: totalCounts.unread },
    { value: 'needs_reply', label: 'Needs reply', count: totalCounts.needsReply },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="space-y-2.5 border-b border-gray-100 px-3 pb-3 pt-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-base font-bold text-gray-900">Chats</h2>
          {onNewChat && (
            <button
              type="button"
              onClick={() => setNewOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-bordeaux-700 hover:bg-bordeaux-50"
              title="Start a chat by typing a number (admins only)"
            >
              {newOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {newOpen ? 'Close' : 'New chat'}
            </button>
          )}
        </div>

        {onNewChat && newOpen && (
          <form onSubmit={submitNew} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
            <input
              type="tel"
              autoFocus
              placeholder="Phone with country code, e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-bordeaux-400 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-bordeaux-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={normalizeWhatsAppNumber(phone).length < 10}
              className="w-full rounded-lg bg-bordeaux-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-bordeaux-700 disabled:opacity-50"
            >
              Open chat
            </button>
          </form>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={canSeePhone ? 'Search name or number' : 'Search by name'}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-gray-100 py-2 pl-9 pr-3 text-sm focus:border-bordeaux-300 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onFilter(c.value)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === c.value ? 'bg-bordeaux-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label}
              {!!c.count && (
                <span className={`rounded-full px-1.5 text-[10px] ${filter === c.value ? 'bg-white/25' : 'bg-white text-gray-700'}`}>{c.count}</span>
              )}
            </button>
          ))}
        </div>

        {pendingTemplateTitle && (
          <div className="flex items-start gap-2 rounded-lg bg-bordeaux-50 px-3 py-2 text-xs text-bordeaux-900">
            <FileText className="mt-px w-4 h-4 shrink-0 text-bordeaux-600" />
            <span className="flex-1">
              Choose a customer below to send <strong>“{pendingTemplateTitle}”</strong>.
            </span>
            <button type="button" onClick={onCancelPendingTemplate} className="text-bordeaux-500 hover:text-bordeaux-900" aria-label="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {helpCard}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-bordeaux-600" />
            <span className="text-sm">Loading chats…</span>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare className="mx-auto mb-2 w-10 h-10 opacity-30" />
            <p className="text-sm font-medium text-gray-600">
              {filter === 'unread' ? 'No unread chats' : filter === 'needs_reply' ? 'Nobody is waiting for a reply' : search ? 'No chats match' : 'No chats yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">New customer messages appear here as they arrive.</p>
          </div>
        ) : (
          chats.map((chat) => {
            const selected = selectedId === chat.id
            const unread = (chat.unreadCount || 0) > 0
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelect(chat.id)}
                className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected ? 'bg-bordeaux-50/70' : 'hover:bg-gray-50'}`}
              >
                <Avatar chat={chat} />
                <div className="min-w-0 flex-1 border-b border-gray-100 pb-2.5 pt-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[15px] ${unread ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>{displayName(chat)}</span>
                    <span className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-emerald-600' : 'text-gray-400'}`}>
                      {chat.isNew ? 'New' : formatTime(chat.lastMessageTimestamp)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className={`min-w-0 flex-1 truncate text-[13px] ${unread ? 'text-gray-800' : 'text-gray-500'}`}>
                      {chat.lastDirection === 'outbound' && <span className="text-gray-400">You: </span>}
                      {chat.isNew ? 'Not started yet' : chat.lastMessage || 'No messages'}
                    </p>
                    {isOldNumber(chat) && (
                      <span className="shrink-0 text-[10px] text-gray-400" title="This customer last wrote to our old WhatsApp number">
                        old number
                      </span>
                    )}
                    {unread && (
                      <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
