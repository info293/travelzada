'use client'

import type { ReactNode } from 'react'

/**
 * WhatsApp-Web-like frame: chat list on the left, conversation on the right.
 * On phones (or `forceMobile`, used by the QA preview) only one shows: the list, or the open chat with a back arrow.
 */
export default function InboxShell({
  list,
  conversation,
  hasChat,
  forceMobile = false,
  className = 'h-[calc(100vh-10rem)] min-h-[480px]',
}: {
  list: ReactNode
  conversation: ReactNode
  /** A chat is open (on phones: show the conversation instead of the list) */
  hasChat: boolean
  forceMobile?: boolean
  className?: string
}) {
  if (forceMobile) {
    return (
      <div className={`mx-auto flex w-[390px] max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
        <div className="flex min-w-0 flex-1 flex-col">{hasChat ? conversation : list}</div>
      </div>
    )
  }
  return (
    <div className={`flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className={`${hasChat ? 'hidden md:flex' : 'flex'} w-full min-w-0 flex-col border-r border-gray-200 md:w-[340px] md:shrink-0 lg:w-[380px]`}>{list}</div>
      <div className={`${hasChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>{conversation}</div>
    </div>
  )
}

/** Header / messages / bottom area. When `expanded` (filling in a template) the bottom area gets most of the height. */
export function ConversationPane({ header, messages, bottom, expanded }: { header: ReactNode; messages: ReactNode; bottom: ReactNode; expanded?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className={`flex flex-col ${expanded ? 'min-h-[72px] flex-[1_1_0%]' : 'min-h-0 flex-1'}`}>{messages}</div>
      <div className={expanded ? 'flex min-h-0 flex-[3_1_0%] flex-col' : 'flex max-h-[62%] min-h-0 shrink-0 flex-col'}>{bottom}</div>
    </div>
  )
}
