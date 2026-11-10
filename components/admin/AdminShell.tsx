'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Home, Target, Globe, Inbox, Users, MessageCircle, Bot, FileText, Sparkles, Package, Map, PenLine, User,
  Star, Mail, Building2, Store, Ticket, Shield, Briefcase, ClipboardList, HelpCircle, Menu, X, Search,
  LogOut, ExternalLink, Lock, Loader2, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_GROUPS, canAccessItem, canAccessSubPage, findNavGroup, findNavItem, findSubPage, type IconName, type NavItem } from '@/lib/admin/nav'
import { cx } from './ui'

const ICONS: Record<IconName, React.ComponentType<{ className?: string }>> = {
  home: Home, target: Target, globe: Globe, inbox: Inbox, users: Users, message: MessageCircle, bot: Bot,
  file: FileText, sparkles: Sparkles, package: Package, map: Map, pen: PenLine, user: User, star: Star,
  mail: Mail, building: Building2, store: Store, ticket: Ticket, shield: Shield, briefcase: Briefcase,
  clipboard: ClipboardList, help: HelpCircle,
}

export function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name]
  return <Icon className={className} />
}

/** Pages that render without the dashboard chrome (e.g. print views) */
const BARE_ROUTES = [/^\/admin\/vouchers\/print/]

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin'
  const router = useRouter()
  const { currentUser, loading, isAdmin, permissions, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const hasAnyAccess = isAdmin || (permissions?.length ?? 0) > 0
  const visibleGroups = useMemo(
    () => NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canAccessItem(i, isAdmin, permissions)) })).filter((g) => g.items.length),
    [isAdmin, permissions],
  )
  const currentItem = findNavItem(pathname)
  const currentGroup = findNavGroup(pathname)
  const groupTabs = currentGroup ? currentGroup.items.filter((i) => canAccessItem(i, isAdmin, permissions)) : []
  const currentSub = findSubPage(pathname)
  const subTabs = (currentItem?.subPages || []).filter((p) => canAccessSubPage(p, isAdmin, permissions))
  const allowedHere =
    !currentItem || (canAccessItem(currentItem, isAdmin, permissions) && (!currentSub || canAccessSubPage(currentSub, isAdmin, permissions)))

  // Not logged in → login page
  useEffect(() => {
    if (!loading && !currentUser) router.push('/login?redirect=' + encodeURIComponent(pathname))
  }, [loading, currentUser, router, pathname])

  // Close the mobile drawer and start every page at the top on navigation
  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  // Ctrl/Cmd + K opens quick search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (BARE_ROUTES.some((r) => r.test(pathname))) return <>{children}</>

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-bordeaux-600" />
      </div>
    )
  }

  if (!hasAnyAccess) {
    return (
      <NoAccess
        email={currentUser.email}
        message="Your account doesn't have access to the admin dashboard yet. Ask an admin to give you a role on the Team & Roles page."
        onLogout={logout}
      />
    )
  }

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-gray-100 shrink-0">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/images/logo/Travelzada Logo April (1).png" alt="Travelzada" width={120} height={32} className="h-8 w-auto" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-bordeaux-600 bg-bordeaux-50 px-1.5 py-0.5 rounded">Admin</span>
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 hover:border-gray-300"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Jump to…</span>
        <kbd className="text-[10px] font-semibold text-gray-400 border border-gray-200 rounded px-1">Ctrl K</kbd>
      </button>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {visibleGroups.map((g) => (
          <div key={g.id}>
            {g.items.length > 1 && <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = currentItem?.href === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cx(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-bordeaux-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <NavIcon name={item.icon} className={cx('w-4 h-4 shrink-0', active ? 'text-white' : 'text-gray-400')} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 p-3 shrink-0">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-bordeaux-100 text-bordeaux-700 flex items-center justify-center text-sm font-bold shrink-0">
            {(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
            <p className="text-xs text-gray-500 truncate">{isAdmin ? 'Admin' : 'Team member'}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href="/" target="_blank" className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <ExternalLink className="w-3.5 h-3.5" /> Website
          </Link>
          <button type="button" onClick={() => logout().then(() => router.push('/'))} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#F7F6F8]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-40">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar: breadcrumb + section sub-tabs */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="h-14 px-4 lg:px-8 flex items-center gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              {currentGroup && currentGroup.items.length > 1 && (
                <>
                  <span className="text-gray-500 truncate hidden sm:inline">{currentGroup.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:inline" />
                </>
              )}
              <span className="font-semibold text-gray-900 truncate">{currentItem?.label || 'Admin'}</span>
            </div>
            <button type="button" onClick={() => setPaletteOpen(true)} className="ml-auto lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
          </div>
          {groupTabs.length > 1 && (
            <div className="px-4 lg:px-8 flex gap-1 overflow-x-auto no-scrollbar -mb-px">
              {groupTabs.map((t) => {
                const active = currentItem?.href === t.href
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={cx(
                      'flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
                      active ? 'border-bordeaux-600 text-bordeaux-700' : 'border-transparent text-gray-500 hover:text-gray-800',
                    )}
                  >
                    <NavIcon name={t.icon} className="w-4 h-4" />
                    {t.label}
                  </Link>
                )
              })}
            </div>
          )}
          {/* Tabs inside the current page (e.g. Website Leads → Leads / Contact Messages / Planner Activity) */}
          {subTabs.length > 1 && (
            <div className="px-4 lg:px-8 py-2 flex gap-1.5 overflow-x-auto no-scrollbar bg-gray-50/80 border-t border-gray-100">
              {subTabs.map((t) => {
                const active = currentSub?.href === t.href
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={cx(
                      'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                      active ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-600 border-gray-200 hover:border-bordeaux-300',
                    )}
                  >
                    <NavIcon name={t.icon} className="w-3.5 h-3.5" />
                    {t.label}
                  </Link>
                )
              })}
            </div>
          )}
        </header>

        <main className="px-4 lg:px-8 py-6 max-w-[1400px]">
          {allowedHere ? children : (
            <div className="py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><Lock className="w-5 h-5 text-gray-500" /></div>
              <p className="font-semibold text-gray-900">You don't have access to {currentItem?.label}</p>
              <p className="text-sm text-gray-500 mt-1">Ask an admin to add it to your role on the Team & Roles page.</p>
              <Link href="/admin" className="inline-block mt-4 text-sm font-semibold text-bordeaux-600 hover:underline">Back to Overview</Link>
            </div>
          )}
        </main>
      </div>

      {paletteOpen && <QuickJump groups={visibleGroups} onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

function QuickJump({ groups, onClose }: { groups: Array<{ label: string; items: NavItem[] }>; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const items = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))
  const results = items.filter((i) => !q || `${i.label} ${i.description} ${i.group}`.toLowerCase().includes(q.toLowerCase()))
  const go = (href: string) => {
    onClose()
    router.push(href)
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
              if (e.key === 'Enter' && results[idx]) go(results[idx].href)
            }}
            placeholder="Go to page… (leads, packages, quote PDF)"
            className="flex-1 py-3.5 text-sm outline-none"
          />
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.map((r, i) => (
            <li key={r.href}>
              <button
                type="button"
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(r.href)}
                className={cx('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === idx ? 'bg-bordeaux-50' : '')}
              >
                <NavIcon name={r.icon} className="w-4 h-4 text-bordeaux-600 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{r.label} <span className="font-normal text-gray-400">· {r.group}</span></span>
                  <span className="block text-xs text-gray-500 truncate">{r.description}</span>
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-6 text-center text-sm text-gray-500">No page matches “{q}”</li>}
        </ul>
      </div>
    </div>
  )
}

function NoAccess({ email, message, onLogout }: { email?: string | null; message: string; onLogout: () => Promise<void> }) {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center bg-white border border-gray-200 rounded-2xl p-8">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-bordeaux-50 flex items-center justify-center mb-4"><Lock className="w-5 h-5 text-bordeaux-600" /></div>
        <h1 className="text-xl font-bold text-gray-900">No access yet</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        {email && <p className="mt-3 text-xs text-gray-500">Logged in as <strong>{email}</strong></p>}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => router.push('/')} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold">Go to website</button>
          <button type="button" onClick={() => onLogout().then(() => router.push('/login'))} className="px-4 py-2 rounded-xl bg-bordeaux-600 text-white text-sm font-semibold">Switch account</button>
        </div>
      </div>
    </div>
  )
}
