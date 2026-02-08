'use client'

import { useEffect, useState } from 'react'

export default function AILoader({ message = "Loading..." }: { message?: string }) {
    const [dots, setDots] = useState('')

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.')
        }, 400)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700">
            {/* Animated background particles - using static values to prevent SSR hydration mismatch */}
            <div className="absolute inset-0 overflow-hidden">
                {[
                    { w: 87, h: 102, l: 12, t: 8, delay: 2.1, duration: 14 },
                    { w: 54, h: 71, l: 78, t: 25, delay: 0.5, duration: 18 },
                    { w: 102, h: 45, l: 34, t: 67, delay: 3.8, duration: 12 },
                    { w: 68, h: 89, l: 56, t: 42, delay: 1.2, duration: 16 },
                    { w: 41, h: 63, l: 91, t: 73, delay: 4.2, duration: 15 },
                    { w: 93, h: 58, l: 23, t: 89, delay: 0.8, duration: 19 },
                    { w: 76, h: 84, l: 67, t: 15, delay: 2.9, duration: 13 },
                    { w: 49, h: 95, l: 45, t: 56, delay: 1.7, duration: 17 },
                    { w: 82, h: 52, l: 8, t: 34, delay: 3.3, duration: 11 },
                    { w: 65, h: 78, l: 89, t: 48, delay: 0.3, duration: 20 },
                    { w: 98, h: 67, l: 38, t: 82, delay: 4.6, duration: 14 },
                    { w: 57, h: 91, l: 72, t: 5, delay: 2.4, duration: 16 },
                    { w: 44, h: 55, l: 16, t: 61, delay: 1.9, duration: 18 },
                    { w: 89, h: 73, l: 54, t: 29, delay: 3.1, duration: 12 },
                    { w: 61, h: 48, l: 83, t: 94, delay: 0.7, duration: 15 },
                    { w: 78, h: 86, l: 27, t: 18, delay: 4.0, duration: 17 },
                    { w: 52, h: 69, l: 62, t: 76, delay: 2.6, duration: 13 },
                    { w: 95, h: 42, l: 41, t: 3, delay: 1.4, duration: 19 },
                    { w: 73, h: 97, l: 95, t: 51, delay: 3.7, duration: 11 },
                    { w: 36, h: 81, l: 5, t: 88, delay: 0.1, duration: 20 },
                ].map((particle, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white/10 animate-float"
                        style={{
                            width: `${particle.w}px`,
                            height: `${particle.h}px`,
                            left: `${particle.l}%`,
                            top: `${particle.t}%`,
                            animationDelay: `${particle.delay}s`,
                            animationDuration: `${particle.duration}s`,
                        }}
                    />
                ))}
            </div>

            {/* Header bar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white relative z-10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold truncate">AI Trip Planner</h2>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <p className="text-xs text-white/80">Online • Step 1 of 5</p>
                    </div>
                </div>
                {/* Progress indicator */}
                <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
                        <circle
                            cx="18" cy="18" r="16"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray="100"
                            strokeDashoffset="100"
                            className="animate-progress-circle"
                        />
                    </svg>
                    <span className="text-xs font-bold">0%</span>
                </div>
            </div>

            {/* Main loading content */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
                {/* AI Brain Animation */}
                <div className="relative mb-8">
                    {/* Outer rotating ring */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/20 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-white/50 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                    </div>

                    {/* Inner pulsing circle with AI icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse shadow-2xl">
                            <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                    </div>

                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full shadow-lg shadow-pink-400/50"></div>
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"></div>
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '5s' }}>
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"></div>
                    </div>
                </div>

                {/* Loading text */}
                <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {message}{dots}
                    </h2>
                    <p className="text-white/70 text-sm md:text-base">
                        AI is preparing your experience
                    </p>
                </div>

                {/* Animated wave line */}
                <div className="mt-8 flex items-center gap-1">
                    {[...Array(7)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 bg-white/60 rounded-full animate-wave"
                            style={{
                                height: '24px',
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Custom animations */}
            <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1.5);
          }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        @keyframes progress-circle {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .animate-progress-circle {
          animation: progress-circle 3s ease-out forwards;
        }
      `}</style>
        </div>
    )
}
