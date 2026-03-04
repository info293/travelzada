'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MessageCircle, Trash2, ChevronDown, ChevronUp, RefreshCw, User, Bot, Search, Calendar, MapPin, Clock } from 'lucide-react'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface TripInfo {
    destination?: string
    travelDate?: string
    days?: string
    budget?: string
    hotelType?: string
    travelType?: string
}

interface ChatSession {
    id: string
    sessionId: string
    messages: ChatMessage[]
    tripInfo?: TripInfo
    sourceUrl?: string
    messageCount?: number
    startedAt?: any
    lastMessageAt?: any
}

export default function AIPlannerChats() {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const fetchSessions = useCallback(async () => {
        if (!db) return
        setLoading(true)
        try {
            const q = query(collection(db, 'ai_planner_chats'), orderBy('lastMessageAt', 'desc'))
            const snap = await getDocs(q)
            const data: ChatSession[] = []
            snap.forEach((d) => {
                data.push({ id: d.id, ...(d.data() as Omit<ChatSession, 'id'>) })
            })
            setSessions(data)
        } catch (e) {
            console.error('Failed to fetch AI chat sessions:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchSessions() }, [fetchSessions])

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this chat session?')) return
        if (!db) return
        await deleteDoc(doc(db, 'ai_planner_chats', id))
        setSessions(prev => prev.filter(s => s.id !== id))
    }

    const formatDate = (ts: any) => {
        if (!ts) return '—'
        const d = ts?.toDate?.() ?? new Date(ts)
        return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    }

    const filtered = sessions.filter(s => {
        const dest = s.tripInfo?.destination?.toLowerCase() || ''
        const msgs = s.messages?.map(m => m.content).join(' ').toLowerCase() || ''
        const q = search.toLowerCase()
        return dest.includes(q) || msgs.includes(q) || s.sessionId?.includes(q)
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">AI Planner Chats</h1>
                            <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by destination or content..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-72 bg-white"
                            />
                        </div>
                        <button
                            onClick={fetchSessions}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading chat sessions...</p>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-purple-300" />
                        </div>
                        <h3 className="text-gray-700 font-semibold text-lg">No chat sessions found</h3>
                        <p className="text-gray-400 text-sm mt-1">Chat sessions will appear here as users interact with the AI Planner.</p>
                    </div>
                ) : (
                    filtered.map((session) => {
                        const isOpen = expandedId === session.id
                        const userMsgs = session.messages?.filter(m => m.role === 'user') || []
                        const totalMsgs = session.messages?.length || 0
                        const dest = session.tripInfo?.destination
                        const firstUserMsg = userMsgs[0]?.content || ''

                        return (
                            <div
                                key={session.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all"
                            >
                                {/* Session Header Row */}
                                <div
                                    className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedId(isOpen ? null : session.id)}
                                >
                                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MessageCircle className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {dest && (
                                                <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    {dest}
                                                </span>
                                            )}
                                            {session.tripInfo?.days && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                                                    {session.tripInfo.days} days
                                                </span>
                                            )}
                                            {session.tripInfo?.travelType && (
                                                <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium capitalize">
                                                    {session.tripInfo.travelType}
                                                </span>
                                            )}
                                            {session.tripInfo?.budget && (
                                                <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full font-medium">
                                                    ₹{parseInt(session.tripInfo.budget).toLocaleString('en-IN')} budget
                                                </span>
                                            )}
                                        </div>
                                        {!dest && firstUserMsg && (
                                            <p className="text-sm text-gray-600 truncate mt-0.5">"{firstUserMsg}"</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(session.lastMessageAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-3 h-3" />
                                                {totalMsgs} message{totalMsgs !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(session.id) }}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </div>
                                </div>

                                {/* Expanded Chat Messages */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                                        {/* Trip Info Summary */}
                                        {session.tripInfo && Object.values(session.tripInfo).some(Boolean) && (
                                            <div className="mb-4 p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap gap-3 text-sm text-gray-600">
                                                {session.tripInfo.destination && <span><strong>Destination:</strong> {session.tripInfo.destination}</span>}
                                                {session.tripInfo.travelDate && <span><strong>Date:</strong> {session.tripInfo.travelDate}</span>}
                                                {session.tripInfo.days && <span><strong>Days:</strong> {session.tripInfo.days}</span>}
                                                {session.tripInfo.travelType && <span><strong>Type:</strong> {session.tripInfo.travelType}</span>}
                                                {session.tripInfo.hotelType && <span><strong>Hotel:</strong> {session.tripInfo.hotelType}</span>}
                                                {session.tripInfo.budget && <span><strong>Budget:</strong> ₹{parseInt(session.tripInfo.budget).toLocaleString('en-IN')}</span>}
                                            </div>
                                        )}

                                        {/* Messages */}
                                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                                            {session.messages?.map((msg, idx) => (
                                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5
                            ${msg.role === 'user' ? 'bg-gray-800' : 'bg-purple-600'}`}>
                                                        {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                            ${msg.role === 'user'
                                                            ? 'bg-gray-900 text-white rounded-br-sm'
                                                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Source URL */}
                                        {session.sourceUrl && (
                                            <p className="mt-3 text-xs text-gray-400 truncate">
                                                Source: <a href={session.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">{session.sourceUrl}</a>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
