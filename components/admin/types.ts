// Shared types for admin dashboard components

export interface DestinationPackage {
    id?: string
    Destination_ID: string
    Destination_Name: string
    Overview: string
    Duration: string
    Mood: string
    Occasion: string
    Travel_Type: string
    Budget_Category: string
    Price_Range_INR: string
    Theme: string
    Adventure_Level: string
    Stay_Type: string
    Star_Category: string
    Meal_Plan: string
    Group_Size: string
    Child_Friendly: string
    Elderly_Friendly: string
    Language_Preference: string
    Seasonality: string
    Hotel_Examples: string
    Inclusions: string
    Exclusions: string
    Day_Wise_Itinerary: string
    Rating: string
    Location_Breakup: string
    Airport_Code: string
    Transfer_Type: string
    Currency: string
    Climate_Type: string
    Safety_Score: string
    Sustainability_Score: string
    Ideal_Traveler_Persona: string
    Created_By: string
    Last_Updated: string
    Slug: string
    Primary_Image_URL: string
    Booking_URL: string
    Price_Min_INR: number
    Price_Max_INR: number
    Duration_Nights: number
    Duration_Days: number
    SEO_Title: string
    SEO_Description: string
    SEO_Keywords: string
    Meta_Image_URL: string
    Guest_Reviews?: Array<{
        name: string
        content: string
        date: string
        rating?: string
    }>
    Booking_Policies?: {
        booking?: string[]
        payment?: string[]
        cancellation?: string[]
    }
    FAQ_Items?: Array<{
        question: string
        answer: string
    }>
    Why_Book_With_Us?: Array<{
        label: string
        description: string
    }>
}

export interface BlogSection {
    type: 'intro' | 'paragraph' | 'heading' | 'subheading' | 'image' | 'quote' | 'list' | 'cta' | 'divider' | 'faq' | 'toc' | 'related'
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
    featured?: boolean
    published?: boolean
    createdAt?: string
    updatedAt?: string
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    canonicalUrl?: string
    ogImage?: string
    schemaType?: 'Article' | 'BlogPosting' | 'NewsArticle'
    slug?: string
}

export interface User {
    id?: string
    email: string
    displayName?: string
    photoURL?: string
    role: 'user' | 'admin'
    permissions?: TabType[]
    createdAt: string
    lastLogin?: string
    isActive: boolean
}

export interface Testimonial {
    id?: string
    name: string
    rating: number
    quote: string
    featured?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Destination {
    id?: string
    name: string
    country: string
    region?: 'India' | 'International'
    description: string
    image: string
    slug: string
    featured?: boolean
    rating?: number
    packageIds?: string[]
    bestTimeToVisit?: string
    duration?: string
    currency?: string
    language?: string
    highlights?: string[]
    activities?: string[]
    budgetRange?: {
        budget: string
        midRange: string
        luxury: string
    }
    hotelTypes?: string[]
    createdAt?: string
    updatedAt?: string
}

export interface Lead {
    id?: string
    name: string
    mobile: string
    sourceUrl: string
    packageName: string
    status: string
    createdAt: any
    read: boolean
    email?: string
    destination?: string
    travelDate?: string
    travelersCount?: number
    travelType?: string
    budget?: string
    notes?: string
}

export interface Subscriber {
    id?: string
    email: string
    subscribedAt: any
    status: string
    source?: string
}

export interface ContactMessage {
    id?: string
    name: string
    email: string
    phone: string
    destination: string
    message: string
    status: string
    createdAt: any
    read: boolean
}

export interface JobApplication {
    id?: string
    name: string
    email: string
    phone: string
    linkedin: string
    position: string
    coverLetter: string
    status: string
    createdAt: any
    read: boolean
}

export type TabType = 'packages' | 'blogs' | 'users' | 'destinations' | 'subscribers' | 'contacts' | 'leads' | 'careers' | 'testimonials' | 'dashboard' | 'ai-generator' | 'create-itinerary' | 'customer-records'

// Customer Itinerary CRM Types
export interface FlightDetail {
    date: string
    airline: string
    flightNumber: string
    departureTime: string
    arrivalTime: string
    departureCity: string
    arrivalCity: string
}

export interface HotelDetail {
    city: string
    hotelName: string
    checkIn: string
    checkOut: string
    roomType: string
    mealPlan: string
}

export interface DayItinerary {
    day: number
    title: string
    description: string
    activities: string[]
}

export interface HistoryEntry {
    action: string
    timestamp: string
    details?: string
    user?: string
}

export interface CustomerReview {
    rating: number
    comment: string
    date: string
}

export interface CustomerItinerary {
    id?: string
    // Customer Info
    clientName: string
    clientEmail: string
    clientPhone: string
    // Itinerary Basics
    packageId: string
    packageName: string
    destinationName: string
    travelDate: string
    adults: number
    children: number
    // Financial
    totalCost: number
    advancePaid: number
    balanceDue: number
    // Details
    flights: FlightDetail[]
    hotels: HotelDetail[]
    customItinerary?: DayItinerary[]
    notes: string
    // Status Tracking
    status: 'draft' | 'sent' | 'confirmed' | 'completed' | 'cancelled'
    // History/Audit Trail
    history: HistoryEntry[]
    // Reviews
    customerReview?: CustomerReview
    // Metadata
    createdAt: string
    updatedAt: string
    createdBy: string
}

