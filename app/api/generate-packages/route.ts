import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const model = 'gpt-4o';

export interface PackageInput {
    Destination_ID: string;
    Destination_Name: string;
    Country?: string;
    Price_Range_INR?: string;
    Duration?: string;
    Duration_Nights?: number;
    Duration_Days?: number;
    Travel_Type?: string;
    Mood?: string;
    Occasion?: string;
    Budget_Category?: string;
    Theme?: string;
    Adventure_Level?: string;
    Stay_Type?: string;
    Star_Category?: string;
    Meal_Plan?: string;
    Group_Size?: string;
    Child_Friendly?: string;
    Elderly_Friendly?: string;
    Language_Preference?: string;
    Seasonality?: string;
    Hotel_Examples?: string;
    Rating?: string;
    Location_Breakup?: string;
    Airport_Code?: string;
    Transfer_Type?: string;
    Currency?: string;
    Climate_Type?: string;
    Safety_Score?: string;
    Sustainability_Score?: string;
    Ideal_Traveler_Persona?: string;
    Primary_Image_URL?: string;
    Inclusions?: string[];
    Exclusions?: string[];
    Day_Wise_Itinerary?: Array<{ day: number; description: string }>;
    Guest_Reviews?: Array<{ name: string; content: string; date: string; rating: string }>;
    Booking_Policies?: {
        booking?: string[];
        payment?: string[];
        cancellation?: string[];
    };
    FAQ_Items?: Array<{ question: string; answer: string }>;
    Why_Book_With_Us?: Array<{ label: string; description: string }>;
}

export interface GeneratedPackageData {
    Overview: string;
    Mood: string;
    Occasion: string;
    Travel_Type: string;
    Budget_Category: string;
    Theme: string;
    Adventure_Level: string;
    Stay_Type: string;
    Star_Category: string;
    Meal_Plan: string;
    Child_Friendly: string;
    Elderly_Friendly: string;
    Language_Preference: string;
    Seasonality: string;
    Hotel_Examples: string;
    Inclusions: string;
    Exclusions: string;
    Day_Wise_Itinerary: string;
    Rating: string;
    Location_Breakup: string;
    Airport_Code: string;
    Transfer_Type: string;
    Climate_Type: string;
    Safety_Score: string;
    Sustainability_Score: string;
    Ideal_Traveler_Persona: string;
    Primary_Image_URL: string;
    SEO_Title: string;
    SEO_Description: string;
    SEO_Keywords: string;
    Guest_Reviews: Array<{ name: string; content: string; date: string; rating: string }>;
    Booking_Policies: {
        booking: string[];
        payment: string[];
        cancellation: string[];
    };
    FAQ_Items: Array<{ question: string; answer: string }>;
    Why_Book_With_Us: Array<{ label: string; description: string }>;
    Slug?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const packages: PackageInput[] = body.packages;

        if (!packages || !Array.isArray(packages) || packages.length === 0) {
            return NextResponse.json(
                { error: 'No packages provided' },
                { status: 400 }
            );
        }

        const generatedPackages = await Promise.all(
            packages.map(async (pkg) => {
                try {
                    console.log('\n========================================');
                    console.log(`Generating package: ${pkg.Destination_ID} - ${pkg.Destination_Name}`);
                    console.log('========================================');

                    const generated = await generatePackageData(pkg);

                    console.log('\n--- AI Generated Content ---');
                    console.log(JSON.stringify(generated, null, 2));
                    console.log('--- End AI Generated Content ---\n');

                    const finalPackage = {
                        ...pkg,
                        ...generated,
                        Slug: generated.Slug || slugify(pkg.Destination_Name),
                        Booking_URL: `https://travelzada.com/packages/${generated.Slug || slugify(pkg.Destination_Name)}`,
                        Last_Updated: new Date().toISOString().split('T')[0],
                        Created_By: 'AI Generator',
                    };

                    console.log('\n--- Final Package Data ---');
                    console.log(JSON.stringify(finalPackage, null, 2));
                    console.log('--- End Final Package Data ---\n');

                    return finalPackage;
                } catch (error) {
                    console.error(`Error generating package ${pkg.Destination_ID}:`, error);
                    // Add package with error flag
                    return {
                        ...pkg,
                        _error: error instanceof Error ? error.message : 'Generation failed',
                    };
                }
            })
        ) as any;

        return NextResponse.json({
            success: true,
            packages: generatedPackages,
            generated: generatedPackages.filter((p: any) => !p._error).length,
            errors: generatedPackages.filter((p: any) => p._error).length,
        });
    } catch (error) {
        console.error('Error in generate-packages API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

async function generatePackageData(pkg: PackageInput): Promise<GeneratedPackageData> {
    const destinationName = pkg.Destination_Name || 'Unknown Destination';

    // ------------------------------------------------------------------
    // 1. ROBUST DURATION LOGIC (Prioritize User Input)
    // ------------------------------------------------------------------
    let durationString = '';
    let nightsCount = 0;
    let daysCount = 0;

    // Case A: Explicit Duration string provided (e.g. "5 Nights / 6 Days")
    if (pkg.Duration && pkg.Duration.length > 3) {
        durationString = pkg.Duration;
        // Try to parse numbers for validation/fallback
        const nMatch = pkg.Duration.match(/(\d+)\s*N/i);
        const dMatch = pkg.Duration.match(/(\d+)\s*D/i);
        if (nMatch) nightsCount = parseInt(nMatch[1]);
        if (dMatch) daysCount = parseInt(dMatch[1]);
    }
    // Case B: Explicit Nights/Days provided
    else if (pkg.Duration_Nights || pkg.Duration_Days) {
        nightsCount = pkg.Duration_Nights || (pkg.Duration_Days ? pkg.Duration_Days - 1 : 0);
        daysCount = pkg.Duration_Days || nightsCount + 1;
        durationString = `${nightsCount} Nights / ${daysCount} Days`;
    }
    // Case C: Derive from Itinerary Length
    else if (Array.isArray(pkg.Day_Wise_Itinerary)) {
        daysCount = pkg.Day_Wise_Itinerary.length;
        nightsCount = Math.max(1, daysCount - 1);
        durationString = `${nightsCount} Nights / ${daysCount} Days`;
    }
    // Case D: Fallback
    else {
        daysCount = 6;
        nightsCount = 5;
        durationString = '5 Nights / 6 Days';
    }

    // Ensure we have reasonable defaults for prompt context
    if (nightsCount === 0) nightsCount = 5;
    if (daysCount === 0) daysCount = 6;


    // ------------------------------------------------------------------
    // 2. DATA PREPARATION FOR PROMPT
    // ------------------------------------------------------------------
    let itineraryText = '';
    if (Array.isArray(pkg.Day_Wise_Itinerary)) {
        itineraryText = pkg.Day_Wise_Itinerary.map((d) => `Day ${d.day}: ${d.description}`).join(' | ');
    } else if (typeof pkg.Day_Wise_Itinerary === 'string') {
        itineraryText = pkg.Day_Wise_Itinerary;
    }

    const inclusionsText = Array.isArray(pkg.Inclusions)
        ? pkg.Inclusions.join(', ')
        : (typeof pkg.Inclusions === 'string' ? pkg.Inclusions : '');

    const exclusionsText = Array.isArray(pkg.Exclusions)
        ? pkg.Exclusions.join(', ')
        : (typeof pkg.Exclusions === 'string' ? pkg.Exclusions : '');


    // ------------------------------------------------------------------
    // 3. "BEST OF BEST" PROMPT ENGINEERING
    // ------------------------------------------------------------------
    const prompt = `
You are the Lead Travel Content Strategist for **TravelZada**, a premium travel brand for couples and honeymooners.

**TARGET AUDIENCE:**
- Indian Honeymooners (primary) & Couples (secondary).
- Age: 25-40.
- Honeymoon & couples-only holiday packages
- Premium experiential travel with value-for-money positioning

You specialize in:
- Smart upselling from Economic → Premium → Luxury
- Strong SEO + AEO (Answer Engine Optimization)
- Writing content that ranks on Google, AI Overviews, and voice search

**INPUT DATA:**
- **Destination:** ${destinationName} (${pkg.Country || 'International'})
- **Duration:** ${durationString}
- **Tone:** Romantic, Premium, Reassuring
- **Price Range:** ${pkg.Price_Range_INR || 'N/A'}
- **Star Category:** ${pkg.Star_Category || 'N/A'}
- **Primary Image:** ${pkg.Primary_Image_URL || 'N/A'}
- **Full Itinerary:** ${itineraryText.substring(0, 20000) || 'Design a balanced mix of leisure and sightseeing.'}

------------------------------------------------------------------
**TASK:**
Generate a JSON object for this holiday package.
Follow these field-specific instructions STRICTLY:

1. **Overview**:
   - Write a 2-line "Hook". Why is this perfect for a honeymoon or couple?
   - Focus on romance + convenience.

2. **SEO_Title** (CRITICAL):
   - Max 60 characters
   - Clean & human-readable
   - Destination-first
   - Duration included
   - End with “| TravelZada”
   - No offer names, SKUs, or gimmicks
   - Format: [Destination] [Duration] Honeymoon Package for Couples | TravelZada

3. **SEO_Description**:
   - Max 155 characters
   - Must answer: what’s included & who it’s for
   - Brand name optional, max once
   - If used, place at the END
   - Tone: informative, reassuring, premium
   - Format: "Book your dream [Destination] [Duration] honeymoon package. Includes [key inclusions]. Best prices & 24/7 support."

4. **SEO_Keywords**:
   - 5–8 keywords only
   - High-intent only
   - NO brand stuffing
   - NO generic words like “packages, travel”

5. **Day_Wise_Itinerary**:
   - If input itinerary is missing, generate a realistic ${daysCount}-day plan.
   - Format: "Day 1: [Title] - [Brief Activity] | Day 2: ..."
   - Must match the duration.

6. **FAQ_Items**:
   FAQ GENERATION RULES (LLM, GOOGLE SGE & REDDIT STYLE):
   Generate 5–6 FAQs that sound like REAL questions asked by:
   - Google users
   - Gemini / ChatGPT users
   - Reddit travelers planning their first or honeymoon trip

   Questions must feel conversational, curious, and problem-driven — not formal FAQs.
   
   **QUESTION STYLE RULES:**
   - Questions must be written in natural spoken language
   - Allowed starters (use variety):
     "Is it worth…", "Does this include…", "Will we get…", "How crowded…", "Can we…", "What should we expect…", "Is this too rushed…", "Is this good for first-time travelers…"
   - Avoid formal phrases like: "What is included", "Is this package suitable"

   **CONTENT RULES:**
   - Every question must be derived from:
     - Destination Name
     - Day_Wise_Itinerary experiences
   - At least 3 questions must reference specific itinerary highlights
     (example: Nusa Penida, candlelight dinner, volcano tour, safari, cruise)

   **INTENT TYPES TO COVER (ALL MUST BE REPRESENTED):**
   1. VALUE & WORTH IT ("Is this Bali honeymoon itinerary actually worth it for the price?")
   2. EXPERIENCE EXPECTATION ("What kind of experiences do couples actually get on this Bali trip?")
   3. PACE & COMFORT ("Is this itinerary too hectic or relaxed for honeymoon couples?")
   4. PRIVACY & TRANSFERS ("Are transfers and tours private or shared in this Bali package?")
   5. CUSTOMIZATION & FLEXIBILITY ("Can we customize this itinerary if we want fewer activities?")
   6. SEASON / WEATHER REALITY ("When is the best time to do this Bali itinerary without heavy crowds?")

   **ANSWER RULES:**
   - 2–3 sentences only
   - Write as if answering directly on: Google AI Overview / Gemini / Reddit
   - Honest, neutral, reassuring tone
   - Mention specific itinerary elements naturally
   - No sales language, no brand promotion

   **STRICT ENFORCEMENT:**
   - FAQ_Items MUST contain exactly 5 or 6 items
   - Questions must NOT sound like website FAQs
   - Each FAQ must answer a different user intent
   - If an experience is not in the itinerary, DO NOT mention it

7. **Guest_Reviews**:
   - Return an empty array []. Do NOT generate fake reviews.

8. **Why_Book_With_Us**:
   - Generate 3 strong USP points (e.g., "24/7 On-Trip Support", "Verified Premium Hotels", "No Hidden Costs").

9. **Slug**:
   - **Slug Rules**:
   - Lowercase only
   - Hyphens only
   - No stop words (and, for, the)
   - No brand name
   - Max 6–8 words
   - Format Example: bali-6n-7d-honeymoon-package

------------------------------------------------------------------
**STRICT VALIDATION RULES:**
- **Output ONLY valid JSON.**
- **NO markdown.**
- **NO explanations.**
- **Ensure all arrays (Guest_Reviews, FAQ_Items, Why_Book_With_Us) are populated.**

**JSON STRUCTURE & ENUMS:**
{
  "Overview": "string",
  
  "Mood": "Choose ONE from: Romantic, Relaxing, Scenic, Experiential, Adventurous, Cultural",
  
  "Occasion": "Choose ONE from: Honeymoon, Minimoon, Anniversary, Proposal, Pre-Wedding Shoot, Birthday Getaway, Wedding Ritual, Family Blessing, Milestone Celebration",
  
  "Travel_Type": "Couple",
  
  "Budget_Category": "Choose ONE from: Mid, Premium, Luxury (based on price range)",
  
  "Adventure_Level": "Choose ONE from: Low, Med, High",
  
  "Stay_Type": "Choose ONE from: Resort, Hotel, Villa, Boutique Stay, Overwater Villa",
  
  "Star_Category": "Choose from: 3-Star, 4-Star, 5-Star, 5-Star Deluxe based on price",
  
  "Rating": "Generate a random rating between 4.7 and 5.0 (format: X.X/5)",
  
  "Slug": "string",
  
  "Inclusions": "string",
  "Exclusions": "string",
  "Day_Wise_Itinerary": "string",
  "Location_Breakup": "string",
  "Primary_Image_URL": "Unsplash URL string",
  
  "SEO_Title": "string",
  "SEO_Description": "string",
  "SEO_Keywords": "string",
  
  "Guest_Reviews": [],
  "FAQ_Items": [ { "question": "string", "answer": "string" } ],
  "Why_Book_With_Us": [ { "label": "string", "description": "string" } ],
  "Booking_Policies": { "booking": [], "payment": [], "cancellation": [] }
}
`;

    // ------------------------------------------------------------------
    // 4. AI CALL
    // ------------------------------------------------------------------
    const completion = await openai.chat.completions.create({
        model: model,
        response_format: { type: "json_object" },
        messages: [
            {
                role: 'system',
                content: 'You are a JSON-only API. return valid JSON. No markdown code blocks.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        max_completion_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    console.log('\n--- Raw AI Response ---');
    console.log(responseText); // Uncomment for deep debugging
    console.log('--- End Raw AI Response ---\n');

    // Clean up response - remove markdown code blocks carefully
    // Clean up response - robust JSON extraction via regex
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let cleanedResponse = jsonMatch ? jsonMatch[0] : responseText.trim();

    let generated: Partial<GeneratedPackageData>;
    try {
        generated = JSON.parse(cleanedResponse.trim());
    } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Text was:', cleanedResponse);
        generated = {};
    }

    // ------------------------------------------------------------------
    // 5. FAIL-SAFE & MERGING logic
    // ------------------------------------------------------------------

    // FAQ Fail-safe
    const finalFAQs = (generated.FAQ_Items && generated.FAQ_Items.length > 0)
        ? generated.FAQ_Items
        : (pkg.FAQ_Items && pkg.FAQ_Items.length > 0 ? pkg.FAQ_Items : []);

    // Why Book Fail-safe
    const finalWhyBook = (generated.Why_Book_With_Us && generated.Why_Book_With_Us.length > 0)
        ? generated.Why_Book_With_Us
        : (pkg.Why_Book_With_Us || []);

    // Itinerary Formatting
    let itineraryString = generated.Day_Wise_Itinerary || '';
    // If AI gave back an array, convert string
    if (Array.isArray(itineraryString)) {
        // @ts-ignore
        itineraryString = itineraryString.map(d => `Day ${d.day}: ${d.description}`).join(' | ');
    } else if (!itineraryString && Array.isArray(pkg.Day_Wise_Itinerary)) {
        // Fallback to input if AI failed to generate it
        itineraryString = pkg.Day_Wise_Itinerary
            .map((d: any) => `Day ${d.day}: ${d.description}`)
            .join(' | ');
    }

    // Fixed Policies
    const defaultPolicies = {
        booking: ["50% advance to confirm", "Balance 15 days before travel"],
        payment: ["Bank Transfer", "UPI", "Credit Card"],
        cancellation: ["Free cancellation up to 30 days", "No refund within 15 days"]
    };

    // ------------------------------------------------------------------
    // 6. FINAL OBJECT ASSEMBLY
    // ------------------------------------------------------------------
    const completePackage: GeneratedPackageData = {
        Overview: generated.Overview || `Experience the magic of ${destinationName} with this premium package.`,
        Mood: generated.Mood || 'Romantic',
        Occasion: generated.Occasion || 'Honeymoon',
        Travel_Type: 'Couple',
        Budget_Category: generated.Budget_Category || 'Premium',
        Theme: '',
        Adventure_Level: generated.Adventure_Level || 'Low',
        Stay_Type: generated.Stay_Type || 'Resort',
        Star_Category: pkg.Star_Category || generated.Star_Category || '4-Star',
        Meal_Plan: 'Breakfast',

        // Explicit Blanks
        Child_Friendly: '',
        Elderly_Friendly: '',
        Language_Preference: '',
        Seasonality: '',
        Hotel_Examples: '',
        Location_Breakup: generated.Location_Breakup || '',
        Airport_Code: generated.Airport_Code || '',
        Climate_Type: '',
        Safety_Score: '',
        Sustainability_Score: '',
        Ideal_Traveler_Persona: '',

        Transfer_Type: 'Private',
        Rating: generated.Rating || '4.8/5',

        Inclusions: generated.Inclusions || inclusionsText || 'Accommodation, Breakfast, Private Transfers, Sightseeing',
        Exclusions: generated.Exclusions || exclusionsText || 'Flights, Visa, Personal Expenses',

        Day_Wise_Itinerary: itineraryString,

        // Prioritize URL from Excel if available
        Primary_Image_URL: pkg.Primary_Image_URL || generated.Primary_Image_URL || '',

        // SEO Fields
        SEO_Title: generated.SEO_Title || `${destinationName} Honeymoon Package - ${durationString} | TravelZada`,
        SEO_Description: generated.SEO_Description || `Book your ${durationString} ${destinationName} honeymoon. Best prices & premium service.`,
        SEO_Keywords: generated.SEO_Keywords || `${destinationName} packages, honeymoon, travelzada`,

        Guest_Reviews: pkg.Guest_Reviews || [],
        Booking_Policies: (generated.Booking_Policies && generated.Booking_Policies.booking && generated.Booking_Policies.booking.length > 0)
            ? generated.Booking_Policies
            : (pkg.Booking_Policies && pkg.Booking_Policies.booking && pkg.Booking_Policies.booking.length > 0
                ? pkg.Booking_Policies as any
                : defaultPolicies),
        FAQ_Items: finalFAQs,
        Why_Book_With_Us: finalWhyBook
    };

    return completePackage;
}


function slugify(text: string): string {
    const stopWords = ['and', 'for', 'the', 'travelzada', 'package', 'tour', 'trip', 'with', 'from', 'to', 'in', 'on', 'at', 'by'];

    let slug = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .trim();

    // Remove stop words (need to split, filter, join)
    slug = slug.split(/\s+/)
        .filter(word => !stopWords.includes(word) && word.length > 0)
        .join('-');

    // Limit to max 8 words - but ensures we keep the ID if it was part of text? 
    // The prompt says "Max 6-8 words".
    const parts = slug.split('-');
    if (parts.length > 8) {
        slug = parts.slice(0, 8).join('-');
    }

    return slug;
}
