/**
 * Types for the Content & Marketing admin pages.
 * Field names mirror what the public site reads (app/blog, app/author, components/TestimonialsClient,
 * components/blog/NewsletterSubscription) — do not rename them.
 */

export type BlockType =
  | 'intro'
  | 'paragraph'
  | 'heading'
  | 'subheading'
  | 'image'
  | 'quote'
  | 'list'
  | 'cta'
  | 'divider'
  | 'faq'
  | 'toc'
  | 'related'

export interface BlogSection {
  type: BlockType
  content?: string
  text?: string
  imageUrl?: string
  imageAlt?: string
  items?: string[]
  author?: string
  link?: string
  linkText?: string
  question?: string
  answer?: string
  faqs?: Array<{ question: string; answer: string }>
  relatedLinks?: Array<{ title: string; url: string; description?: string }>
}

export interface BlogPost {
  id?: string
  title: string
  subtitle?: string
  description: string
  content: string
  blogStructure?: BlogSection[]
  image: string
  author: string
  authorImage?: string
  authorSlug?: string
  date: string
  category: string
  sectionHeader?: string
  isFeatured?: boolean
  sectionOrder?: number
  readTime?: string
  likes?: number
  views?: number
  comments?: number
  shares?: number
  /** Legacy flag, not read by the public site any more. Preserved, never shown. */
  featured?: boolean
  published?: boolean
  createdAt?: any
  updatedAt?: any
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  canonicalUrl?: string
  ogImage?: string
  schemaType?: 'Article' | 'BlogPosting' | 'NewsArticle'
  slug?: string
}

export interface Author {
  id?: string
  name: string
  slug: string
  bio: string
  shortBio?: string
  photo?: string
  role?: string
  expertise?: string[]
  socialLinks?: { twitter?: string; linkedin?: string; instagram?: string; website?: string }
  location?: string
  createdAt?: any
  updatedAt?: any
}

export interface Testimonial {
  id?: string
  name: string
  rating: number
  quote: string
  featured?: boolean
  createdAt?: any
  updatedAt?: any
}

export interface Subscriber {
  id: string
  email: string
  subscribedAt: any
  status: string
  source?: string
  unsubscribedAt?: any
}
