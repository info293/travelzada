// Server Component — no 'use client' needed
// Renders JSON-LD schema as a <script> tag on the server

interface OrganizationSchema {
  '@context': string
  '@type': string
  name: string
  url: string
  logo?: string
  description?: string
  contactPoint?: {
    '@type': string
    telephone?: string
    contactType?: string
    email?: string
  }
  sameAs?: string[]
  address?: {
    '@type': string
    addressCountry?: string
  }
}

interface TravelPackageSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  image?: string
  offers?: {
    '@type': string
    priceCurrency?: string
    price?: string
    priceRange?: string
    availability?: string
    url?: string
  }
  duration?: string
  destination?: {
    '@type': string
    name?: string
  }
  provider?: {
    '@type': string
    name?: string
  }
}

interface ArticleSchema {
  '@context': string
  '@type': string
  headline?: string
  description?: string
  image?: string
  author?: {
    '@type': string
    name?: string
  }
  datePublished?: string
  dateModified?: string
  publisher?: {
    '@type': string
    name?: string
    logo?: {
      '@type': string
      url?: string
    }
  }
}

interface BreadcrumbSchema {
  '@context': string
  '@type': string
  itemListElement: Array<{
    '@type': string
    position: number
    name: string
    item?: string
  }>
}

type SchemaType = OrganizationSchema | TravelPackageSchema | ArticleSchema | BreadcrumbSchema

interface SchemaMarkupProps {
  schema: SchemaType
  id?: string
}

export default function SchemaMarkup({ schema, id = 'schema-markup' }: SchemaMarkupProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Helper function to generate Organization schema
export function generateOrganizationSchema(data: {
  name?: string
  url?: string
  logo?: string
  description?: string
  email?: string
  phone?: string
  socialMedia?: string[]
}): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: data.name || 'Travelzada',
    url: data.url || 'https://www.travelzada.com',
    logo: data.logo || 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
    description: data.description || 'Plan your perfect trip in seconds with Travelzada. AI-powered travel planning with human expertise.',
    ...(data.email || data.phone
      ? {
        contactPoint: {
          '@type': 'ContactPoint',
          ...(data.phone ? { telephone: data.phone } : {}),
          ...(data.email ? { email: data.email } : {}),
          contactType: 'Customer Service',
        },
      }
      : {}),
    ...(data.socialMedia && data.socialMedia.length > 0
      ? { sameAs: data.socialMedia }
      : {}),
  }
}

// Helper function to generate Travel Package schema
export function generateTravelPackageSchema(data: {
  name: string
  description?: string
  image?: string
  price?: string
  priceRange?: string
  currency?: string
  duration?: string
  destination?: string
  url?: string
}): TravelPackageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: data.name,
    description: data.description,
    image: data.image,
    ...(data.duration
      ? {
        duration: data.duration,
      }
      : {}),
    ...(data.destination
      ? {
        destination: {
          '@type': 'Place',
          name: data.destination,
        },
      }
      : {}),
    provider: {
      '@type': 'TravelAgency',
      name: 'Travelzada',
    },
    ...(data.price || data.priceRange
      ? {
        offers: {
          '@type': 'Offer',
          priceCurrency: data.currency || 'INR',
          ...(data.price ? { price: data.price } : {}),
          ...(data.priceRange ? { priceRange: data.priceRange } : {}),
          availability: 'https://schema.org/InStock',
          ...(data.url ? { url: data.url } : {}),
        },
      }
      : {}),
  }
}

// Helper function to generate Article schema
export function generateArticleSchema(data: {
  headline: string
  description?: string
  image?: string
  author?: string
  datePublished?: string
  dateModified?: string
}): ArticleSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.headline,
    description: data.description,
    image: data.image,
    ...(data.author
      ? {
        author: {
          '@type': 'Person',
          name: data.author,
        },
      }
      : {}),
    ...(data.datePublished ? { datePublished: data.datePublished } : {}),
    ...(data.dateModified ? { dateModified: data.dateModified } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Travelzada',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.travelzada.com/images/logo/Travelzada%20Logo%20April%20(1).png',
      },
    },
  }
}

// Helper function to generate Breadcrumb schema
export function generateBreadcrumbSchema(items: Array<{ name: string; url?: string }>): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}
