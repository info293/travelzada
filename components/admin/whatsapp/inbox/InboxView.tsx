'use client'

import type { ComponentProps, ReactNode } from 'react'
import ChatList from './ChatList'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import Composer from './Composer'
import StartFlow from './StartFlow'
import HelpCard, { ConversationPlaceholder } from './HelpCard'
import InboxShell, { ConversationPane } from './InboxShell'

export type InboxBottom =
  | { kind: 'composer'; props: ComponentProps<typeof Composer> }
  | { kind: 'start'; props: ComponentProps<typeof StartFlow> }

export interface InboxConversation {
  header: ComponentProps<typeof ChatHeader>
  messages: ComponentProps<typeof MessageList>
  bottom: InboxBottom
}

/**
 * The whole inbox screen, purely from props (no Firestore): used by WhatsAppChats (live data) and by the
 * dev-only /zz-inbox-preview page (mock data).
 */
export default function InboxView({
  list,
  help,
  conversation,
  placeholder,
  forceMobile,
  className,
  children,
}: {
  list: Omit<ComponentProps<typeof ChatList>, 'helpCard'>
  help: { visible: boolean; onDismiss: () => void }
  /** The open chat, or null → `placeholder` */
  conversation: InboxConversation | null
  placeholder: ComponentProps<typeof ConversationPlaceholder>
  forceMobile?: boolean
  className?: string
  /** Modals (template picker) */
  children?: ReactNode
}) {
  const expanded = conversation?.bottom.kind === 'start' && conversation.bottom.props.step === 'fill'
  return (
    <>
      <InboxShell
        forceMobile={forceMobile}
        className={className}
        hasChat={!!conversation || placeholder.state !== 'empty'}
        list={<ChatList {...list} helpCard={help.visible ? <HelpCard onDismiss={help.onDismiss} /> : null} />}
        conversation={
          conversation ? (
            <ConversationPane
              expanded={expanded}
              header={<ChatHeader {...conversation.header} forceBack={forceMobile} />}
              messages={<MessageList {...conversation.messages} />}
              bottom={conversation.bottom.kind === 'composer' ? <Composer {...conversation.bottom.props} /> : <StartFlow {...conversation.bottom.props} />}
            />
          ) : (
            <ConversationPlaceholder {...placeholder} />
          )
        }
      />
      {children}
    </>
  )
}
