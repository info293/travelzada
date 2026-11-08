/**
 * Single source of truth for the admin dashboard's navigation, permissions and staff roles.
 *
 * - Every admin page is its own route (no in-page tabs), so links, refresh and the back button work.
 * - Pages are grouped into a few main sections; the pages of a section show up as sub-tabs at the top.
 * - A user can open a page if they are an admin, or if their `permissions` array (users/{uid}.permissions)
 *   contains any of the page's permission keys. Keys are kept compatible with the old tab names.
 */

export type PermissionKey =
  | 'dashboard'
  | 'leads'
  | 'contacts'
  | 'customer-records'
  | 'whatsapp'
  | 'ai-chats'
  | 'create-itinerary'
  | 'ai-generator'
  | 'packages'
  | 'destinations'
  | 'blogs'
  | 'authors'
  | 'testimonials'
  | 'subscribers'
  | 'agents'
  | 'vendors'
  | 'vouchers'
  | 'users'
  | 'jobs'
  | 'careers'

export type IconName =
  | 'home' | 'target' | 'globe' | 'inbox' | 'users' | 'message' | 'bot' | 'file' | 'sparkles'
  | 'package' | 'map' | 'pen' | 'user' | 'star' | 'mail' | 'building' | 'store' | 'ticket'
  | 'shield' | 'briefcase' | 'clipboard' | 'help'

export interface NavItem {
  label: string
  href: string
  icon: IconName
  /** Any one of these grants access. Empty = everyone who can open the admin. */
  perms: PermissionKey[]
  /** Only admins (role === 'admin') */
  adminOnly?: boolean
  /** One line shown on the page header and in quick search */
  description: string
}

export interface NavGroup {
  id: string
  label: string
  icon: IconName
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    label: 'Overview',
    icon: 'home',
    items: [
      { label: 'Overview', href: '/admin', icon: 'home', perms: [], description: "Today's numbers, follow-ups and shortcuts" },
    ],
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    icon: 'target',
    items: [
      { label: 'Meta Leads', href: '/admin/meta-leads', icon: 'target', perms: ['leads'], description: 'Facebook / Instagram ad leads with full CRM pipeline' },
      { label: 'Website Leads', href: '/admin/leads', icon: 'globe', perms: ['leads'], description: 'Enquiries from package pages and the AI trip planner' },
      { label: 'Contact Messages', href: '/admin/enquiries', icon: 'inbox', perms: ['contacts'], description: 'Messages sent from the Contact Us form' },
      { label: 'Customers', href: '/admin/customers', icon: 'users', perms: ['customer-records'], description: 'Every quote sent and booking made, with payments' },
      { label: 'WhatsApp', href: '/admin/whatsapp-chats', icon: 'message', perms: ['whatsapp', 'leads'], description: 'Live WhatsApp inbox' },
      { label: 'AI Planner Chats', href: '/admin/ai-chats', icon: 'bot', perms: ['ai-chats', 'leads'], description: 'Conversations visitors had with the AI trip planner' },
      { label: 'Planner Activity', href: '/admin/planner-activity', icon: 'sparkles', perms: ['leads'], description: 'Every AI planner search and uploaded itinerary, even without contact details' },
    ],
  },
  {
    id: 'quotes',
    label: 'Quotes & Itineraries',
    icon: 'file',
    items: [
      { label: 'Create Quote PDF', href: '/admin/itinerary', icon: 'file', perms: ['create-itinerary'], description: 'Build a branded itinerary PDF to share with a customer' },
      { label: 'AI Package Writer', href: '/admin/ai-packages', icon: 'sparkles', perms: ['ai-generator'], description: 'Draft a complete package with AI, then save it to the catalog' },
    ],
  },
  {
    id: 'catalog',
    label: 'Packages & Destinations',
    icon: 'package',
    items: [
      { label: 'Packages', href: '/admin/packages', icon: 'package', perms: ['packages'], description: 'Holiday packages shown on the website' },
      { label: 'Destinations', href: '/admin/destinations', icon: 'map', perms: ['destinations'], description: 'Destination pages and which packages they list' },
    ],
  },
  {
    id: 'content',
    label: 'Content & Marketing',
    icon: 'pen',
    items: [
      { label: 'Blogs', href: '/admin/blogs', icon: 'pen', perms: ['blogs'], description: 'Blog posts and travel guides' },
      { label: 'Authors', href: '/admin/authors', icon: 'user', perms: ['authors', 'blogs'], description: 'Author profiles linked to blog posts' },
      { label: 'Testimonials', href: '/admin/testimonials', icon: 'star', perms: ['testimonials'], description: 'Customer reviews shown on the homepage' },
      { label: 'Newsletter', href: '/admin/subscribers', icon: 'mail', perms: ['subscribers'], description: 'Newsletter subscribers' },
    ],
  },
  {
    id: 'partners',
    label: 'Partners',
    icon: 'building',
    items: [
      { label: 'Travel Agents', href: '/admin/agents', icon: 'building', perms: ['agents'], adminOnly: true, description: 'B2B agents using the white-label planner' },
      { label: 'Vendors', href: '/admin/vendor', icon: 'store', perms: ['vendors'], description: 'Vendor partners, rewards and their leads' },
      { label: 'Gift Vouchers', href: '/admin/vouchers', icon: 'ticket', perms: ['vouchers', 'leads'], description: 'QR gift vouchers: issue, track and redeem' },
    ],
  },
  {
    id: 'team',
    label: 'Team & Hiring',
    icon: 'shield',
    items: [
      { label: 'Team & Roles', href: '/admin/users', icon: 'shield', perms: ['users'], description: 'Who can log in and what they can access' },
      { label: 'Job Openings', href: '/admin/jobs', icon: 'briefcase', perms: ['jobs'], description: 'Open positions on the Careers page' },
      { label: 'Applications', href: '/admin/careers', icon: 'clipboard', perms: ['careers', 'jobs'], description: 'Job applications received' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    icon: 'help',
    items: [
      { label: 'How to use', href: '/admin/help', icon: 'help', perms: [], description: 'Guide for every role' },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export function canAccessItem(item: NavItem, isAdmin: boolean, permissions: string[] | null | undefined): boolean {
  if (isAdmin) return true
  if (item.adminOnly) return false
  if (item.perms.length === 0) return (permissions?.length ?? 0) > 0
  return item.perms.some((p) => permissions?.includes(p))
}

/** The nav item a pathname belongs to (longest matching prefix). `/admin` only matches exactly. */
export function findNavItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined
  for (const item of ALL_NAV_ITEMS) {
    const match = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(item.href + '/')
    if (match && (!best || item.href.length > best.href.length)) best = item
  }
  return best
}

export function findNavGroup(pathname: string): NavGroup | undefined {
  const item = findNavItem(pathname)
  return item ? NAV_GROUPS.find((g) => g.items.includes(item)) : undefined
}

/** Permission keys a user can be given, with plain-English labels for the Team page. */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Overview',
  leads: 'Leads (Meta + website), WhatsApp, AI chats',
  contacts: 'Contact messages',
  'customer-records': 'Customers & bookings',
  whatsapp: 'WhatsApp inbox',
  'ai-chats': 'AI planner chats',
  'create-itinerary': 'Create quote PDFs',
  'ai-generator': 'AI package writer',
  packages: 'Packages',
  destinations: 'Destinations',
  blogs: 'Blogs',
  authors: 'Authors',
  testimonials: 'Testimonials',
  subscribers: 'Newsletter subscribers',
  agents: 'Travel agents (B2B)',
  vendors: 'Vendors',
  vouchers: 'Gift vouchers',
  users: 'Team & roles',
  jobs: 'Job openings',
  careers: 'Job applications',
}

export interface StaffRolePreset {
  id: string
  label: string
  description: string
  permissions: PermissionKey[]
}

/** Ready-made roles. Picking one on the Team page fills the permissions; they can still be fine-tuned. */
export const STAFF_ROLE_PRESETS: StaffRolePreset[] = [
  {
    id: 'sales',
    label: 'Sales Executive',
    description: 'Works leads, chats with customers on WhatsApp, sends quote PDFs and records bookings.',
    permissions: ['dashboard', 'leads', 'contacts', 'customer-records', 'whatsapp', 'ai-chats', 'create-itinerary', 'vouchers'],
  },
  {
    id: 'sales-manager',
    label: 'Sales Manager',
    description: 'Everything Sales has, plus packages, the AI package writer and vendors.',
    permissions: ['dashboard', 'leads', 'contacts', 'customer-records', 'whatsapp', 'ai-chats', 'create-itinerary', 'ai-generator', 'packages', 'destinations', 'vendors', 'vouchers'],
  },
  {
    id: 'content',
    label: 'Content & SEO',
    description: 'Writes blogs and keeps packages, destinations and reviews up to date.',
    permissions: ['dashboard', 'packages', 'destinations', 'blogs', 'authors', 'testimonials', 'subscribers', 'ai-generator'],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Handles confirmed bookings, vendors and vouchers.',
    permissions: ['dashboard', 'customer-records', 'packages', 'vendors', 'vouchers'],
  },
  {
    id: 'hr',
    label: 'HR / Hiring',
    description: 'Posts job openings and reviews applications.',
    permissions: ['dashboard', 'jobs', 'careers'],
  },
]
