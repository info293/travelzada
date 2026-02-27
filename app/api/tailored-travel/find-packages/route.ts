import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

// Initialize Anthropic (Claude)
const anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

export async function POST(request: Request) {
    if (!anthropic) {
        return NextResponse.json(
            { error: 'Anthropic API key is not configured.' },
            { status: 500 }
        )
    }

    try {
        const wizardData = await request.json()

        console.log('\n--- [AI Planner] NEW TAILORED TRAVEL REQUEST ---')
        console.log('[AI Planner] Received User Preferences:', JSON.stringify(wizardData, null, 2))

        if (!wizardData || !wizardData.destinations || wizardData.destinations.length === 0) {
            console.warn('[AI Planner] Rejecting request: No destinations provided.')
            return NextResponse.json(
                { error: 'No destinations provided.' },
                { status: 400 }
            )
        }

        const requestedDestinations = wizardData.destinations.map((d: string) => d.toLowerCase())
        console.log('[AI Planner] Requested Destinations:', requestedDestinations)

        // 1. Fetch available packages from Firestore
        const packagesRef = collection(db, 'packages')
        const querySnapshot = await getDocs(packagesRef)

        let allPackages: any[] = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            // Only include packages that match one of the requested destinations 
            // (or if no specific destination filter is strictly required, just get all and let AI filter. 
            // Filtering here helps reduce context window size)
            if (data.Destination_Name && requestedDestinations.some((d: string) => data.Destination_Name.toLowerCase().includes(d))) {

                // Ensure price is a clean number
                let parsedPrice = 0
                const rawPrice = data.Price_Min_INR || data.Price_Range_INR || data.Price || data.budget || 0
                if (typeof rawPrice === 'number') {
                    parsedPrice = rawPrice
                } else if (typeof rawPrice === 'string') {
                    // Try to strip out non-numeric characters (like "₹50,000" -> 50000)
                    const numericOnly = rawPrice.replace(/[^0-9]/g, '')
                    parsedPrice = parseInt(numericOnly, 10) || 0
                }

                allPackages.push({
                    id: doc.id,
                    Destination_Name: data.Destination_Name,
                    Overview: data.Overview || '',
                    Duration_Days: data.Duration_Days || 0,
                    Duration_Nights: data.Duration_Nights || 0,
                    Price_Min_INR: parsedPrice,
                    Travel_Type: data.Travel_Type || '',
                    Mood: data.Mood || '',
                    Star_Category: data.Star_Category || '',
                    Theme: data.Theme || '',
                    Primary_Image_URL: data.Primary_Image_URL || '',
                    Day_Wise_Itinerary: data.Day_Wise_Itinerary || '',
                    Day_Wise_Itinerary_Details: data.Day_Wise_Itinerary_Details || [],
                    Inclusions: data.Inclusions || ''
                })
            }
        })

        console.log(`[AI Planner] Fetched ${allPackages.length} eligible packages from Firestore.`)

        if (allPackages.length === 0) {
            console.log('[AI Planner] No matching packages found in database for these destinations.')
            return NextResponse.json({ success: true, packages: [] })
        }

        // 2. Prepare context for Claude Sonnet
        const systemPrompt = `You are a luxury travel curator AI for Travelzada.
Your job is to evaluate a list of available travel packages against a user's highly specific "Tailored Travel" preferences, and return the top 3 best matching packages in strict JSON format.

EVALUATION CRITERIA (in order of importance):
1. Destination Match
2. Star Category Preference (e.g., if they want 5-star, prioritize luxury)
3. Travel Group/Vibe (Family vs Solo, Adventure vs Relaxing)
4. Budget / Cost expectations based on their requests

INSTRUCTIONS:
- Analyze the User Preferences thoroughly.
- Review the provided Available Packages.
- Select up to 3 packages that best fit the requirements.
- Calculate a "matchScore" (0-100) for each based on how perfectly it fits.
- Provide a brief 1-2 sentence "matchReason" explaining exactly why this package is perfect for them based on their specific inputs (mention their requested vibe or group type).
- Return ONLY valid JSON.
- DO NOT wrap the JSON in markdown blocks like \`\`\`json. Just output the raw JSON array.
- The JSON structure MUST exactly match this format:
[
  {
    "id": "package_id_here",
    "matchScore": 95,
    "matchReason": "This package perfectly matches your request for a luxury 5-star relaxing experience."
  }
]`

        const userPrompt = `
=== USER PREFERENCES ===
Destinations: ${wizardData.destinations.join(', ')}
Date Range: ${wizardData.dateRange}
Vibe/Experiences: ${wizardData.experiences.join(', ')}
Group Type: ${wizardData.groupType}
Hotel Preference: ${wizardData.hotelTypes.join(', ')}
Travelers: ${wizardData.passengers.adults} Adults, ${wizardData.passengers.kids} Kids
Rooms Required: ${wizardData.passengers.rooms}

=== AVAILABLE PACKAGES IN DATABASE ===
${JSON.stringify(allPackages, null, 2)}

Return the top matches in the requested JSON format.`

        console.log('[AI Planner] 💭 Determining best packages using Claude Sonnet...')
        console.log('[AI Planner] System Prompt Length:', systemPrompt.length)
        console.log('[AI Planner] User Prompt sent to Claude (preview):', userPrompt.substring(0, 300) + '... (truncated for brevity)')

        // 3. Call Claude Sonnet
        const claudeResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.1, // Low temperature for consistent JSON output
        })

        const textContent = claudeResponse.content.find(block => block.type === 'text') as any
        const responseText = textContent?.text?.trim() || '[]'

        console.log('\n[AI Planner] 🤖 Raw Claude Response:')
        console.log(responseText)
        console.log('---------------------------------------------------\n')

        // 4. Parse AI Results
        let matchedPackageIds: any[] = []
        try {
            // Strip any accidental markdown blocks Claude might sneak in despite instructions
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
            matchedPackageIds = JSON.parse(cleanJson)
            console.log(`[AI Planner] Successfully parsed ${matchedPackageIds.length} recommendations from JSON.`)
        } catch (e) {
            console.error("Failed to parse Claude JSON response:", responseText)
            return NextResponse.json(
                { error: 'AI failed to return valid matches.' },
                { status: 500 }
            )
        }

        // 5. Hydrate the AI results with the full package data
        const finalResults = matchedPackageIds.map(match => {
            const fullPackageDetails = allPackages.find(p => p.id === match.id)
            if (fullPackageDetails) {
                return {
                    ...fullPackageDetails,
                    matchScore: match.matchScore,
                    matchReason: match.matchReason
                }
            }
            return null
        }).filter(Boolean) // Remove nulls if AI hallucinates an ID

        // Sort by highest score first
        finalResults.sort((a, b) => b.matchScore - a.matchScore)

        console.log('[AI Planner] ✅ Processing Complete! Returning Final Packages to UI:')
        console.log(JSON.stringify(finalResults.map(p => ({
            name: p.Destination_Name,
            score: p.matchScore,
            price: p.Price_Min_INR
        })), null, 2))
        console.log('---------------------------------------------------\n')

        return NextResponse.json({ success: true, packages: finalResults })

    } catch (error: any) {
        console.error('Find Packages API error:', error)
        return NextResponse.json(
            { error: 'An error occurred while finding matches.' },
            { status: 500 }
        )
    }
}
