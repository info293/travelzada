export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'

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
        const body = await request.json()
        // agentSlug is optional — if present, scope to that agent's packages only
        const { agentSlug, ...wizardData } = body

        console.log('\n--- [AI Planner] NEW TAILORED TRAVEL REQUEST ---')
        console.log('[AI Planner] Agent Slug:', agentSlug || '(none — using main packages)')
        console.log('[AI Planner] Received User Preferences:', JSON.stringify(wizardData, null, 2))

        if (!wizardData || !wizardData.destinations || wizardData.destinations.length === 0) {
            console.warn('[AI Planner] Rejecting request: No destinations provided.')
            return NextResponse.json(
                { error: 'No destinations provided.' },
                { status: 400 }
            )
        }

        const requestedDestinations = wizardData.destinations.map((d: string) => {
            let normalized = d.toLowerCase();
            if (normalized.includes('andaman')) return 'andaman';
            if (normalized.includes('sri lanka') || normalized.includes('sri-lanka')) return 'sri lanka';
            return normalized;
        })
        console.log('[AI Planner] Requested Destinations:', requestedDestinations)

        let allPackages: any[] = []

        if (agentSlug) {
            // --- AGENT MODE: fetch from agent_packages scoped to this agent ---
            console.log(`[AI Planner] Agent mode: fetching packages for slug "${agentSlug}"`)

            // Look up agent by slug
            const agentsRef = collection(db, 'agents')
            const agentQ = query(agentsRef, where('agentSlug', '==', agentSlug), where('status', '==', 'active'))
            const agentSnap = await getDocs(agentQ)

            if (agentSnap.empty) {
                return NextResponse.json({ error: 'Agent not found or not active.' }, { status: 404 })
            }

            const agentDoc = agentSnap.docs[0]
            const agentId = agentDoc.id
            const agentData = agentDoc.data()

            // Fetch agent's packages
            const agentPkgRef = collection(db, 'agent_packages')
            const agentPkgQ = query(
                agentPkgRef,
                where('agentId', '==', agentId),
                where('isActive', '==', true)
            )
            const agentPkgSnap = await getDocs(agentPkgQ)

            agentPkgSnap.forEach(d => {
                const data = d.data()
                if (
                    data.destination &&
                    requestedDestinations.some((dest: string) =>
                        data.destination.toLowerCase().includes(dest)
                    )
                ) {
                    allPackages.push({
                        id: d.id,
                        source: 'agent',
                        Destination_ID: d.id,
                        Slug: '',
                        Destination_Name: data.destination,
                        Overview: data.overview || '',
                        Duration_Days: data.durationDays || 0,
                        Duration_Nights: data.durationNights || 0,
                        Price_Min_INR: data.pricePerPerson || 0,
                        Travel_Type: data.travelType || '',
                        Mood: data.mood || '',
                        Star_Category: data.starCategory || '',
                        Theme: data.theme || '',
                        Primary_Image_URL: data.primaryImageUrl || '',
                        Day_Wise_Itinerary: data.dayWiseItinerary || '',
                        Day_Wise_Itinerary_Details: [],
                        Inclusions: Array.isArray(data.inclusions) ? data.inclusions.join(', ') : (data.inclusions || ''),
                        // Agent-specific extras
                        agentPackageTitle: data.title || data.destination,
                        agentId,
                        agentSlug,
                    })
                }
            })

            console.log(`[AI Planner] Found ${allPackages.length} matching agent packages.`)

            // Fallback to main packages only if agent explicitly allows it
            if (allPackages.length === 0 && agentData.fallbackToTravelzada === true) {
                console.log('[AI Planner] No agent packages matched. Falling back to Travelzada main packages.')
                allPackages = await fetchMainPackages(requestedDestinations)
            } else if (allPackages.length === 0) {
                console.log('[AI Planner] No agent packages matched and fallback is disabled.')
                return NextResponse.json({ success: true, packages: [], noAgentPackages: true })
            }
        } else {
            // --- MAIN SITE MODE: fetch from main packages collection ---
            allPackages = await fetchMainPackages(requestedDestinations)
        }

        console.log(`[AI Planner] Fetched ${allPackages.length} eligible packages.`)

        if (allPackages.length === 0) {
            console.log('[AI Planner] No matching packages found.')
            return NextResponse.json({ success: true, packages: [] })
        }

        // Build Claude prompts
        const systemPrompt = `You are a luxury travel curator AI for Travelzada.
Your job is to evaluate a list of available travel packages against a user's highly specific "Tailored Travel" preferences, and return the top 3 best matching packages in strict JSON format.

EVALUATION CRITERIA SCORING SYSTEM (Start with Base Score: 100 for each package):
Priority 1 - Destination Match (CRITICAL): The destination MUST match. If the destination does not match, the score is 0. Do not include it.
Priority 2 - Duration Match (HIGH): The package duration MUST match the Requested Duration in nights.
   - Exact match: Deduct 0 points.
   - Exactly 1 night less (Fallback): Deduct 5 points.
   - Any other duration mismatch: Deduct 30 points.
Priority 3 - Hotel / Star Category (MEDIUM): The package's star category should match the user's requested Hotel Preference.
   - If Star Category does NOT match: Deduct 15 points.
Priority 4 - Vibes/Experiences & Group Type (LOW):
   - Deduct 2 to 5 points for mismatches in vibe, experiences, or group type.

INSTRUCTIONS:
- Analyze the User Preferences thoroughly against the Available Packages.
- Calculate the "matchScore" (0-100) for each package by starting at 100 and applying the deductions strictly in order of priority above.
- Sort the packages by matchScore in descending order, and retrieve the top 3.
- Provide a brief 1-2 sentence "matchReason" explaining exactly why this package was selected, explicitly mentioning the star category, vibe, and duration.
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

        const totalNights = wizardData.routeItems?.reduce((acc: number, item: any) => acc + (item.nights || 0), 0) || 0;

        const userPrompt = `
=== USER PREFERENCES ===
Destinations: ${wizardData.destinations.join(', ')}
Date Range: ${wizardData.dateRange}
Requested Duration: ${totalNights > 0 ? totalNights + ' Nights' : 'Flexible'}
Vibe/Experiences: ${wizardData.experiences.join(', ')}
Group Type: ${wizardData.groupType}
Hotel Preference: ${wizardData.hotelTypes.join(', ')}
Travelers: ${wizardData.passengers.adults} Adults, ${wizardData.passengers.kids} Kids
Rooms Required: ${wizardData.passengers.rooms}

=== AVAILABLE PACKAGES IN DATABASE ===
${JSON.stringify(allPackages, null, 2)}

Return the top matches in the requested JSON format.`

        console.log('[AI Planner] Determining best packages using Claude Sonnet...')

        const claudeResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.1,
        })

        const textContent = claudeResponse.content.find(block => block.type === 'text') as any
        const responseText = textContent?.text?.trim() || '[]'

        console.log('\n[AI Planner] Raw Claude Response:')
        console.log(responseText)

        let matchedPackageIds: any[] = []
        try {
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
            matchedPackageIds = JSON.parse(cleanJson)
            console.log(`[AI Planner] Parsed ${matchedPackageIds.length} recommendations.`)
        } catch (e) {
            console.error("Failed to parse Claude JSON response:", responseText)
            return NextResponse.json(
                { error: 'AI failed to return valid matches.' },
                { status: 500 }
            )
        }

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
        }).filter(Boolean)

        finalResults.sort((a, b) => b.matchScore - a.matchScore)

        console.log('[AI Planner] Processing Complete! Returning', finalResults.length, 'packages.')

        return NextResponse.json({ success: true, packages: finalResults })

    } catch (error: any) {
        console.error('Find Packages API error:', error)
        return NextResponse.json(
            { error: 'An error occurred while finding matches.' },
            { status: 500 }
        )
    }
}

async function fetchMainPackages(requestedDestinations: string[]) {
    const packagesRef = collection(db, 'packages')
    const querySnapshot = await getDocs(packagesRef)

    const result: any[] = []
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        if (
            data.Destination_Name &&
            requestedDestinations.some((d: string) => data.Destination_Name.toLowerCase().includes(d))
        ) {
            let parsedPrice = 0
            const rawPrice = data.Price_Min_INR || data.Price_Range_INR || data.Price || data.budget || 0
            if (typeof rawPrice === 'number') {
                parsedPrice = rawPrice
            } else if (typeof rawPrice === 'string') {
                const numericOnly = rawPrice.replace(/[^0-9]/g, '')
                parsedPrice = parseInt(numericOnly, 10) || 0
            }

            result.push({
                id: docSnap.id,
                source: 'travelzada',
                Destination_ID: data.Destination_ID || '',
                Slug: data.Slug || '',
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
    return result
}
