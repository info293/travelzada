'use client'

interface DestinationPackage {
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
  Highlights?: string[]
  Day_Wise_Itinerary_Details?: Array<{
    day: number
    title: string
    description: string
    activities: string[]
  }>
}

interface PackageFormProps {
  formData: Partial<DestinationPackage>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  setFormData?: (updater: (prev: Partial<DestinationPackage>) => Partial<DestinationPackage>) => void
  editingPackage: DestinationPackage | null
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export default function PackageForm({
  formData,
  handleInputChange,
  setFormData,
  editingPackage,
  onSubmit,
  onCancel,
}: PackageFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-8 relative">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 py-4 mb-6 flex justify-between items-center shadow-sm -mx-6 px-6 rounded-t-xl">
        <h3 className="text-lg font-bold text-gray-900">
          {editingPackage ? 'Edit Package' : 'Create Package'}
        </h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm shadow-sm"
          >
            {editingPackage ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
      {/* Basic Information Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Destination ID *</label>
            <input
              type="text"
              name="Destination_ID"
              value={formData.Destination_ID || ''}
              onChange={handleInputChange}
              required
              placeholder="DEST_001_BALI"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Destination Name *</label>
            <input
              type="text"
              name="Destination_Name"
              value={formData.Destination_Name || ''}
              onChange={handleInputChange}
              required
              placeholder="Bali, Indonesia"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Overview </label>
            <textarea
              name="Overview"
              value={formData.Overview || ''}
              onChange={handleInputChange}
              rows={3}
              placeholder="Romantic island escape with beaches, temples, and luxury villas."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration </label>
            <input
              type="text"
              name="Duration"
              value={formData.Duration || ''}
              onChange={handleInputChange}
              placeholder="5 Nights / 6 Days"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration Nights </label>
            <input
              type="number"
              name="Duration_Nights"
              value={formData.Duration_Nights !== undefined && formData.Duration_Nights !== null ? formData.Duration_Nights : ''}
              onChange={handleInputChange}
              placeholder="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration Days </label>
            <input
              type="number"
              name="Duration_Days"
              value={formData.Duration_Days !== undefined && formData.Duration_Days !== null ? formData.Duration_Days : ''}
              onChange={handleInputChange}
              placeholder="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Slug </label>
            <input
              type="text"
              name="Slug"
              value={formData.Slug || ''}
              onChange={handleInputChange}
              placeholder="bali-romantic-island-escape"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Travel Details Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Travel Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mood </label>
            <select
              name="Mood"
              value={formData.Mood || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Mood</option>
              <option value="Romantic">Romantic</option>
              <option value="Explore">Explore</option>
              <option value="Relax">Relax</option>
              <option value="Adventure">Adventure</option>
              <option value="Luxury">Luxury</option>
              {formData.Mood && !['Romantic', 'Explore', 'Relax', 'Adventure', 'Luxury'].includes(formData.Mood) && (
                <option value={formData.Mood}>{formData.Mood} (Current)</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Occasion </label>
            <input
              type="text"
              name="Occasion"
              value={formData.Occasion || ''}
              onChange={handleInputChange}
              placeholder="Honeymoon, Family Vacation, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Travel Type </label>
            <select
              name="Travel_Type"
              value={formData.Travel_Type || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Type</option>
              <option value="Couple">Couple</option>
              <option value="Family">Family</option>
              <option value="Solo">Solo</option>
              <option value="Friends">Friends</option>
              <option value="Friends / Solo">Friends / Solo</option>
              <option value="Solo / Small Group">Solo / Small Group</option>
              <option value="Couple / Solo / Family">Couple / Solo / Family</option>
              {formData.Travel_Type && !['Couple', 'Family', 'Solo', 'Friends', 'Friends / Solo', 'Solo / Small Group', 'Couple / Solo / Family'].includes(formData.Travel_Type) && (
                <option value={formData.Travel_Type}>{formData.Travel_Type} (Current)</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Theme </label>
            <input
              type="text"
              name="Theme"
              value={formData.Theme || ''}
              onChange={handleInputChange}
              placeholder="Beach / Culture / Relax"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Adventure Level </label>
            <select
              name="Adventure_Level"
              value={formData.Adventure_Level || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Level</option>
              <option value="Light">Light</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              {formData.Adventure_Level && !['Light', 'Moderate', 'High'].includes(formData.Adventure_Level) && (
                <option value={formData.Adventure_Level}>{formData.Adventure_Level} (Current)</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Group Size </label>
            <input
              type="text"
              name="Group_Size"
              value={formData.Group_Size || ''}
              onChange={handleInputChange}
              placeholder="2 Adults, 2 Adults + 1 Child, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Child Friendly </label>
            <select
              name="Child_Friendly"
              value={formData.Child_Friendly || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Elderly Friendly </label>
            <select
              name="Elderly_Friendly"
              value={formData.Elderly_Friendly || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Language Preference </label>
            <input
              type="text"
              name="Language_Preference"
              value={formData.Language_Preference || ''}
              onChange={handleInputChange}
              placeholder="English"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Seasonality </label>
            <input
              type="text"
              name="Seasonality"
              value={formData.Seasonality || ''}
              onChange={handleInputChange}
              placeholder="April–October, All Year, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ideal Traveler Persona </label>
            <textarea
              name="Ideal_Traveler_Persona"
              value={formData.Ideal_Traveler_Persona || ''}
              onChange={handleInputChange}
              rows={2}
              placeholder="Couples aged 25–35 seeking a private romantic escape"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Category </label>
            <select
              name="Budget_Category"
              value={formData.Budget_Category || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Category</option>
              <option value="Economy">Economy</option>
              <option value="Mid">Mid</option>
              <option value="Premium">Premium</option>
              <option value="Luxury">Luxury</option>
              {formData.Budget_Category && !['Economy', 'Mid', 'Premium', 'Luxury'].includes(formData.Budget_Category) && (
                <option value={formData.Budget_Category}>{formData.Budget_Category} (Current)</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range (INR) </label>
            <input
              type="text"
              name="Price_Range_INR"
              value={formData.Price_Range_INR || ''}
              onChange={handleInputChange}
              placeholder="₹95,000 – ₹1,10,000 per couple"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price Min (INR) <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="number"
              name="Price_Min_INR"
              value={formData.Price_Min_INR !== undefined && formData.Price_Min_INR !== null ? formData.Price_Min_INR : ''}
              onChange={handleInputChange}
              placeholder="95000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price Max (INR) <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="number"
              name="Price_Max_INR"
              value={formData.Price_Max_INR !== undefined && formData.Price_Max_INR !== null ? formData.Price_Max_INR : ''}
              onChange={handleInputChange}
              placeholder="110000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Accommodation Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Accommodation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Star Category </label>
            <select
              name="Star_Category"
              value={formData.Star_Category || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Category</option>
              <option value="3-Star">3-Star</option>
              <option value="4-Star">4-Star</option>
              <option value="5-Star">5-Star</option>
              {formData.Star_Category && !['3-Star', '4-Star', '5-Star'].includes(formData.Star_Category) && (
                <option value={formData.Star_Category}>{formData.Star_Category} (Current)</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stay Type </label>
            <input
              type="text"
              name="Stay_Type"
              value={formData.Stay_Type || ''}
              onChange={handleInputChange}
              placeholder="Resort, Hotel, Villa, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meal Plan </label>
            <input
              type="text"
              name="Meal_Plan"
              value={formData.Meal_Plan || ''}
              onChange={handleInputChange}
              placeholder="Breakfast Only, Half Board, Full Board"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hotel Examples </label>
            <input
              type="text"
              name="Hotel_Examples"
              value={formData.Hotel_Examples || ''}
              onChange={handleInputChange}
              placeholder="The Anvaya Beach Resort, Amadea Resort Seminyak"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location Breakup </label>
            <input
              type="text"
              name="Location_Breakup"
              value={formData.Location_Breakup || ''}
              onChange={handleInputChange}
              placeholder="3N Seminyak + 2N Ubud"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Itinerary & Details Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Itinerary & Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Day Wise Itinerary </label>
            <textarea
              name="Day_Wise_Itinerary"
              value={formData.Day_Wise_Itinerary || ''}
              onChange={handleInputChange}
              rows={4}
              placeholder="Day 1: Arrive & relax | Day 2: Ubud Tour | Day 3: Watersports..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Highlights (JSON Array)</label>
            <textarea
              name="Highlights"
              value={formData.Highlights ? JSON.stringify(formData.Highlights, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : []
                  if (setFormData) {
                    setFormData((prev: any) => ({ ...prev, Highlights: parsed }))
                  } else {
                    handleInputChange({ target: { name: 'Highlights', value: JSON.stringify(parsed) } } as any)
                  }
                } catch (err) {
                  // Invalid JSON
                }
              }}
              rows={4}
              placeholder='["Sunset Dinner Cruise", "Private Pool Villa Stay"]'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Day Wise Itinerary (JSON Array)</label>
            <textarea
              name="Day_Wise_Itinerary_Details"
              value={formData.Day_Wise_Itinerary_Details ? JSON.stringify(formData.Day_Wise_Itinerary_Details, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : []
                  if (setFormData) {
                    setFormData((prev: any) => ({ ...prev, Day_Wise_Itinerary_Details: parsed }))
                  } else {
                    handleInputChange({ target: { name: 'Day_Wise_Itinerary_Details', value: JSON.stringify(parsed) } } as any)
                  }
                } catch (err) {
                  // Invalid JSON
                }
              }}
              rows={6}
              placeholder='[{"day": 1, "title": "Arrival", "description": "...", "activities": []}]'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Inclusions </label>
            <textarea
              name="Inclusions"
              value={formData.Inclusions || ''}
              onChange={handleInputChange}
              rows={3}
              placeholder="4★ stay with breakfast, private transfers, Ubud & Nusa Dua tours..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Exclusions</label>
            <textarea
              name="Exclusions"
              value={formData.Exclusions || ''}
              onChange={handleInputChange}
              rows={2}
              placeholder="Flights, visa, personal expenses"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rating </label>
            <input
              type="text"
              name="Rating"
              value={formData.Rating || ''}
              onChange={handleInputChange}
              placeholder="4.8/5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Location & Transfer Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Location & Transfer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Airport Code </label>
            <input
              type="text"
              name="Airport_Code"
              value={formData.Airport_Code || ''}
              onChange={handleInputChange}
              placeholder="DPS, SIN, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Transfer Type </label>
            <select
              name="Transfer_Type"
              value={formData.Transfer_Type || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Type</option>
              <option value="Private">Private</option>
              <option value="Shared">Shared</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Currency </label>
            <input
              type="text"
              name="Currency"
              value={formData.Currency || ''}
              onChange={handleInputChange}
              placeholder="IDR, SGD, INR, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Climate Type </label>
            <input
              type="text"
              name="Climate_Type"
              value={formData.Climate_Type || ''}
              onChange={handleInputChange}
              placeholder="Tropical, Temperate, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Safety Score </label>
            <input
              type="text"
              name="Safety_Score"
              value={formData.Safety_Score || ''}
              onChange={handleInputChange}
              placeholder="8.5/10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sustainability Score </label>
            <input
              type="text"
              name="Sustainability_Score"
              value={formData.Sustainability_Score || ''}
              onChange={handleInputChange}
              placeholder="7/10"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Media & SEO Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Media & SEO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Image URL </label>
            <input
              type="url"
              name="Primary_Image_URL"
              value={formData.Primary_Image_URL || ''}
              onChange={handleInputChange}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Image URL </label>
            <input
              type="url"
              name="Meta_Image_URL"
              value={formData.Meta_Image_URL || ''}
              onChange={handleInputChange}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Booking URL </label>
            <input
              type="url"
              name="Booking_URL"
              value={formData.Booking_URL || ''}
              onChange={handleInputChange}
              placeholder="https://travelzada.com/packages/DEST_001_BALI"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">SEO Title </label>
            <input
              type="text"
              name="SEO_Title"
              value={formData.SEO_Title || ''}
              onChange={handleInputChange}
              placeholder="Romantic Bali Island Escape | Luxury 5-Night Honeymoon Package"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">SEO Description </label>
            <textarea
              name="SEO_Description"
              value={formData.SEO_Description || ''}
              onChange={handleInputChange}
              rows={3}
              placeholder="Celebrate love in Bali with a 5-night luxury getaway..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">SEO Keywords </label>
            <input
              type="text"
              name="SEO_Keywords"
              value={formData.SEO_Keywords || ''}
              onChange={handleInputChange}
              placeholder="Bali honeymoon package, romantic Bali holiday, Ubud tour..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Guest Reviews, Policies & FAQ Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">Guest Reviews, Policies & FAQ</h3>

        {/* Guest Reviews */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Guest Reviews (JSON Array)</label>
          <textarea
            name="Guest_Reviews"
            value={formData.Guest_Reviews ? JSON.stringify(formData.Guest_Reviews, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : []
                if (setFormData) {
                  setFormData((prev: any) => ({ ...prev, Guest_Reviews: parsed }))
                } else {
                  handleInputChange({ target: { name: 'Guest_Reviews', value: JSON.stringify(parsed) } } as any)
                }
              } catch {
                // Invalid JSON, keep as string for now
              }
            }}
            rows={6}
            placeholder={`[\n  {\n    "name": "Anjali Mehta",\n    "content": "Best vacation ever!",\n    "date": "14 November 2025",\n    "rating": "5/5"\n  }\n]`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter as JSON array. Each review should have: name, content, date, and optional rating.</p>
        </div>

        {/* Booking Policies */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Booking Policies (JSON Object)</label>
          <textarea
            name="Booking_Policies"
            value={formData.Booking_Policies ? JSON.stringify(formData.Booking_Policies, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : {}
                if (setFormData) {
                  setFormData((prev: any) => ({ ...prev, Booking_Policies: parsed }))
                } else {
                  handleInputChange({ target: { name: 'Booking_Policies', value: JSON.stringify(parsed) } } as any)
                }
              } catch {
                // Invalid JSON
              }
            }}
            rows={6}
            placeholder={`{\n  "booking": ["Instant confirmation", "Flexible dates", "24/7 support"],\n  "payment": ["Pay in instalments", "Zero cost EMI", "Secure transactions"],\n  "cancellation": ["Free cancellation up to 7 days", "Partial refund available"]\n}`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter as JSON object with booking, payment, and cancellation arrays.</p>
        </div>

        {/* FAQ Items */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">FAQ Items (JSON Array)</label>
          <textarea
            name="FAQ_Items"
            value={formData.FAQ_Items ? JSON.stringify(formData.FAQ_Items, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : []
                if (setFormData) {
                  setFormData((prev: any) => ({ ...prev, FAQ_Items: parsed }))
                } else {
                  handleInputChange({ target: { name: 'FAQ_Items', value: JSON.stringify(parsed) } } as any)
                }
              } catch {
                // Invalid JSON
              }
            }}
            rows={6}
            placeholder={`[\n  {\n    "question": "What is the best time to visit?",\n    "answer": "The dry season from April to October..."\n  }\n]`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter as JSON array. Each FAQ should have: question and answer.</p>
        </div>

        {/* Why Book With Us */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Why Book With Us (JSON Array)</label>
          <textarea
            name="Why_Book_With_Us"
            value={formData.Why_Book_With_Us ? JSON.stringify(formData.Why_Book_With_Us, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : []
                if (setFormData) {
                  setFormData((prev: any) => ({ ...prev, Why_Book_With_Us: parsed }))
                } else {
                  handleInputChange({ target: { name: 'Why_Book_With_Us', value: JSON.stringify(parsed) } } as any)
                }
              } catch {
                // Invalid JSON
              }
            }}
            rows={5}
            placeholder={`[\n  {\n    "label": "Best Price Guarantee",\n    "description": "Direct contracts with premium hotels"\n  }\n]`}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Enter as JSON array. Each item should have: label and description.</p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex gap-4 pt-4 border-t border-gray-200 mt-8">
        <button
          type="submit"
          className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          {editingPackage ? 'Update Package' : 'Create Package'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

