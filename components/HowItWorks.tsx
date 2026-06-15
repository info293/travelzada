import Link from 'next/link'

const steps = [
  {
    number: '01',
    title: 'Share Your Preferences',
    description: 'Tell us where you want to go, your dates, budget, and travel vibe.',
    iconBg: 'bg-purple-100',
    icon: (
      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'AI Creates the Itinerary',
    description: 'Our planner instantly builds a complete schedule with hotels and must-dos.',
    iconBg: 'bg-teal-100',
    icon: (
      <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Human Planner Refines It',
    description: "A Travelzada expert reviews every detail so it's ready to book.",
    iconBg: 'bg-orange-100',
    icon: (
      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export default function HowItWorks() {
  return (
    <section className="relative rounded-[2rem] overflow-hidden mx-4 md:mx-8 lg:mx-10 my-6">

      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#c4e9f5] via-[#8dcadb] to-[#55aabe]" />

      {/* Mountain landscape SVG — bottom */}
      <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none">
        <svg
          viewBox="0 0 1440 210"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-[150px]"
        >
          {/* Distant mountains */}
          <path
            d="M0,150 C180,110 360,130 540,100 C720,70 900,110 1080,85 C1260,60 1380,90 1440,80 L1440,210 L0,210 Z"
            fill="#7bbfcf"
            opacity="0.85"
          />
          {/* Mid mountains */}
          <path
            d="M0,170 C120,145 240,158 380,138 C520,118 620,150 760,128 C900,106 1020,145 1160,122 C1300,99 1390,130 1440,118 L1440,210 L0,210 Z"
            fill="#4a96aa"
          />
          {/* Near dark mountains */}
          <path
            d="M0,188 C90,170 180,180 300,163 C420,146 500,174 630,156 C760,138 860,168 990,150 C1120,132 1240,162 1360,145 C1410,138 1430,148 1440,145 L1440,210 L0,210 Z"
            fill="#2d7585"
          />
          {/* Foreground silhouette */}
          <path
            d="M0,200 C60,190 120,196 180,188 C240,180 300,194 360,186 C420,178 480,192 540,184 C600,176 660,190 720,182 C780,174 840,188 900,180 C960,172 1020,186 1080,178 C1140,170 1200,184 1260,176 C1320,168 1380,182 1440,178 L1440,210 L0,210 Z"
            fill="#1a5262"
          />
          {/* Tree silhouettes — left cluster */}
          <g fill="#164454">
            <polygon points="20,205 28,184 36,205" />
            <polygon points="34,205 44,180 54,205" />
            <polygon points="52,205 62,176 72,205" />
            <polygon points="70,205 80,182 90,205" />
            <polygon points="88,205 98,178 108,205" />
            <polygon points="106,205 116,184 126,205" />
            <polygon points="122,205 130,188 138,205" />
          </g>
          {/* Tree silhouettes — right cluster */}
          <g fill="#164454">
            <polygon points="1302,205 1310,186 1318,205" />
            <polygon points="1316,205 1326,180 1336,205" />
            <polygon points="1334,205 1344,176 1354,205" />
            <polygon points="1352,205 1362,182 1372,205" />
            <polygon points="1370,205 1380,178 1390,205" />
            <polygon points="1388,205 1398,184 1408,205" />
            <polygon points="1404,205 1414,188 1424,205" />
          </g>
          {/* Scattered far trees on mid mountain */}
          <g fill="#2d7585" opacity="0.8">
            <polygon points="260,140 265,130 270,140" />
            <polygon points="440,132 446,120 452,132" />
            <polygon points="680,134 686,122 692,134" />
            <polygon points="880,128 886,116 892,128" />
            <polygon points="1100,136 1106,124 1112,136" />
          </g>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 pt-8 pb-[25px]">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="font-serif italic text-pink-400 text-lg mb-2">Simple Process</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2c4e]">
            How It Works
          </h2>
        </div>

        {/* Three cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Icon box */}
              <div className={`w-16 h-16 ${step.iconBg} rounded-xl mx-auto mb-5 flex items-center justify-center`}>
                {step.icon}
              </div>
              <h3 className="text-base font-bold text-[#1a2c4e] mb-3">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-5">
          <Link
            href="/tailored-travel"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-full text-base font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300"
          >
            Plan My Trip
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  )
}
