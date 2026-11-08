export {
  ArrowRight, BadgeCheck, Building2, CalendarDays, Check, ChevronDown, ChevronUp, ClipboardPaste, FileText, Heart, Hotel,
  ImageIcon, ListChecks, Loader2, Lock, MapPin, MessageCircle, PartyPopper, Plane, Plus, RotateCcw, ScanText, Search, ShieldCheck,
  Sparkles, Stamp, Upload, Users, Wallet, X,
} from 'lucide-react'

/** "≈" in the same box as a lucide icon, for "Similar" */
export function Approximately({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 9.5c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0" />
      <path d="M4 15.5c2.5-2.5 5.5-2.5 8 0s5.5 2.5 8 0" />
    </svg>
  )
}
