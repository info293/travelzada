'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface TailoredResultsChatProps {
    initialPackages: any[]
    wizardData: any
}

export default function TailoredResultsChat({ initialPackages, wizardData }: TailoredResultsChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hello! I've analyzed your preferences for ${wizardData?.destinations?.join(', ')} and found these top matches for you. Let me know if you have any questions about them, want to adjust your budget, or need help deciding!`
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const handleSend = async () => {
        if (!input.trim() || isTyping) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setIsTyping(true)

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
                    currentDestination: wizardData?.destinations?.[0] || 'your destination'
                })
            })

            const data = await response.json()

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
            setIsTyping(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Travelzada AI</h3>
                    <p className="text-xs text-gray-500 font-medium">Your Personal Concierge</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-gray-900 text-white rounded-tr-sm'
                                : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            < div className="p-4 bg-white border-t border-gray-100" >
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about these packages..."
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-primary transition-colors disabled:opacity-50 disabled:hover:bg-gray-900"
                    >
                        <Send className="w-4 h-4 translate-x-[-1px] translate-y-[1px]" />
                    </button>
                </div>
            </div >
        </div >
    )
}
