'use client'

/* eslint-disable @next/next/no-img-element */
import type { BlogSection } from './types'

/** Lightweight reading preview of a post (works for drafts, which the public site won't show) */
export default function BlogPreview({ title, subtitle, image, author, date, readTime, blocks, content }: {
  title: string
  subtitle?: string
  image?: string
  author?: string
  date?: string
  readTime?: string
  blocks: BlogSection[]
  content?: string
}) {
  return (
    <article className="max-w-2xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold text-gray-900 leading-tight">{title || 'Untitled post'}</h1>
      {subtitle && <p className="mt-2 text-lg text-gray-600">{subtitle}</p>}
      <p className="mt-3 text-sm text-gray-500">{[author, date, readTime].filter(Boolean).join(' · ')}</p>
      {image && <img src={image} alt="" className="mt-5 w-full max-h-80 object-cover rounded-xl" />}
      <div className="mt-6 space-y-5 leading-relaxed">
        {blocks.length === 0 && content && content.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p.replace(/^#+\s/, '')}</p>)}
        {blocks.map((s, i) => {
          const t = s.text || s.content
          switch (s.type) {
            case 'intro': return <p key={i} className="text-lg text-gray-700">{t}</p>
            case 'heading': return <h2 key={i} className="text-2xl font-semibold text-gray-900 pt-2">{t}</h2>
            case 'subheading': return <h3 key={i} className="text-xl font-semibold text-gray-900">{t}</h3>
            case 'paragraph': return <p key={i} className="whitespace-pre-line">{t}</p>
            case 'image': return (
              <figure key={i}>
                {s.imageUrl && <img src={s.imageUrl} alt={s.imageAlt || ''} className="w-full rounded-xl" />}
                {s.imageAlt && <figcaption className="mt-1.5 text-center text-sm italic text-gray-500">{s.imageAlt}</figcaption>}
              </figure>
            )
            case 'quote': return (
              <blockquote key={i} className="border-l-4 border-bordeaux-500 pl-4 italic text-gray-700">
                “{t}”{s.author && <cite className="block not-italic mt-1 text-sm font-semibold text-gray-600">— {s.author}</cite>}
              </blockquote>
            )
            case 'list': return <ul key={i} className="list-disc pl-6 space-y-1">{(s.items || []).filter(Boolean).map((it, j) => <li key={j}>{it}</li>)}</ul>
            case 'cta': return (
              <div key={i} className="rounded-2xl bg-bordeaux-700 text-white p-6 text-center">
                <p className="text-lg font-semibold">{t}</p>
                {s.link && <span className="mt-3 inline-block rounded-full bg-white text-bordeaux-700 px-5 py-2 text-sm font-semibold">{s.linkText || 'Learn more'}</span>}
              </div>
            )
            case 'divider': return <hr key={i} className="border-gray-200" />
            case 'faq': return (
              <div key={i} className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">Frequently asked questions</h3>
                {(s.faqs || []).map((f, j) => (
                  <div key={j} className="rounded-xl border border-gray-200 p-4">
                    <p className="font-semibold text-gray-900">{f.question}</p>
                    <p className="mt-1 text-gray-700">{f.answer}</p>
                  </div>
                ))}
              </div>
            )
            case 'toc': {
              const heads = blocks.filter((b) => b.type === 'heading' || b.type === 'subheading')
              return heads.length ? (
                <div key={i} className="rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900 mb-2">In this article</p>
                  <ul className="space-y-1 text-sm">{heads.map((h, j) => <li key={j} className={h.type === 'subheading' ? 'pl-4' : ''}>{h.text || h.content}</li>)}</ul>
                </div>
              ) : null
            }
            case 'related': return (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-900 mb-2">Related</p>
                <ul className="space-y-1.5 text-sm">{(s.relatedLinks || []).map((l, j) => <li key={j}><span className="text-bordeaux-700 font-medium">{l.title}</span>{l.description && <span className="text-gray-500"> — {l.description}</span>}</li>)}</ul>
              </div>
            )
            default: return t ? <p key={i}>{t}</p> : null
          }
        })}
      </div>
    </article>
  )
}
