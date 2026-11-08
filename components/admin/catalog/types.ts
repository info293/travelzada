/**
 * Catalog (packages + destinations) types for the admin.
 * Field names MUST stay exactly as the public website reads them from Firestore.
 */

export interface ItineraryDay {
  day: number
  title: string
  description: string
  activities: string[]
}

export interface GuestReview {
  name: string
  content: string
  date: string
  rating?: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface WhyBookItem {
  label: string
  description: string
}

export interface BookingPolicies {
  booking?: string[]
  payment?: string[]
  cancellation?: string[]
}

/** A document in the `packages` collection. */
export interface PackageRecord {
  id?: string
  /** Package code, e.g. BAL_005. Destinations link packages by this value (destinations.packageIds). */
  Destination_ID: string
  /** Shown everywhere on the site as the package title. */
  Destination_Name: string
  Overview: string
  Duration: string
  Duration_Nights: number
  Duration_Days: number
  Price_Range_INR: string
  Price_Min_INR: number
  Price_Max_INR: number
  Primary_Image_URL: string
  /** Extra photos for the package page gallery (the main photo is always shown first). */
  Gallery_Images: string[]
  Image_Alt_Text: string
  Meta_Image_URL: string
  Mood: string
  Occasion: string
  Travel_Type: string
  Theme: string
  Budget_Category: string
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
  Inclusions: string | string[]
  Exclusions: string | string[]
  Day_Wise_Itinerary: string
  Day_Wise_Itinerary_Details: ItineraryDay[]
  Highlights: string[]
  Rating: string
  Location_Breakup: string
  Airport_Code: string
  Transfer_Type: string
  Currency: string
  Climate_Type: string
  Safety_Score: string
  Sustainability_Score: string
  Ideal_Traveler_Persona: string
  Slug: string
  Booking_URL: string
  SEO_Title: string
  SEO_Description: string
  SEO_Keywords: string
  Guest_Reviews: GuestReview[]
  Booking_Policies: BookingPolicies
  FAQ_Items: FaqItem[]
  Why_Book_With_Us: WhyBookItem[]
  Created_By: string
  Last_Updated: string
}

export type PackageDraft = Partial<PackageRecord>

/** A document in the `destinations` collection. */
export interface DestinationRecord {
  id?: string
  name: string
  country: string
  region?: 'India' | 'International'
  description: string
  image: string
  slug: string
  featured?: boolean
  /** Destination_ID values of the packages shown on this destination page. Empty = site matches packages by name. */
  packageIds?: string[]
  bestTimeToVisit?: string
  duration?: string
  currency?: string
  language?: string
  highlights?: string[]
  activities?: string[]
  budgetRange?: { budget?: string; midRange?: string; luxury?: string }
  hotelTypes?: string[]
  rating?: number | null
  airportCities?: Array<{ cityName: string; url: string }>
  fromIndiaCities?: Array<{ cityName: string; url: string }>
  travelGuides?: Array<{ title: string; description: string; url?: string }>
  faqs?: FaqItem[]
  createdAt?: string
  updatedAt?: string
}
