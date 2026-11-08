'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addDoc, collection, getDocs } from 'firebase/firestore'
import { CheckCircle2, XCircle, SkipForward, X } from 'lucide-react'
import AIPackageGenerator from '@/components/admin/AIPackageGenerator'
import { PageHeader } from '@/components/admin/ui'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'

type ImportResult = { imported: number; skipped: string[]; errors: string[] }

export default function AdminAiPackagesPage() {
  const { currentUser } = useAuth()
  const [result, setResult] = useState<ImportResult | null>(null)

  /** Same behaviour as the legacy admin: skip packages whose Destination_ID already exists, save the rest to `packages` */
  const importPackages = async (generatedPackages: any[]) => {
    const existingSnapshot = await getDocs(collection(db, 'packages'))
    const existingIds = new Set<string>()
    existingSnapshot.docs.forEach((d) => {
      const id = d.data().Destination_ID
      if (id) existingIds.add(String(id).trim().toUpperCase())
    })

    let imported = 0
    const skipped: string[] = []
    const errors: string[] = []

    for (const pkg of generatedPackages) {
      const normalizedId = String(pkg.Destination_ID || '').trim().toUpperCase()
      if (normalizedId && existingIds.has(normalizedId)) {
        skipped.push(pkg.Destination_ID)
        continue
      }
      try {
        const packageData: Record<string, any> = {
          Destination_ID: pkg.Destination_ID,
          Destination_Name: pkg.Destination_Name,
          Overview: pkg.Overview || '',
          Duration: pkg.Duration || '',
          Duration_Nights: pkg.Duration_Nights || 0,
          Duration_Days: pkg.Duration_Days || 0,
          Price_Range_INR: pkg.Price_Range_INR || '',
          Price_Min_INR: pkg.Price_Min_INR || 0,
          Price_Max_INR: pkg.Price_Max_INR || 0,
          Travel_Type: pkg.Travel_Type || '',
          Mood: pkg.Mood || '',
          Occasion: pkg.Occasion || '',
          Budget_Category: pkg.Budget_Category || '',
          Theme: pkg.Theme || '',
          Adventure_Level: pkg.Adventure_Level || '',
          Stay_Type: pkg.Stay_Type || '',
          Star_Category: pkg.Star_Category || '',
          Meal_Plan: pkg.Meal_Plan || '',
          Group_Size: pkg.Group_Size || '',
          Child_Friendly: pkg.Child_Friendly || '',
          Elderly_Friendly: pkg.Elderly_Friendly || '',
          Language_Preference: pkg.Language_Preference || '',
          Seasonality: pkg.Seasonality || '',
          Hotel_Examples: pkg.Hotel_Examples || '',
          Inclusions: pkg.Inclusions || '',
          Exclusions: pkg.Exclusions || '',
          Day_Wise_Itinerary: pkg.Day_Wise_Itinerary || '',
          Rating: pkg.Rating || '',
          Location_Breakup: pkg.Location_Breakup || '',
          Airport_Code: pkg.Airport_Code || '',
          Transfer_Type: pkg.Transfer_Type || '',
          Currency: pkg.Currency || 'INR',
          Climate_Type: pkg.Climate_Type || '',
          Safety_Score: pkg.Safety_Score || '',
          Sustainability_Score: pkg.Sustainability_Score || '',
          Ideal_Traveler_Persona: pkg.Ideal_Traveler_Persona || '',
          Slug: pkg.Slug || '',
          Primary_Image_URL: pkg.Primary_Image_URL || '',
          Booking_URL: pkg.Booking_URL || '',
          SEO_Title: pkg.SEO_Title || '',
          SEO_Description: pkg.SEO_Description || '',
          SEO_Keywords: pkg.SEO_Keywords || '',
          Meta_Image_URL: pkg.Meta_Image_URL || pkg.Primary_Image_URL || '',
          Guest_Reviews: pkg.Guest_Reviews || [],
          Booking_Policies: pkg.Booking_Policies || {},
          FAQ_Items: pkg.FAQ_Items || [],
          Why_Book_With_Us: pkg.Why_Book_With_Us || [],
          Highlights: pkg.Highlights || [],
          Day_Wise_Itinerary_Details: pkg.Day_Wise_Itinerary_Details || [],
          Created_By: currentUser?.email || 'AI Generator',
          Last_Updated: new Date().toISOString().split('T')[0],
        }
        await addDoc(collection(db, 'packages'), packageData)
        imported++
      } catch (error) {
        errors.push(`${pkg.Destination_ID}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    setResult({ imported, skipped, errors })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <PageHeader
        title="AI Package Writer"
        description="Upload an Excel sheet, let AI write complete package pages, review them, then save them to the catalog."
      />

      {result && (
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 text-sm">
              {result.imported > 0 && (
                <p className="flex items-center gap-2 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Saved {result.imported} new package{result.imported === 1 ? '' : 's'} to the catalog.{' '}
                  <Link href="/admin/packages" className="underline text-bordeaux-700">View packages</Link>
                </p>
              )}
              {result.skipped.length > 0 && (
                <p className="flex items-start gap-2 text-amber-700">
                  <SkipForward className="w-4 h-4 mt-0.5 shrink-0" /> Skipped {result.skipped.length} (already exist): {result.skipped.join(', ')}
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="flex items-start gap-2 text-red-700">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{result.errors.map((e) => <div key={e}>{e}</div>)}</div>
                </div>
              )}
              {!result.imported && !result.skipped.length && !result.errors.length && <p className="text-gray-600">No packages to import.</p>}
            </div>
            <button type="button" onClick={() => setResult(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <AIPackageGenerator onImportPackages={importPackages} />
    </div>
  )
}
