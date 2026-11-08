'use client'

/**
 * /presentation: the Travelzada × BNI Jaipur Swastik deck as a scroll story.
 * Every chapter maps to a slide; motion is scroll-linked (framer-motion) and switches off for reduced-motion users.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

const A = (name: string) => `/presentation/${name}`
const LOGO = '/images/logo/Travelzada Logo April (1).png'
const WHATSAPP = 'https://wa.me/919929962350?text=' + encodeURIComponent('Hi Travelzada! I saw your BNI presentation and would like to plan a trip.')

const NAVY = '#13307C'
const BLUE = '#2B59E0'
const INK = '#0B1533'
const PAPER = '#F3F6FF'

const CHAPTERS = [
  { id: 'start', label: 'Travelzada' },
  { id: 'world-tour', label: 'World Tour' },
  { id: 'without', label: 'Life without travel' },
  { id: 'with', label: 'Life with travel' },
  { id: 'team', label: 'The team' },
  { id: 'experiences', label: 'Experiences' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'destinations', label: 'Destinations' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'customers', label: '1500+ customers' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'asks-gives', label: 'Asks & Gives' },
  { id: 'finale', label: 'Finale' },
]

// ─── Motion helpers ───────────────────────────────────────────────────────────

/** Scroll progress of an element through the viewport (0 entering → 1 leaving) */
function useSectionProgress(offset: any = ['start end', 'end start']) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset })
  return { ref, progress: scrollYProgress }
}

/** Moves children vertically at a different speed from the page: speed > 0 lags, < 0 leads */
function Parallax({ speed = 0.2, className = '', children, style }: { speed?: number; className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress()
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [speed * 220, speed * -220])
  return (
    <motion.div ref={ref} style={{ ...style, y }} className={className}>
      {children}
    </motion.div>
  )
}

/**
 * Image that drifts inside its frame for depth. The zoom is kept small (≈11%) because extra
 * scaling enlarges the photo and makes it look soft; the drift is sized to stay inside that zoom.
 */
function DepthImage({ src, alt, className = '', strength = 5, imgClassName = '' }: { src: string; alt: string; className?: string; strength?: number; imgClassName?: string }) {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress()
  const drift = Math.min(strength, 5)
  const y = useTransform(progress, [0, 1], reduce ? ['0%', '0%'] : [`-${drift}%`, `${drift}%`])
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ y, scale: reduce ? 1 : 1 + (drift * 2 + 1) / 100 }}
        className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  )
}

function Reveal({ children, delay = 0, className = '', y = 40 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Title({ plain, script, light = false, className = '' }: { plain: string; script?: string; light?: boolean; className?: string }) {
  return (
    <h2 className={`font-figtree font-extrabold tracking-[-0.02em] leading-[1.02] text-[clamp(38px,6.4vw,92px)] ${light ? 'text-white' : ''} ${className}`} style={light ? undefined : { color: NAVY }}>
      {plain}{' '}
      {script && <span className="font-pinyon font-normal tracking-normal text-[1.08em]" style={{ color: light ? '#A9C1FF' : BLUE }}>{script}</span>}
    </h2>
  )
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`text-[12px] sm:text-[13px] font-bold tracking-[0.32em] uppercase mb-5 ${light ? 'text-white/60' : ''}`} style={light ? undefined : { color: BLUE }}>{children}</div>
}

function Counter({ to, suffix = '', className = '' }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1800)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref} className={className}>{n.toLocaleString('en-IN')}{suffix}</span>
}

// ─── Chrome: top bar, progress, chapter dots ─────────────────────────────────

function Chrome() {
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const [active, setActive] = useState('start')
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setActive(e.target.id)
          setDark((e.target as HTMLElement).dataset.dark === 'true')
        }
      }),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <motion.div className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left" style={{ scaleX: width, background: BLUE }} />
      <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${dark ? 'bg-black/30' : 'bg-white/70'} backdrop-blur-md`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" aria-label="Travelzada home" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Travelzada" className={`h-7 sm:h-8 w-auto transition ${dark ? 'brightness-0 invert' : ''}`} />
          </Link>
          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline text-[12px] font-semibold tracking-[0.2em] uppercase ${dark ? 'text-white/70' : 'text-slate-500'}`}>
              {CHAPTERS.find((c) => c.id === active)?.label}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={A('bni-swastik.png')} alt="BNI Jaipur · Swastik" className={`h-7 sm:h-8 w-auto rounded-md ${dark ? 'bg-white px-1.5 py-0.5' : ''}`} />
          </div>
        </div>
      </header>
      <nav className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-3" aria-label="Chapters">
        {CHAPTERS.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="group flex items-center justify-end gap-3" aria-label={c.label}>
            <span className={`text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition ${dark ? 'text-white' : 'text-slate-600'}`}>{c.label}</span>
            <span
              className="block rounded-full transition-all duration-300"
              style={{
                width: active === c.id ? 10 : 6,
                height: active === c.id ? 10 : 6,
                background: active === c.id ? BLUE : dark ? 'rgba(255,255,255,.4)' : 'rgba(19,48,124,.25)',
              }}
            />
          </a>
        ))}
      </nav>
    </>
  )
}

// ─── 1. Hero ──────────────────────────────────────────────────────────────────

const HERO_PHOTOS = [
  { src: 'honeymoon.webp', cls: 'left-[3%] top-[16%] w-[26vw] max-w-[230px] aspect-[3/4] -rotate-6', speed: -260, x: -120 },
  { src: 'babymoon.webp', cls: 'right-[4%] top-[14%] w-[24vw] max-w-[220px] aspect-square rotate-6', speed: -320, x: 140 },
  { src: 'bali.webp', cls: 'left-[9%] bottom-[8%] w-[22vw] max-w-[200px] aspect-[3/4] rotate-3', speed: -180, x: -160 },
  { src: 'kevin-nicole.webp', cls: 'right-[10%] bottom-[7%] w-[28vw] max-w-[260px] aspect-[4/3] -rotate-3', speed: -220, x: 160 },
  { src: 'thailand.webp', cls: 'hidden md:block left-[30%] top-[5%] w-[11vw] max-w-[130px] aspect-[3/4] rotate-12', speed: -380, x: -60 },
  { src: 'content-creator.webp', cls: 'hidden md:block right-[31%] bottom-[4%] w-[12vw] max-w-[140px] aspect-square -rotate-12', speed: -140, x: 60 },
]

function HeroPhoto({ p, progress }: { p: (typeof HERO_PHOTOS)[number]; progress: MotionValue<number> }) {
  const reduce = useReducedMotion()
  const y = useTransform(progress, [0, 1], [0, reduce ? 0 : p.speed])
  const x = useTransform(progress, [0, 1], [0, reduce ? 0 : p.x])
  return (
    <motion.div style={{ y, x }} className={`absolute ${p.cls} rounded-[22px] overflow-hidden shadow-[0_30px_60px_-30px_rgba(11,21,51,.55)] ring-4 ring-white`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={A(p.src)} alt="" className="w-full h-full object-cover" />
    </motion.div>
  )
}

function Hero() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start start', 'end start'])
  const titleScale = useTransform(progress, [0, 1], [1, reduce ? 1 : 0.82])
  const titleY = useTransform(progress, [0, 1], [0, reduce ? 0 : 160])
  const titleOpacity = useTransform(progress, [0, 0.75], [1, 0])
  return (
    <section id="start" ref={ref} className="relative h-[100svh] min-h-[620px] overflow-hidden" style={{ background: `radial-gradient(1200px 600px at 50% 40%, #FFFFFF 0%, ${PAPER} 55%, #DCE6FF 100%)` }}>
      <motion.div aria-hidden className="absolute -left-40 top-1/3 w-[520px] h-[520px] rounded-full blur-3xl opacity-40" style={{ background: '#BFD0FF', y: useTransform(progress, [0, 1], [0, -200]) }} />
      <motion.div aria-hidden className="absolute -right-40 top-10 w-[460px] h-[460px] rounded-full blur-3xl opacity-40" style={{ background: '#FFD3E1', y: useTransform(progress, [0, 1], [0, -120]) }} />
      {HERO_PHOTOS.map((p) => <HeroPhoto key={p.src} p={p} progress={progress} />)}

      <motion.div style={{ scale: titleScale, y: titleY, opacity: titleOpacity }} className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Travelzada" className="w-[min(78vw,560px)] h-auto mx-auto" />
        </motion.div>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 font-figtree font-semibold text-[clamp(20px,2.6vw,34px)]"
          style={{ color: INK }}
        >
          with your <span className="font-pinyon font-normal text-[1.35em]" style={{ color: BLUE }}>better half</span> 💞
        </motion.p>
      </motion.div>

      <motion.div style={{ opacity: titleOpacity }} className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase" >
        <span style={{ color: NAVY }}>Scroll</span>
        <motion.span animate={reduce ? undefined : { y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="block w-[2px] h-8 rounded-full" style={{ background: BLUE }} />
      </motion.div>
    </section>
  )
}

// ─── 2. World Tour (pinned, video grows) ─────────────────────────────────────

function WorldTour() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start start', 'end end'])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const scale = useTransform(progress, [0, 0.5], reduce ? [1, 1] : [0.72, 1])
  const rotate = useTransform(progress, [0, 0.5], reduce ? [0, 0] : [-8, 0])
  const marqueeX = useTransform(progress, [0, 1], reduce ? ['0%', '0%'] : ['10%', '-45%'])
  const textY = useTransform(progress, [0, 1], reduce ? [0, 0] : [80, -80])

  useMotionValueEvent(progress, 'change', (v) => {
    const vid = videoRef.current
    if (!vid) return
    if (v > 0.02 && v < 0.98) vid.play().catch(() => {})
    else vid.pause()
  })

  return (
    <section id="world-tour" data-dark="true" ref={ref} className="relative h-[260vh]" style={{ background: INK }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden flex items-center">
        <motion.div aria-hidden style={{ x: marqueeX }} className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-figtree font-black text-[22vw] leading-none text-transparent [-webkit-text-stroke:2px_rgba(169,193,255,.18)] select-none">
          WORLD TOUR · WORLD TOUR ·
        </motion.div>
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <motion.div style={{ y: textY }} className="text-white order-2 md:order-1 text-center md:text-left">
            <h2 className="font-figtree font-extrabold text-[clamp(48px,8vw,120px)] leading-[0.95] tracking-[-0.03em]">
              World
              <br />
              <span className="font-pinyon font-normal text-[#A9C1FF] text-[1.1em] tracking-normal">Tour</span>
            </h2>
          </motion.div>
          <div className="order-1 md:order-2 flex justify-center">
            <motion.div style={{ scale, rotate }} className="relative w-[min(72vw,340px)] aspect-[9/16] rounded-[38px] overflow-hidden ring-[10px] ring-white/10 shadow-[0_60px_120px_-40px_rgba(43,89,224,.6)]">
              <video
                ref={videoRef}
                src={A('world-tour.mp4')}
                poster={A('world-tour-poster.webp')}
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setMuted((m) => !m)
                  videoRef.current?.play().catch(() => {})
                }}
                className="absolute bottom-4 right-4 rounded-full bg-black/50 backdrop-blur text-white text-[12px] font-semibold px-3.5 py-2"
              >
                {muted ? '🔇 Tap for sound' : '🔊 Sound on'}
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 3. Life without travel ───────────────────────────────────────────────────

const WITHOUT = [
  { n: '01', label: 'Stress', src: 'stress.webp', speed: 0.1 },
  { n: '02', label: 'Burnout', src: 'burnout.webp', speed: 0.3 },
  { n: '03', label: 'Ageing', src: 'ageing.webp', speed: 0.18 },
]

function LifeWithout() {
  return (
    <section id="without" data-dark="true" className="relative py-28 sm:py-40 overflow-hidden" style={{ background: '#0A0E18' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Eyebrow light>The problem</Eyebrow>
          <Title plain="Life Without" script="Travel" light />
          <p className="mt-6 text-white/55 text-[17px] max-w-[520px]">Work, screens, repeat. Couples stop making memories, and it shows.</p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-5 sm:gap-7 mt-16">
          {WITHOUT.map((w, i) => (
            <Parallax key={w.n} speed={w.speed}>
              <Reveal delay={i * 0.12}>
                <div className="relative rounded-[26px] overflow-hidden">
                  <DepthImage src={A(w.src)} alt={w.label} className="aspect-[3/4]" imgClassName="grayscale contrast-125 brightness-75" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute left-6 bottom-6 text-white">
                    <div className="font-figtree text-[13px] font-bold tracking-[0.3em] text-white/50">{w.n}</div>
                    <div className="font-figtree text-[34px] font-extrabold">{w.label}</div>
                  </div>
                </div>
              </Reveal>
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 4. Life with travel (colour returns) ────────────────────────────────────

function LifeWith() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start end', 'center center'])
  const bg = useTransform(progress, [0, 1], ['#0A0E18', PAPER])
  const gray = useTransform(progress, [0.2, 1], reduce ? ['grayscale(0)', 'grayscale(0)'] : ['grayscale(1)', 'grayscale(0)'])
  const cards = [
    { src: 'content-creator.webp', title: 'Content Creator', tag: 'Travels often', speed: 0.12, span: 'sm:col-span-2', frame: 'aspect-[4/5]' },
    { src: 'kevin-nicole.webp', title: 'Instagram Co-founder Kevin and Nicole', tag: 'Travels often', speed: 0.3, span: 'sm:col-span-3 sm:mt-24', frame: 'aspect-[4/3]' },
  ]
  return (
    <motion.section id="with" ref={ref} style={{ background: bg }} className="relative py-28 sm:py-40 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Eyebrow>The difference</Eyebrow>
          <Title plain="Life With" script="Travel" />
          <p className="mt-6 text-slate-600 text-[17px] max-w-[520px]">The happiest, most creative couples we know have one thing in common: they travel often.</p>
        </Reveal>
        <div className="grid sm:grid-cols-5 gap-6 mt-14">
          {cards.map((c) => (
            <Parallax key={c.src} speed={c.speed} className={c.span}>
              <motion.div style={{ filter: gray }} className="relative rounded-[28px] overflow-hidden shadow-[0_40px_80px_-40px_rgba(11,21,51,.5)]">
                <DepthImage src={A(c.src)} alt={c.title} className={c.frame} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute top-5 left-5 bg-white text-[12px] font-bold rounded-full px-3 py-1" style={{ color: BLUE }}>{c.tag}</span>
                <div className="absolute left-6 bottom-6 right-6 text-white font-figtree text-[clamp(20px,2.2vw,28px)] font-bold">{c.title}</div>
              </motion.div>
            </Parallax>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

// ─── 5. The team / proof ──────────────────────────────────────────────────────

const TEAM_LOGOS = ['logo-makemytrip.png', 'logo-blinkit.png', 'logo-zomato.png', 'logo-oyo.png', 'logo-thrillophilia.png', 'logo-airtel.png']

function Team() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start end', 'center center'])
  const rotateX = useTransform(progress, [0, 1], reduce ? [0, 0] : [28, 0])
  const scale = useTransform(progress, [0, 1], reduce ? [1, 1] : [0.86, 1])
  return (
    <section id="team" ref={ref} className="relative py-28 sm:py-40 overflow-hidden" style={{ background: PAPER }}>
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <Reveal>
          <Eyebrow>Who builds it</Eyebrow>
          <Title plain="Journeys designed" script="only for two" />
          <p className="mt-6 text-slate-600 text-[17px] max-w-[620px] mx-auto">
            A team with experience across India’s best consumer and travel brands, building one thing: the perfect trip for couples.
          </p>
        </Reveal>

        <div className="relative mt-16 [perspective:1600px]">
          {TEAM_LOGOS.map((l, i) => (
            <Parallax
              key={l}
              speed={i % 2 ? 0.45 : -0.35}
              className={`hidden md:flex absolute z-20 bg-white rounded-2xl shadow-[0_20px_40px_-20px_rgba(11,21,51,.35)] p-3 h-16 items-center ${
                ['-left-4 top-[6%]', '-right-4 top-[2%]', '-left-10 top-[44%]', '-right-8 top-[40%]', 'left-[2%] bottom-[2%]', 'right-[4%] bottom-[6%]'][i]
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={A(l)} alt={l.replace('logo-', '').replace('.png', '')} className="h-10 w-auto" />
            </Parallax>
          ))}
          <motion.div style={{ rotateX, scale, transformOrigin: 'center bottom' }} className="relative mx-auto max-w-[920px] rounded-[22px] overflow-hidden bg-white shadow-[0_50px_100px_-40px_rgba(19,48,124,.55)] ring-1 ring-black/5">
            <div className="h-9 flex items-center gap-1.5 px-4 bg-[#EEF1F7] border-b border-black/5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" /><span className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><span className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-4 text-[12px] text-slate-500 bg-white rounded-md px-3 py-0.5">travelzada.com</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={A('website.webp')} alt="travelzada.com" className="w-full h-auto block" loading="lazy" />
          </motion.div>
        </div>

        <div className="md:hidden flex flex-wrap justify-center gap-3 mt-10">
          {TEAM_LOGOS.map((l) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={l} src={A(l)} alt="" className="h-9 w-auto bg-white rounded-xl p-1.5 shadow-sm" />
          ))}
        </div>

        <Reveal className="mt-14 flex flex-col items-center gap-4">
          <div className="text-[12px] font-bold tracking-[0.3em] uppercase text-slate-500">Recognised by</div>
          <div className="flex items-center gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={A('logo-istart.png')} alt="iStart Rajasthan" className="h-10 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={A('logo-startupindia.png')} alt="Startup India" className="h-10 w-auto" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 6. Curated experiences (pinned horizontal scroll) ───────────────────────

const EXPERIENCES = [
  { title: 'Honeymoon', src: 'honeymoon.webp', text: 'Private villas, candlelit dinners and slow mornings.' },
  { title: 'Minimoon', src: 'minimoon.webp', text: 'A short, perfect escape right after the wedding.' },
  { title: 'Luxury Staycation', src: 'luxury-staycation.webp', text: 'Five-star stays, closer to home.' },
  { title: 'Babymoon', src: 'babymoon.webp', text: 'Gentle, relaxed trips before the little one arrives.' },
]

function Experiences() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start start', 'end end'])
  const trackRef = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const t = trackRef.current
      if (t) setDistance(Math.max(0, t.scrollWidth - window.innerWidth))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const x = useTransform(progress, [0, 1], [0, reduce ? 0 : -distance])

  return (
    <section id="experiences" ref={ref} className="relative" style={{ height: reduce ? 'auto' : `calc(100svh + ${distance}px)`, background: '#FFFFFF' }}>
      <div className={`${reduce ? '' : 'sticky top-0 h-[100svh]'} overflow-hidden flex items-center`}>
        <motion.div ref={trackRef} style={{ x }} className={`flex gap-6 sm:gap-8 px-6 sm:px-16 items-center ${reduce ? 'overflow-x-auto py-20' : ''}`}>
          <div className="flex-none w-[min(80vw,460px)] pr-4">
            <Eyebrow>What we design</Eyebrow>
            <Title plain="Curated" script="Experiences" />
            <p className="mt-6 text-slate-600 text-[17px]">Four kinds of trips, one obsession: making two people fall in love with travel again.</p>
            <div className="mt-8 flex items-center gap-3 text-[13px] font-semibold" style={{ color: BLUE }}>
              <span className="block w-10 h-[2px]" style={{ background: BLUE }} /> Keep scrolling
            </div>
          </div>
          {EXPERIENCES.map((e, i) => (
            <div key={e.title} className="relative flex-none w-[min(78vw,400px)] aspect-[3/4.4] rounded-[30px] overflow-hidden shadow-[0_40px_80px_-40px_rgba(11,21,51,.5)]" style={{ marginTop: i % 2 ? 80 : -40 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={A(e.src)} alt={e.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <div className="absolute left-7 right-7 bottom-7 text-white">
                <div className="text-[12px] font-bold tracking-[0.3em] text-white/60">0{i + 1}</div>
                <div className="font-figtree text-[32px] font-extrabold mt-1">{e.title}</div>
                <p className="text-white/80 text-[15px] mt-2">{e.text}</p>
              </div>
            </div>
          ))}
          <div className="flex-none w-[10vw]" />
        </motion.div>
      </div>
    </section>
  )
}

// ─── 7. Competition landscape ─────────────────────────────────────────────────

function Landscape() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-25% 0px' })
  const boxes = [
    { label: 'Thrillophilia, 30 Sundays, Pick Your Trail', icon: '👥', pos: 'col-start-1 row-start-1' },
    { label: 'Travelzada', icon: '💎', pos: 'col-start-2 row-start-1', star: true },
    { label: 'Offline Travel Agents', icon: '🏪', pos: 'col-start-1 row-start-2' },
    { label: 'MakeMyTrip, Musafir.com, Agoda', icon: '🌐', pos: 'col-start-2 row-start-2' },
  ]
  return (
    <section id="landscape" className="relative py-28 sm:py-40 overflow-hidden" style={{ background: PAPER }}>
      <Parallax speed={-0.4} className="absolute -right-32 top-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-50" style={{ background: '#C9D7FF' }}>
        <span />
      </Parallax>
      <div className="relative max-w-[1100px] mx-auto px-6">
        <Reveal>
          <Eyebrow>Where we play</Eyebrow>
          <Title plain="Competition" script="Landscape" />
        </Reveal>
        <div ref={ref} className="relative mt-16 sm:mt-20 mx-auto max-w-[760px]">
          <div className="text-center text-[13px] font-bold mb-4" style={{ color: NAVY }}>High Personalisation</div>
          <div className="relative grid grid-cols-2 grid-rows-2 gap-4 sm:gap-10 p-2 sm:p-8">
            <motion.span initial={{ scaleX: reduce ? 1 : 0 }} animate={inView ? { scaleX: 1 } : {}} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="absolute left-0 right-0 top-1/2 h-[2px] origin-center" style={{ background: NAVY }} />
            <motion.span initial={{ scaleY: reduce ? 1 : 0 }} animate={inView ? { scaleY: 1 } : {}} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="absolute top-0 bottom-0 left-1/2 w-[2px] origin-center" style={{ background: NAVY }} />
            {boxes.map((b, i) => (
              <motion.div
                key={b.label}
                initial={reduce ? false : { opacity: 0, scale: 0.7, y: 30 }}
                animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.5 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`${b.pos} relative z-10 rounded-[20px] min-h-[120px] sm:min-h-[150px] flex flex-col items-center justify-center text-center gap-2 p-4 ${
                  b.star ? 'text-white' : 'bg-white text-slate-600 shadow-[0_16px_40px_-24px_rgba(11,21,51,.4)]'
                }`}
                style={b.star ? { background: `linear-gradient(140deg, ${BLUE}, ${NAVY})`, boxShadow: '0 30px 70px -20px rgba(43,89,224,.65)' } : undefined}
              >
                {b.star && !reduce && (
                  <motion.span className="absolute inset-0 rounded-[20px] ring-4 ring-[#2B59E0]/40" animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2.4, repeat: Infinity }} />
                )}
                <span className="text-[26px]">{b.icon}</span>
                <span className={`font-figtree ${b.star ? 'text-[22px] font-extrabold' : 'text-[14px] font-semibold'}`}>{b.label}</span>
              </motion.div>
            ))}
          </div>
          <div className="text-center text-[13px] font-bold mt-4" style={{ color: NAVY }}>Low Personalisation</div>
          <div className="absolute top-1/2 -translate-y-1/2 -left-2 sm:-left-28 text-[12px] sm:text-[13px] font-bold w-16 sm:w-24 text-right hidden sm:block" style={{ color: NAVY }}>Min Experience Spread</div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-2 sm:-right-28 text-[12px] sm:text-[13px] font-bold w-16 sm:w-24 hidden sm:block" style={{ color: NAVY }}>Max Experience Spread</div>
        </div>
      </div>
    </section>
  )
}

// ─── 8. Best seller destinations (multi-speed columns) ───────────────────────

const DESTINATIONS = [
  { name: 'Bali', country: 'Indonesia', src: 'bali.webp' },
  { name: 'Vietnam', country: 'Da Nang', src: 'vietnam.webp' },
  { name: 'Dubai', country: 'UAE', src: 'dubai.webp' },
  { name: 'Thailand', country: 'Krabi', src: 'thailand.webp' },
  { name: 'Kerala', country: 'India', src: 'kerala.webp' },
  { name: 'Kashmir', country: 'India', src: 'kashmir.webp' },
  { name: 'Rameshwaram', country: 'India', src: 'rameshwaram.webp' },
  { name: 'Darjeeling', country: 'India', src: 'darjeeling.webp' },
]

function Destinations() {
  const cols = [0, 1, 2, 3].map((c) => DESTINATIONS.filter((_, i) => i % 4 === c))
  const speeds = [0.15, -0.25, 0.3, -0.12]
  return (
    <section id="destinations" className="relative py-28 sm:py-40 overflow-hidden bg-white">
      <div className="max-w-[1300px] mx-auto px-6">
        <Reveal className="text-center">
          <Eyebrow>What couples book most</Eyebrow>
          <Title plain="Best Seller" script="Destinations" />
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-20">
          {cols.map((col, ci) => (
            <Parallax key={ci} speed={speeds[ci]} className={`grid gap-4 sm:gap-6 ${ci % 2 ? 'md:mt-24' : ''}`}>
              {col.map((d) => (
                <Reveal key={d.name}>
                  <div className="relative rounded-[24px] overflow-hidden group">
                    <DepthImage src={A(d.src)} alt={d.name} className="aspect-[3/4]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute left-5 bottom-5 text-white">
                      <div className="font-figtree text-[22px] sm:text-[26px] font-extrabold leading-tight">{d.name}</div>
                      <div className="text-[13px] text-white/75">{d.country}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 9. Referral chains ───────────────────────────────────────────────────────

const CHAINS = [
  {
    title: 'Chain 1 · Navin Goyal',
    result: '1 customer → 4 bookings',
    nodes: [
      { name: 'Navin Goyal', trip: 'Vietnam trip', quote: 'Our trip was excellently planned. You deserve full marks!', note: 'Referred 2 people' },
      { name: 'Charu Goyal', trip: 'Bhutan', quote: '110% recommendation for this team!', note: 'Referred 1 more' },
      { name: 'Poonam Kapoor', trip: 'Baku', quote: 'Immaculate planning. Lifelong memory.', note: 'Referred 1 more' },
      { name: 'Shashank + Gagan', trip: '', quote: '2 more bookings from this chain', note: '' },
    ],
  },
  {
    title: 'Chain 2 · Anish Tyagi',
    result: '1 customer → 2+ bookings',
    nodes: [
      { name: 'Anish Tyagi', trip: 'Bali', quote: 'Best place to book travel. ATV, snorkelling, candle light dinner. Highly recommended!', note: 'Referred 1 person' },
      { name: 'Devika Tyagi', trip: 'Andaman', quote: 'Amazing experience. Everything so smooth!', note: 'Planning next trip' },
      { name: 'More referrals incoming…', trip: '', quote: 'Devika already recommending to friends', note: '' },
    ],
  },
]

function Chain({ chain }: { chain: (typeof CHAINS)[number] }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })
  return (
    <div ref={ref} className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <div className="text-[12px] font-bold tracking-[0.28em] uppercase" style={{ color: BLUE }}>{chain.title}</div>
        <div className="text-[14px] font-bold rounded-full px-4 py-1.5 bg-white shadow-sm" style={{ color: NAVY }}>{chain.result}</div>
      </div>
      <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0">
        {chain.nodes.map((n, i) => (
          <React.Fragment key={n.name}>
            {i > 0 && (
              <div className="flex items-center justify-center lg:w-12 h-8 lg:h-auto">
                <motion.span
                  initial={{ scaleX: reduce ? 1 : 0 }}
                  animate={inView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.45 }}
                  className="hidden lg:block h-[2px] w-full origin-left"
                  style={{ background: BLUE }}
                />
                <motion.span
                  initial={{ scaleY: reduce ? 1 : 0 }}
                  animate={inView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.45 }}
                  className="lg:hidden w-[2px] h-full origin-top"
                  style={{ background: BLUE }}
                />
              </div>
            )}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.45 + 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 bg-white rounded-[20px] p-5 shadow-[0_18px_40px_-26px_rgba(11,21,51,.45)] border border-[#E3EAFF]"
            >
              <div className="font-figtree text-[17px] font-extrabold" style={{ color: NAVY }}>{n.name}</div>
              {n.trip && <div className="text-[13px] font-semibold" style={{ color: BLUE }}>{n.trip}</div>}
              <p className="text-[14px] text-slate-600 mt-2 leading-relaxed">{n.trip ? `“${n.quote}”` : n.quote}</p>
              {n.note && <div className="text-[12.5px] font-bold mt-3 text-slate-800">{n.note}</div>}
            </motion.div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function Referrals() {
  return (
    <section id="referrals" className="relative py-28 sm:py-40 overflow-hidden" style={{ background: PAPER }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <Eyebrow>All organic</Eyebrow>
          <h2 className="font-figtree font-extrabold tracking-[-0.02em] leading-[1.02] text-[clamp(38px,6vw,86px)]" style={{ color: NAVY }}>
            From 2 Customers to{' '}
            <span className="font-pinyon font-normal tracking-normal" style={{ color: BLUE }}>
              <Counter to={1500} suffix="+" />
            </span>
          </h2>
          <p className="mt-6 text-slate-600 text-[17px] max-w-[620px]">Every 5★ review triggered a referral chain. Here’s how it compounded.</p>
        </Reveal>
        {CHAINS.map((c) => <Chain key={c.title} chain={c} />)}
        <Reveal className="mt-14">
          <div className="rounded-[26px] p-8 sm:p-10 text-white flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ background: `linear-gradient(130deg, ${BLUE}, ${NAVY})` }}>
            <span className="text-[38px]">💡</span>
            <p className="font-figtree text-[clamp(20px,2.4vw,30px)] font-bold leading-snug">If every customer refers just 1 more, our growth doubles with zero marketing cost.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─── 10. 1500+ customers & celebrity favourites ──────────────────────────────

const CUSTOMER_PHOTOS = [
  { src: 'daalchini-team.webp', caption: 'Daalchini team', cls: 'col-span-2 aspect-[16/10]', speed: 0.1 },
  { src: 'shalmali-kholgade.webp', caption: 'Shalmali Kholgade', cls: 'aspect-[4/5]', speed: 0.35 },
  { src: 'first-gate-infra.webp', caption: 'First Gate Infra', cls: 'aspect-[4/5]', speed: -0.1 },
  { src: 'mahakal-ujjain.webp', caption: 'Mahakal, Ujjain', cls: 'aspect-[4/5]', speed: 0.25 },
  { src: 'kashmir-couple.webp', caption: 'Kashmir', cls: 'aspect-[4/5]', speed: -0.05 },
]

function Customers() {
  return (
    <section id="customers" className="relative py-28 sm:py-40 bg-white">
      <div className="max-w-[1250px] mx-auto px-6 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16">
        <div className="lg:sticky lg:top-28 self-start">
          <Reveal>
            <div className="font-figtree font-black leading-none text-[clamp(72px,11vw,150px)]" style={{ color: NAVY }}>
              <Counter to={1500} suffix="+" />
            </div>
            <div className="font-pinyon text-[clamp(34px,4vw,54px)] -mt-2" style={{ color: BLUE }}>happy customers</div>
            <div className="mt-10 text-[12px] font-bold tracking-[0.28em] uppercase text-slate-500">Celebrity & corporate favs</div>
            <ul className="mt-4 space-y-2 font-figtree text-[20px] font-bold" style={{ color: INK }}>
              <li>Shalmali Kholgade</li>
              <li>Biswa Kalyan Rath</li>
              <li>Samay Raina</li>
              <li className="text-[16px] font-semibold text-slate-600">& teams from Daalchini & First Gate Infra</li>
            </ul>
          </Reveal>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {CUSTOMER_PHOTOS.map((p) => (
            <Parallax key={p.src} speed={p.speed} className={p.cls.includes('col-span-2') ? 'col-span-2' : ''}>
              <Reveal>
                <figure className="relative rounded-[24px] overflow-hidden shadow-[0_30px_60px_-36px_rgba(11,21,51,.5)]">
                  <DepthImage src={A(p.src)} alt={p.caption} className={p.cls.replace('col-span-2 ', '')} strength={8} />
                  <figcaption className="absolute left-4 bottom-4 bg-white/90 backdrop-blur text-[13px] font-bold rounded-full px-3.5 py-1.5" style={{ color: NAVY }}>{p.caption}</figcaption>
                </figure>
              </Reveal>
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 11. Reviews ──────────────────────────────────────────────────────────────

function Reviews() {
  const shots = [
    { src: 'review-1.webp', speed: 0.1 },
    { src: 'review-2.webp', speed: -0.25 },
    { src: 'review-3.webp', speed: 0.3 },
    { src: 'review-4.webp', speed: -0.1 },
  ]
  const guests = ['guest-atv.webp', 'guest-meadow.webp', 'guest-tiger.webp', 'guest-singapore.webp']
  return (
    <section id="reviews" data-dark="true" className="relative py-28 sm:py-40 overflow-hidden" style={{ background: INK }}>
      <div className="max-w-[1250px] mx-auto px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow light>In their words</Eyebrow>
            <Title plain="Loved by" script="Couples" light />
          </div>
          <div className="flex items-center gap-3 bg-white rounded-full pl-4 pr-5 py-2.5">
            <span className="text-[#FBBC04] text-[18px] tracking-wider">★★★★★</span>
            <span className="text-[14px] font-bold" style={{ color: INK }}>5 Star Rating on Google</span>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-6 mt-16 items-start">
          {shots.map((s, i) => (
            <Parallax key={s.src} speed={s.speed} className={i % 2 ? 'md:mt-28' : ''}>
              <Reveal delay={i * 0.08}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={A(s.src)} alt="Google review" loading="lazy" className="w-full h-auto rounded-[20px] ring-1 ring-white/10 shadow-[0_40px_80px_-40px_rgba(0,0,0,.8)]" />
              </Reveal>
            </Parallax>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          {guests.map((g, i) => (
            <Parallax key={g} speed={[0.2, -0.15, 0.3, -0.25][i]}>
              <DepthImage src={A(g)} alt="Travelzada guests" className="aspect-[4/5] rounded-[22px]" strength={10} />
            </Parallax>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 12. Asks & Gives ─────────────────────────────────────────────────────────

const ASKS: [string, string][] = [
  ['Sanjay Agarwal', 'Founder, AU Finance'],
  ['Mahavir Pratap Sharma', 'Partner, Swishin Ventures'],
  ['Nikhil Madan', 'Owner, Mahima Group'],
  ['Neeraj Prakash', 'MD, Shriram General Insurance'],
  ['Anurag Singh Khangarot', 'Co-founder, Aachho'],
  ['Shantanu Bapna', 'Founder, Jaipur Masala Company'],
  ['Sachin Jain', 'CEO, Gallant Jewelry'],
  ['Vedant & Arnav Kothari', 'Directors, KGK Group'],
  ['Samarth Garg', 'Owner, BanBanjara Travels'],
  ['Harshit Garg', 'Director, Derewala Industries'],
]
const GIVES: [string, string][] = [
  ['Manushree Khandelwal', 'Founder, Femora'],
  ['Anant Kumar', 'Co-founder, Brij Hotels'],
  ['Manas Rawat', 'Owner, Vilde Farms'],
  ['Nikhil Badaya', 'Owner, The Gem Bliss'],
  ['Karmveer Singh', 'Owner, Shipra Enterprise (India Infra)'],
  ['Anil Sapra', 'Owner, Titan / Crompton Distributor'],
  ['Prerna Kalra', 'Owner, Daalchini Vending Company'],
  ['Mukul Farsoia', 'Owner, Mahalaxmi Creation (furniture)'],
  ['Pulkit Agarwal', 'Owner, City Vibes Jaipur'],
  ['Dr Rakesh Kumar', 'Pediatrician, Surya Hospital'],
]

function PeopleList({ title, icon, people, speed }: { title: string; icon: string; people: [string, string][]; speed: number }) {
  return (
    <Parallax speed={speed}>
      <div className="bg-white rounded-[26px] p-6 sm:p-8 shadow-[0_30px_70px_-40px_rgba(11,21,51,.45)]">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]" style={{ background: '#E7EEFF' }}>{icon}</span>
          <h3 className="font-figtree text-[24px] font-extrabold" style={{ color: NAVY }}>{title}</h3>
        </div>
        <ul className="divide-y divide-[#EEF2FB]">
          {people.map(([name, role], i) => (
            <motion.li
              key={name}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-5% 0px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-4 py-3"
            >
              <span className="font-bold text-[15px]" style={{ color: INK }}>{name}</span>
              <span className="text-[14px] text-slate-500 sm:text-right">{role}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </Parallax>
  )
}

function AsksGives() {
  return (
    <section id="asks-gives" className="relative py-28 sm:py-40 overflow-hidden" style={{ background: PAPER }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="text-center">
          <Eyebrow>BNI Jaipur · Swastik</Eyebrow>
          <Title plain="Asks &" script="Gives" />
          <p className="mt-6 text-slate-600 text-[17px] max-w-[560px] mx-auto">Introductions we’d love, and the people we’re happy to connect you with.</p>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mt-16">
          <PeopleList title="My Asks" icon="🔍" people={ASKS} speed={0.08} />
          <PeopleList title="My Gives" icon="🤝" people={GIVES} speed={-0.08} />
        </div>
      </div>
    </section>
  )
}

// ─── 13. Finale ───────────────────────────────────────────────────────────────

function Finale() {
  const reduce = useReducedMotion()
  const { ref, progress } = useSectionProgress(['start end', 'center center'])
  // The banner already carries the quote and the ZNMD tag, so it is shown as-is
  const scale = useTransform(progress, [0, 1], reduce ? [1, 1] : [0.82, 1])
  const imgScale = useTransform(progress, [0, 1], reduce ? [1, 1] : [1.18, 1])
  const rotate = useTransform(progress, [0, 1], reduce ? [0, 0] : [3, 0])
  return (
    <section id="finale" data-dark="true" ref={ref} className="relative overflow-hidden py-24 sm:py-32" style={{ background: INK }}>
      <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(900px 500px at 50% 35%, rgba(43,89,224,.45), transparent 70%)` }} />
      <div className="relative max-w-[1200px] mx-auto px-6">
        <motion.div style={{ scale, rotate }} className="relative mx-auto max-w-[1100px] aspect-[16/9] rounded-[28px] overflow-hidden shadow-[0_60px_140px_-40px_rgba(43,89,224,.7)] ring-1 ring-white/10">
          <motion.img
            src={A('znmd.webp')}
            alt="“Insaan ko dibbe mein sirf tab hona chahiye… jab woh mar chuka ho.” — Zindagi Na Milegi Dobara"
            style={{ scale: imgScale }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>
        <Reveal className="mt-14 text-center">
          <h2 className="font-figtree font-extrabold text-white text-[clamp(30px,4.6vw,64px)] leading-[1.05] tracking-[-0.02em]">
            Let’s plan your next trip <span className="font-pinyon font-normal tracking-normal text-[#A9C1FF] text-[1.1em]">together</span>
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="rounded-full bg-white px-7 py-4 font-bold text-[16px] hover:-translate-y-0.5 transition" style={{ color: NAVY }}>
              Plan a trip for two
            </Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/50 text-white px-7 py-4 font-bold text-[16px] hover:bg-white/10 transition">
              WhatsApp us
            </a>
          </div>
        </Reveal>
      </div>
      <div className="relative mt-20 text-center text-[13px] text-white/50 px-6">
        Travelzada · Journeys designed for two · Presented at BNI Jaipur Swastik
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PresentationStory() {
  return (
    <main className="font-figtree antialiased overflow-x-clip" style={{ color: INK }}>
      <Chrome />
      <Hero />
      <WorldTour />
      <LifeWithout />
      <LifeWith />
      <Team />
      <Experiences />
      <Landscape />
      <Destinations />
      <Referrals />
      <Customers />
      <Reviews />
      <AsksGives />
      <Finale />
    </main>
  )
}
