'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatPhoneNumber } from '@/lib/whatsapp'
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Clock,
  CheckCheck,
  Check,
  Search,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface WhatsAppChat {
  id: string // phone number
  phone: string
  customerName?: string
  lastMessage?: string
  lastMessageTimestamp?: string
  lastDirection?: 'inbound' | 'outbound'
  unreadCount?: number
  updatedAt?: any
}

interface WhatsAppMessage {
  id: string
  whatsappMessageId?: string
  senderPhone: string
  senderName?: string
  direction: 'inbound' | 'outbound'
  type: string
  text: string
  status?: 'sent' | 'delivered' | 'read' | 'received' | 'failed'
  timestamp: string
}

export default function WhatsAppChats() {
  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone')
  const nameParam = searchParams.get('name')

  const [chats, setChats] = useState<WhatsAppChat[]>([])
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Subscribe to active WhatsApp conversations in Firestore
  useEffect(() => {
    const chatsRef = collection(db, 'whatsapp_chats')
    const q = query(chatsRef, orderBy('updatedAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatList: WhatsAppChat[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as WhatsAppChat[]

        setChats(chatList)
        setLoadingChats(false)
      },
      (err) => {
        console.error('Error fetching WhatsApp chats:', err)
        setLoadingChats(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // 2. Auto-select or create conversation when URL has ?phone=...
  useEffect(() => {
    if (!phoneParam || loadingChats) return

    const rawClean = formatPhoneNumber(phoneParam)
    if (!rawClean) return

    // Standardize phone (add India country code '91' if 10 digits)
    const targetPhone = rawClean.length === 10 ? `91${rawClean}` : rawClean

    // Find matching chat in existing list
    const existingChat = chats.find(
      (c) => c.phone === targetPhone || c.phone === rawClean || c.phone.endsWith(rawClean)
    )

    if (existingChat) {
      setSelectedChat(existingChat)
    } else {
      // Create temporary chat target so user can start chatting immediately
      const newChat: WhatsAppChat = {
        id: targetPhone,
        phone: targetPhone,
        customerName: nameParam || `Customer (${targetPhone})`,
        lastMessage: 'Direct lead inquiry',
        lastMessageTimestamp: new Date().toISOString(),
        lastDirection: 'outbound',
        unreadCount: 0,
      }

      setSelectedChat(newChat)
    }
  }, [phoneParam, nameParam, loadingChats, chats])

  // 3. Subscribe to messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([])
      return
    }

    setLoadingMessages(true)
    const messagesRef = collection(db, 'whatsapp_messages')
    const q = query(
      messagesRef,
      where('senderPhone', '==', selectedChat.phone),
      orderBy('timestamp', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgList: WhatsAppMessage[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as WhatsAppMessage[]

        setMessages(msgList)
        setLoadingMessages(false)

        // Reset unread count when viewing
        if (selectedChat.unreadCount && selectedChat.unreadCount > 0) {
          updateDoc(doc(db, 'whatsapp_chats', selectedChat.phone), {
            unreadCount: 0,
          }).catch(console.error)
        }
      },
      (err) => {
        console.error('Error fetching chat messages:', err)
        setLoadingMessages(false)
      }
    )

    return () => unsubscribe()
  }, [selectedChat])

  // Scroll to bottom of message history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle sending outbound message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedChat || sending) return

    const textToSend = inputText.trim()
    setInputText('')
    setSending(true)

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedChat.phone,
          text: textToSend,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(`Failed to send WhatsApp message: ${data.error || 'Unknown error'}`)
      } else {
        // Ensure chat entry exists in whatsapp_chats collection with customer name
        if (selectedChat.customerName) {
          await setDoc(
            doc(db, 'whatsapp_chats', selectedChat.phone),
            {
              customerName: selectedChat.customerName,
            },
            { merge: true }
          )
        }
      }
    } catch (err: any) {
      console.error('Failed to send WhatsApp message:', err)
      alert(`Error sending message: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  // Filter chats by search query
  const filteredChats = chats.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  )

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-600" />
            WhatsApp Live Customer Inbox
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Meta WhatsApp Cloud API customer communications
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-[700px] flex">
        {/* Left Sidebar: Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
          {/* Search bar */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search phone number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingChats ? (
              <div className="flex items-center justify-center p-8 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-sm">Loading chats...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium text-gray-600">No active chats found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Inbound customer messages will appear here live.
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full text-left p-4 transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : 'hover:bg-gray-100/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {chat.customerName ? chat.customerName[0].toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {chat.customerName || chat.phone}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(chat.lastMessageTimestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {chat.lastDirection === 'outbound' && <span className="font-medium text-gray-700">You: </span>}
                        {chat.lastMessage || 'No messages'}
                      </p>
                    </div>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="bg-emerald-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    {selectedChat.customerName ? selectedChat.customerName[0].toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {selectedChat.customerName || 'WhatsApp Customer'}
                    </h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      +{selectedChat.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    WhatsApp Connected
                  </span>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]/40">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                    <span className="text-sm">Loading message history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center my-auto text-gray-400 p-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-600" />
                    <p className="text-sm font-medium text-gray-600">Start WhatsApp Chat with {selectedChat.customerName || selectedChat.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">Type your response below to send a WhatsApp message to +{selectedChat.phone}.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound'
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-sm relative ${
                            isOutbound
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isOutbound ? 'text-emerald-100' : 'text-gray-400'
                            }`}
                          >
                            <span>{formatTime(msg.timestamp)}</span>
                            {isOutbound && (
                              <span>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Reply Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Send WhatsApp message to ${selectedChat.customerName || selectedChat.phone}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Select a Conversation</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                Choose a customer from the left sidebar or click &quot;Chat on WhatsApp&quot; on any lead in your Admin dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
