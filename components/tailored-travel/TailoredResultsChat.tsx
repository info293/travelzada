'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Volume2, Mic, ArrowUp as ArrowUpIcon, RefreshCw, Sparkles, Image as ImageIcon, Share2, ClipboardCheck } from 'lucide-react'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
    enquireTrigger?: number
    enquirePackageName?: string
}

export default function TailoredResultsChat({ initialPackages, wizardData, onNewPackages, enquireTrigger, enquirePackageName }: TailoredResultsChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hello! I've analyzed your preferences for ${wizardData?.destinations?.join(', ') || 'your trip'} and found these top matches for you. I'd love to connect you with our travel experts to get this booked! To get started, what is your name?`
        }
    ])
    const [leadCapturePhase, setLeadCapturePhase] = useState<'idle' | 'asking_name' | 'asking_number' | 'completed'>('asking_name')
    const [capturedLead, setCapturedLead] = useState({ name: '', mobile: '' })
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [thinkingMessage, setThinkingMessage] = useState(0)
    const [isSharing, setIsSharing] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)
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
        onTranscript: (text: string) => {
            setInput(text)
        },
        onError: (err: string) => {
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

    // Trigger Lead Capture from external button
    useEffect(() => {
        if (enquireTrigger && enquireTrigger > 0) {
            // 1. Scroll the chat container into view
            const chatContainer = document.getElementById('trip-planner-chat-container')
            if (chatContainer) {
                chatContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }

            // 2. Restart or prompt the lead capture phase
            if (leadCapturePhase === 'idle' || leadCapturePhase === 'completed') {
                setLeadCapturePhase('asking_name')
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Great choice! I'd love to connect you with our travel experts to get the ${enquirePackageName || 'perfect package'} booked! To get started, what is your name?`
                }])
            } else if (leadCapturePhase === 'asking_name') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `You're already inquiring about ${enquirePackageName || 'this package'}! Let's get that booked for you. What is your name?`
                }])
            } else if (leadCapturePhase === 'asking_number') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `You're almost there to book ${enquirePackageName || 'this package'}. Could you share your mobile number?`
                }])
            }
        }
    }, [enquireTrigger])

    const handleSend = async () => {
        if (!input.trim() || isTyping) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        
        // --- LEAD CAPTURE FLOW ---
        if (leadCapturePhase === 'asking_name') {
            const trimmedInput = userMsg.trim();
            
            // AI Extraction to check for travel intent vs name
            try {
                const extractRes = await fetch('/api/ai-planner/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userInput: trimmedInput,
                        currentQuestion: 'asking_name',
                        existingTripInfo: { destination: wizardData?.destinations?.[0] },
                        availableDestinations: []
                    })
                });
                const extractData = await extractRes.json();

                if (extractData.travelIntent) {
                    // User is asking a travel question, not giving a name.
                    // Bypass capture and let the normal AI chat handle it below.
                    console.log("[Lead Capture] Travel intent detected, bypassing name capture.");
                } else if (extractData.name) {
                    // AI extracted a real name
                    setCapturedLead(prev => ({ ...prev, name: extractData.name }))
                    setLeadCapturePhase('asking_number')
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `Thanks ${extractData.name}! What's the best mobile number for our travel experts to reach you?`
                        }])
                        scrollToBottom()
                    }, 500)
                    return
                } else {
                    // AI returned name=null, no travelIntent — it's a greeting or gibberish
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: "I'd love to help you! But first, could you please share your name? 😊"
                    }]);
                    scrollToBottom();
                    return;
                }
            } catch (err) {
                console.error("Smart lead extraction failed, falling back to basic:", err);
                // Fallback: accept anything that looks like a word with 3+ letters
                if (/^[a-zA-Z]{3,}/.test(trimmedInput)) {
                    setCapturedLead(prev => ({ ...prev, name: trimmedInput }))
                    setLeadCapturePhase('asking_number')
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `Thanks ${trimmedInput}! What's the best mobile number for our travel experts to reach you?`
                        }])
                        scrollToBottom()
                    }, 500)
                } else {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: "Could you please share your name? 😊"
                    }]);
                    scrollToBottom();
                }
                return;
            }
        }

        if (leadCapturePhase === 'asking_number') {
            const digitsOnly = userMsg.replace(/\D/g, '');
            
            // If it contains 10+ digits, it's clearly a phone number - fast path
            if (digitsOnly.length >= 10) {
                const finalMobile = digitsOnly.slice(-10);
                setCapturedLead(prev => ({ ...prev, mobile: finalMobile }))
                setLeadCapturePhase('completed')
                
                // Save to Firebase
                try {
                    console.log('Attempting to save lead to Firebase...', { name: capturedLead.name, mobile: finalMobile, db_exists: !!db });
                    if (db) {
                        const docRef = await addDoc(collection(db, 'leads'), {
                            name: capturedLead.name || 'Unknown',
                            mobile: finalMobile,
                            source: 'Tailored Results Chat',
                            sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
                            packageName: enquirePackageName || wizardData?.destinations?.[0] || 'Custom Tailored Trip',
                            destinations: wizardData?.destinations || [],
                            createdAt: serverTimestamp(),
                            status: 'new',
                            read: false
                        })
                        console.log('Lead successfully saved to Firebase! Document ID:', docRef.id);
                    }
                } catch (err) {
                    console.error('Failed to save lead to Firebase:', err)
                }

                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `Perfect! I've noted down your details. Someone from our expert team will contact you shortly at ${finalMobile} to help finalize your dream trip. Do you have any other questions in the meantime?`
                    }])
                    scrollToBottom()
                }, 500)
                return
            }

            // Not a phone number — use AI to understand intent
            try {
                const extractRes = await fetch('/api/ai-planner/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userInput: userMsg,
                        currentQuestion: 'asking_number',
                        existingTripInfo: { destination: wizardData?.destinations?.[0] },
                        availableDestinations: []
                    })
                });
                const extractData = await extractRes.json();

                if (extractData.travelIntent) {
                    // User wants to ask about travel — let it pass to the AI chat below
                    console.log("[Lead Capture] Travel intent during number phase, bypassing.");
                } else if (extractData.feedback === 'skip') {
                    // User said they don't know / will share later
                    setLeadCapturePhase('completed')
                    
                    // Save lead with just name (no number)
                    try {
                        if (db) {
                            await addDoc(collection(db, 'leads'), {
                                name: capturedLead.name || 'Unknown',
                                mobile: 'Not provided',
                                source: 'Tailored Results Chat',
                                sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
                                packageName: enquirePackageName || wizardData?.destinations?.[0] || 'Custom Tailored Trip',
                                destinations: wizardData?.destinations || [],
                                createdAt: serverTimestamp(),
                                status: 'new',
                                read: false
                            })
                        }
                    } catch (err) {
                        console.error('Failed to save lead:', err)
                    }

                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: `No worries, ${capturedLead.name}! Our team will still prepare the best options for you. Feel free to share your number anytime. Meanwhile, do you have any questions about the packages?`
                        }])
                        scrollToBottom()
                    }, 500)
                    return
                } else {
                    // Greeting or gibberish — gently re-ask
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `I just need your mobile number so our travel expert can reach you. Could you please share your 10-digit number? 😊`
                    }]);
                    scrollToBottom();
                    return;
                }
            } catch (err) {
                console.error("AI extraction failed during number phase:", err);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Could you please share a valid 10-digit mobile number?"
                }]);
                scrollToBottom();
                return;
            }
        }
        // --- END LEAD CAPTURE ---

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

                // If they haven't provided contact info yet, ask them again now that we've found them new packages
                if (leadCapturePhase !== 'completed') {
                    setLeadCapturePhase('asking_name')
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: data.message || "I've found some new packages for you! But before we go further, what is your name so our travel experts can help you book?"
                    }])
                    return // Stop further message processing so we don't double up
                }
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

    const handleNewChat = () => {
        setMessages([
            {
                role: 'assistant',
                content: `Hello! I've analyzed your preferences for ${wizardData?.destinations?.join(', ') || 'your trip'} and found these top matches for you. I'd love to connect you with our travel experts to get this booked! To get started, what is your name?`
            }
        ])
        setLeadCapturePhase('asking_name')
        setCapturedLead({ name: '', mobile: '' })
        setInput('')
        setIsTyping(false)
        setThinkingMessage(0)
    }

    const handleSharePlan = async () => {
        setIsSharing(true)
        try {
            const res = await fetch('/api/tailored-travel/share-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wizardData,
                    selectedPackage: initialPackages[0], // Only share the top recommended package
                    initialChatMessages: messages // Sync the current chat context
                })
            })

            const data = await res.json()
            if (data.success && data.shareUrl) {
                await navigator.clipboard.writeText(data.shareUrl)
                setCopiedLink(true)
                setTimeout(() => setCopiedLink(false), 3000)
            }
        } catch (error) {
            console.error("Failed to share plan:", error)
        } finally {
            setIsSharing(false)
        }
    }

    const renderMarkdown = (text: string) => {
        let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
        html = html.replace(/\n/g, '<br/>')
        
        // Custom highlights for eye-catching lead capture
        html = html.replace(/(what is your name\?|what is your name|share your name|share your 10-digit number\?|mobile number|10-digit mobile number\?|phone number)/gi, 
            '<span class="text-primary font-bold text-base">$1</span>'
        )
        return html
    }

    return (
        <div className="bg-transparent overflow-hidden relative w-full h-full flex flex-row">
            {/* Sidebar (Visual Placeholder for Portal Feel) */}
            <div className="hidden lg:flex w-64 bg-white/40 backdrop-blur-md border-r border-gray-100/50 flex-col p-4 shrink-0 h-full">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-100">
                        <div className="w-4 h-4 bg-gradient-to-br from-[#ff8a3d] via-[#f85cb5] to-[#3abef9] rounded-[40%] rotate-45 shadow-sm animate-pulse" />
                    </div>
                    <span className="font-semibold text-gray-700">Trip Planner</span>
                </div>

                <div className="space-y-1 flex-1 overflow-hidden flex flex-col">
                    <button
                        onClick={handleNewChat}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-800 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        New Trip Plan
                    </button>

                    <div className="mt-6 mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">Recent</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        <p className="text-sm text-gray-400 text-center py-4">No saved trips yet</p>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-col flex-1 min-w-0 bg-transparent relative h-full">
                {/* Header */}
                <div className="flex-shrink-0 h-16 border-b border-gray-100/50 flex items-center justify-between px-6 bg-white/40 backdrop-blur-md z-10 w-full">
                    <div className="flex items-center gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <span className="lg:hidden">Trip Planner</span>
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold tracking-wide uppercase">Beta</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSharePlan}
                            disabled={isSharing}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${copiedLink
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                                }`}
                        >
                            {isSharing ? (
                                <span className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            ) : copiedLink ? (
                                <ClipboardCheck className="w-3.5 h-3.5" />
                            ) : (
                                <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">{copiedLink ? 'Copied Link!' : 'Share Plan'}</span>
                        </button>

                        <button
                            onClick={handleNewChat}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 border border-gray-200 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">New Chat</span>
                        </button>
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
                                            ? 'bg-gradient-to-br from-gray-900 to-black text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-100/60 text-gray-800 rounded-tl-sm hover:shadow-md transition-shadow duration-300'
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
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/95 via-white/80 to-transparent pt-10 w-full max-w-[800px] mx-auto z-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200/50 p-2 flex items-end gap-2 relative focus-within:ring-2 focus-within:ring-primary/20 focus-within:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.1)] transition-all duration-300">
                        {/* Add Image Button */}
                        <button
                            type="button"
                            onClick={() => { }}
                            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex-shrink-0 mb-0.5"
                            title="Upload reference photo"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>

                        <div className="flex-1 min-w-0 pl-1">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                                placeholder="Where do you want to go?"
                                className="w-full max-h-32 bg-transparent border-0 focus:ring-0 py-2.5 px-2 text-gray-800 placeholder-gray-400 resize-none text-sm leading-relaxed"
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
        </div>
    )
}
