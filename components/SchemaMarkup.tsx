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
  itinerary?: {
    '@type': string
    name: string
    numberOfItems: number
    itemListElement: Array<{
      '@type': string
      position: number
      item: {
        '@type': string
        name: string
        description: string
      }
    }>
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
  '@id'?: string
  itemListElement: Array<{
    '@type': string
    position: number
    name: string
    item?: string
  }>
}

interface WebSiteSchema {
  '@context': string
  '@type': string
  name: string
  alternateName?: string
  url: string
  potentialAction?: {
    '@type': string
    target: {
      '@type': string
      urlTemplate: string
    }
    'query-input': string
  }
}

interface FAQPageSchema {
  '@context': string
  '@type': string
  mainEntity: Array<{
    '@type': string
    name: string
    acceptedAnswer: {
      '@type': string
      text: string
    }
  }>
}

interface SoftwareApplicationSchema {
  '@context': string
  '@type': string
  name: string
  applicationCategory: string
  operatingSystem: string
  description?: string
  offers?: {
    '@type': string
    price: string
    priceCurrency: string
  }
  aggregateRating?: {
    '@type': string
    ratingValue: string
    ratingCount: string
  }
  creator?: {
    '@type': string
    name: string
  }
}

interface ProductSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  image?: string
  brand?: {
    '@type': string
    name: string
  }
  offers?: {
    '@type': string
    lowPrice: string
    highPrice?: string
    priceCurrency: string
    availability: string
    offerCount?: string
    offers?: Array<{
      '@type': string
      name: string
      price: string
      priceCurrency: string
    }>
  }
  aggregateRating?: {
    '@type': string
    ratingValue: string
    bestRating: string
    ratingCount: string
    reviewCount?: string
  }
}

interface TouristDestinationSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  geo?: {
    '@type': string
    latitude: string
    longitude: string
  }
  touristType?: string[]
  containedInPlace?: {
    '@type': string
    name: string
  }
  includesAttraction?: Array<{
    '@type': string
    name: string
    description?: string
  }>
}

interface ContactPageSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  url: string
  mainEntity: {
    '@type': string
    name: string
    telephone: string
    email: string
    openingHours: string
    address: {
      '@type': string
      streetAddress: string
      addressLocality: string
      addressRegion: string
      postalCode: string
      addressCountry: string
    }
  }
}

interface ItemListSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  numberOfItems?: number
  itemListElement: Array<{
    '@type': string
    position: number
    name: string
    url: string
  }>
}

interface HowToSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  step: Array<{
    '@type': string
    position: number
    name: string
    text: string
    image?: string
  }>
}

interface WebPageSchema {
  '@context': string
  '@type': string
  name: string
  description?: string
  url: string
  isPartOf?: {
    '@type': string
    '@id': string
  }
  about?: {
    '@type': string
    name: string
  }
  breadcrumb?: {
    '@id': string
  }
}

interface TravelAgencyReviewSchema {
  '@context': string
  '@type': string
  name: string
  aggregateRating?: {
    '@type': string
    ratingValue: string
    bestRating: string
    worstRating?: string
    ratingCount: string
    reviewCount: string
  }
  review?: Array<{
    '@type': string
    author: {
      '@type': string
      name: string
    }
    datePublished: string
    reviewRating: {
      '@type': string
      ratingValue: string
      bestRating: string
    }
    reviewBody: string
  }>
}

type SchemaType = OrganizationSchema | TravelPackageSchema | ArticleSchema | BreadcrumbSchema | WebSiteSchema | FAQPageSchema | SoftwareApplicationSchema | ProductSchema | TouristDestinationSchema | ContactPageSchema | ItemListSchema | HowToSchema | WebPageSchema | TravelAgencyReviewSchema | any

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
  itinerary?: Array<{ dayTitle: string; description: string }>
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
    ...(data.itinerary && data.itinerary.length > 0 ? {
      itinerary: {
        '@type': 'ItemList',
        name: `${data.duration || 'Package'} Itinerary`,
        numberOfItems: data.itinerary.length,
        itemListElement: data.itinerary.map((day, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'TouristTrip',
            name: day.dayTitle,
            description: day.description
          }
        }))
      }
    } : {})
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
          '@type': data.author.toLowerCase().includes('travelzada') ? 'Organization' : 'Person',
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
export function generateBreadcrumbSchema(items: Array<{ name: string; url?: string }>, globalId?: string): BreadcrumbSchema {
  const defaultId = items.length > 0 && items[items.length - 1].url ? `${items[items.length - 1].url}#breadcrumb` : undefined;
  const breadcrumbId = globalId || defaultId;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    ...(breadcrumbId ? { '@id': breadcrumbId } : {}),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}

export function generateWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Travelzada',
    alternateName: 'Travelzada AI Travel Planner',
    url: 'https://www.travelzada.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.travelzada.com/destinations?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function generateSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Travelzada AI Trip Planner',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web Browser',
    description: 'AI-powered trip planner that creates personalized travel itineraries for couples in seconds.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '150',
    },
    creator: {
      '@type': 'Organization',
      name: 'Travelzada',
    },
  }
}

export function generateProductSchema(data: { name: string; description?: string; image?: string; price: string; ratingValue?: string; ratingCount?: string; reviewCount?: string }): ProductSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    description: data.description,
    image: data.image,
    brand: {
      '@type': 'Brand',
      name: 'Travelzada',
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: data.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
    ...(data.ratingValue && data.ratingCount ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: data.ratingValue,
        bestRating: '5',
        ratingCount: data.ratingCount,
        ...(data.reviewCount ? { reviewCount: data.reviewCount } : {}),
      }
    } : {}),
  }
}

export function generateTouristDestinationSchema(data: { name: string; description?: string; country?: string; geo?: { latitude: string; longitude: string }; attractions?: Array<{ name: string; description?: string }> }): TouristDestinationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: data.name,
    description: data.description,
    touristType: ['Couples', 'Honeymooners', 'Birthday Celebrations'],
    ...(data.country ? {
      containedInPlace: {
        '@type': 'Country',
        name: data.country,
      }
    } : {}),
    ...(data.geo ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: data.geo.latitude,
        longitude: data.geo.longitude
      }
    } : {}),
    ...(data.attractions && data.attractions.length > 0 ? {
      includesAttraction: data.attractions.map(a => ({
        '@type': 'TouristAttraction',
        name: a.name,
        ...(a.description ? { description: a.description } : {})
      }))
    } : {})
  }
}

export function generateContactPageSchema(): ContactPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Travelzada',
    description: 'Get in touch with Travelzada for travel planning, booking support, and inquiries.',
    url: 'https://www.travelzada.com/contact',
    mainEntity: {
      '@type': 'TravelAgency',
      name: 'Travelzada',
      telephone: '+91-9929962350',
      email: 'info@travelzada.com',
      openingHours: 'Mo-Sa 09:00-18:00',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Plot No. 18, Friends Colony, Malviya Nagar',
        addressLocality: 'Jaipur',
        addressRegion: 'Rajasthan',
        postalCode: '302017',
        addressCountry: 'IN',
      },
    },
  }
}

export function generateItemListSchema(name: string, description: string, urls: Array<{ name: string; url: string }>): ItemListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: urls.length,
    itemListElement: urls.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  }
}

export function generateWebPageSchema(data: { name: string; description?: string; url: string; websiteUrl?: string; aboutDestinationName?: string }): WebPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.name,
    description: data.description,
    url: data.url,
    ...(data.websiteUrl ? {
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${data.websiteUrl}#website`
      }
    } : {}),
    ...(data.aboutDestinationName ? {
      about: {
        '@type': 'TouristDestination',
        name: data.aboutDestinationName
      }
    } : {}),
    breadcrumb: {
      '@id': `${data.url}#breadcrumb`
    }
  }
}

export function generateTravelAgencyReviewSchema(data: {
  ratingValue: string
  ratingCount: string
  reviewCount: string
  reviews: Array<{ authorName: string; date: string; ratingValue: string; body: string }>
}): TravelAgencyReviewSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Travelzada',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: data.ratingValue,
      bestRating: '5',
      worstRating: '1',
      ratingCount: data.ratingCount,
      reviewCount: data.reviewCount
    },
    ...(data.reviews && data.reviews.length > 0 ? {
      review: data.reviews.map(r => ({
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: r.authorName
        },
        datePublished: r.date,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.ratingValue,
          bestRating: '5'
        },
        reviewBody: r.body
      }))
    } : {})
  }
}

export function generateHowToSchema(name: string, description: string, steps: Array<{ name: string; text: string; image?: string }>): HowToSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.image ? { image: s.image } : {})
    })),
  }
}
