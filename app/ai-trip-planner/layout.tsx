import { Metadata } from 'next'
import SchemaMarkup, { generateSoftwareApplicationSchema, generateHowToSchema } from '@/components/SchemaMarkup'

export const metadata: Metadata = {
  title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
  description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
  openGraph: {
    type: 'website',
    url: 'https://www.travelzada.com/tailored-travel',
    title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
    description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
    images: [{ url: 'https://www.travelzada.com/images/og-homepage.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Trip Planner | Travelzada - Plan Your Perfect Trip',
    description: 'Use our AI-powered trip planner to create personalized travel itineraries in seconds. Just tell us your vibe and get instant, tailored travel plans.',
    images: ['https://www.travelzada.com/images/og-homepage.jpg'],
  }
}

export default function AIPlannerLayout({ children }: { children: React.ReactNode }) {
  const softwareSchema = generateSoftwareApplicationSchema()
  const howToSchema = generateHowToSchema(
    'How to Plan a Trip with Travelzada AI',
    'Plan your perfect couple trip in 3 simple steps using our AI travel planner.',
    [
      { name: 'Tell Us Your Vibe', text: 'Choose your travel style — romantic, adventure, relaxation, or celebration.' },
      { name: 'Get Your AI Itinerary', text: 'Our AI creates a personalized day-by-day itinerary with hotels, activities, and transfers.' },
      { name: 'Book and Travel', text: 'Review, customize if needed, and book your entire trip in one click.' }
    ]
  )
  return (
    <>
      <SchemaMarkup schema={softwareSchema} id="software-schema" />
      <SchemaMarkup schema={howToSchema} id="howto-schema" />
      {children}
    </>
  )
}
