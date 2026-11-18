'use client'

import { ArrowLeft } from 'lucide-react'
import { Avatar } from './ChatList'
import ChatMenu, { type ChatMenuProps } from './ChatMenu'
import StatusPill, { type ReplyState } from './StatusPill'
import type { WhatsAppChat } from './types'

/** Name + one status pill + "⋯". On phones also a back arrow to the chat list. */
export default function ChatHeader({
  chat,
  name,
  replyState,
  menu,
  onBack,
  forceBack,
}: {
  chat: WhatsAppChat
  name: string
  replyState: ReplyState
  menu: ChatMenuProps
  /** Shown on small screens (or the forced mobile preview) */
  onBack?: () => void
  /** Show the back arrow on wide screens too (mobile preview) */
  forceBack?: boolean
}) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-2.5 sm:px-4">
      {onBack && (
        <button type="button" onClick={onBack} className={`-ml-1 rounded-full p-1.5 text-gray-600 hover:bg-gray-100 ${forceBack ? '' : 'md:hidden'}`} aria-label="Back to chats">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <Avatar chat={chat} size="sm" tone="solid" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold text-gray-900">{name}</h2>
        <div className="mt-0.5">
          <StatusPill state={replyState} />
        </div>
      </div>
      <ChatMenu {...menu} />
    </div>
  )
}
