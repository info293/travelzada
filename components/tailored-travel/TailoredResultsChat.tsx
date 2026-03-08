'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Volume2, Mic, ArrowUp as ArrowUpIcon } from 'lucide-react'
import { marked } from 'marked'
import { useVoiceChat } from '@/hooks/useVoiceChat'

const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

const thinkingMessages = [
    'AI thinking...',
    'Analyzing your preferences...',
    'Finding the best options...',
    'Crafting personalized recommendations...',
    'Almost there...',
]

const SparkleIconIndicator = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
    <span
        className={`${className} inline-block bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm`}
    />
)

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface TailoredResultsChatProps {
    initialPackages: any[]
    wizardData: any
    onNewPackages?: (packages: any[]) => void
}

export default function TailoredResultsChat({ initialPackages, wizardData, onNewPackages }: TailoredResultsChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hello! I've analyzed your preferences for ${wizardData?.destinations?.join(', ') || 'your trip'} and found these top matches for you. Let me know if you have any questions about them, want to adjust your budget, or need help deciding!`
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [thinkingMessage, setThinkingMessage] = useState(0)

    // Voice chat integration
    const {
        isListening,
        isSpeaking,
        transcript,
        startListening,
        stopListening,
        speakText,
        stopSpeaking,
        isSupported: isVoiceSupported
    } = useVoiceChat({
        onTranscript: (text) => {
            setInput(text)
        },
        onError: (err) => {
            console.error("Voice chat error:", err)
        }
    })

    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    // Auto-send when voice input stops and we have text
    useEffect(() => {
        if (!isListening && transcript && transcript.trim().length > 0) {
            handleSend()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, transcript])

    const handleSend = async () => {
        if (!input.trim() || isTyping) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setIsTyping(true)
        setThinkingMessage(0)

        // Start rotating thinking messages
        const messageInterval = setInterval(() => {
            setThinkingMessage((prev) => (prev + 1) % thinkingMessages.length)
        }, 2000)

        try {
            const response = await fetch('/api/ai-planner/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userMsg,
                    conversation: messages.slice(-10),
                    shownPackages: initialPackages.map(pkg => ({
                        name: pkg.Destination_Name,
                        duration: `${pkg.Duration_Nights}N/${pkg.Duration_Days}D`,
                        price: `₹${pkg.Price_Min_INR}`,
                        starCategory: pkg.Star_Category,
                        travelType: pkg.Travel_Type,
                        overview: pkg.Overview,
                        itineraryStr: pkg.Day_Wise_Itinerary,
                        itineraryDetails: pkg.Day_Wise_Itinerary_Details
                    })),
                    currentDestination: wizardData?.destinations?.[0] || 'your destination',
                    wizardData: wizardData
                })
            })

            const data = await response.json()

            if (data.packages && data.packages.length > 0 && onNewPackages) {
                onNewPackages(data.packages);
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message || "I'm having trouble connecting right now. Could you try asking that again?"
            }])
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I encountered an error while thinking. Please try again."
            }])
        } finally {
            clearInterval(messageInterval)
            setIsTyping(false)
            setThinkingMessage(0)
        }
    }

    const renderMarkdown = (text: string) => {
        let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
        html = html.replace(/\n/g, '<br/>')
        return html
    }

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header */}
            <div className="flex-shrink-0 h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-100">
                        <SparkleIconIndicator className="animate-pulse w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            Trip Planner
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase">AI</span>
                        </h2>
                    </div>
                </div>
            </div>

            {/* Voice Output Indicator */}
            <AnimatePresence>
                {isSpeaking && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm cursor-pointer hover:bg-black/90 transition-all"
                        onClick={(e) => {
                            e.stopPropagation()
                            stopSpeaking()
                        }}
                    >
                        <div className="flex gap-1 items-center">
                            <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full" />
                            <span className="animate-pulse w-1 h-5 bg-white/80 rounded-full delay-75" />
                            <span className="animate-pulse w-1 h-3 bg-white/50 rounded-full delay-150" />
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap">Speaking... Click to Stop</span>
                        <Square className="w-3 h-3 ml-1 fill-white" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-32 space-y-4">
                <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            variants={fadeIn}
                            initial="hidden"
                            animate="visible"
                            layout
                            className="flex flex-col gap-2 w-full"
                        >
                            <div className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                        <SparkleIconIndicator className="animate-pulse w-4 h-4" />
                                    </div>
                                )}

                                <div
                                    className={`group relative max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed ${message.role === 'user'
                                        ? 'bg-black text-white rounded-tr-sm'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                        }`}
                                >
                                    {message.role === 'assistant' ? (
                                        <div
                                            className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-strong:font-bold prose-strong:text-gray-900"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                        />
                                    ) : (
                                        <p className="whitespace-pre-line">{message.content}</p>
                                    )}

                                    {/* Speaker Button for AI messages */}
                                    {message.role === 'assistant' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                isSpeaking ? stopSpeaking() : speakText(message.content)
                                            }}
                                            className="absolute -bottom-5 left-0 p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Read aloud"
                                        >
                                            {isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <div className="flex items-start gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse mt-1">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl px-5 py-4 shadow-sm max-w-[85%]">
                            <div className="flex items-center gap-3">
                                <div className="flex space-x-1.5">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                                <p className="text-sm text-gray-600 font-medium animate-pulse">
                                    {thinkingMessages[thinkingMessage]}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Floating Capsule) */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-6">
                <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-2 flex items-end gap-2 relative z-20">
                    <div className="flex-1 min-w-0 pl-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                            placeholder="Ask follow-up questions..."
                            className="w-full max-h-32 bg-transparent border-0 focus:ring-0 py-2.5 pl-4 pr-2 text-gray-800 placeholder-gray-400 resize-none text-sm leading-relaxed"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                    </div>

                    {/* Voice Input */}
                    {isVoiceSupported && (
                        <button
                            onClick={isListening ? stopListening : startListening}
                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0 mb-0.5 ${isListening
                                ? 'bg-red-100 text-red-500 animate-pulse'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            <Mic className={`w-5 h-5 ${isListening ? 'fill-current' : ''}`} />
                        </button>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-0.5"
                    >
                        {isTyping ? <span className="animate-spin text-xs">...</span> : <ArrowUpIcon className="w-5 h-5" />}
                    </button>
                </div>
                <div className="text-center mt-2 pb-2">
                    <p className="text-[10px] text-gray-400 leading-none">AI can make mistakes. Please verify important travel info.</p>
                </div>
            </div>
        </div>
    )
}
