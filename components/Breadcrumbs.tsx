import Link from 'next/link'
import React from 'react'

interface BreadcrumbItem {
  name: string
  url?: string
}

export default function Breadcrumbs({ items, className = '' }: { items: BreadcrumbItem[], className?: string }) {
  return (
    <nav className={`flex text-sm text-gray-500 font-medium ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.name} className="inline-flex items-center">
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-400 mx-1 md:mx-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {isLast || !item.url ? (
                <span className="text-gray-900 border-b-2 border-transparent select-none whitespace-nowrap">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="inline-flex items-center hover:text-primary hover:border-primary transition-colors whitespace-nowrap"
                >
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
