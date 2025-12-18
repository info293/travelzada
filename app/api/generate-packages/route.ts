import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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

        const generatedPackages: any[] = [];

        for (const pkg of packages) {
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
                    Slug: slugify(`${pkg.Destination_Name}-${pkg.Destination_ID}`),
                    Booking_URL: `https://travelzada.com/packages/${pkg.Destination_ID}`,
                    Last_Updated: new Date().toISOString().split('T')[0],
                    Created_By: 'AI Generator',
                };

                console.log('\n--- Final Package Data ---');
                console.log(JSON.stringify(finalPackage, null, 2));
                console.log('--- End Final Package Data ---\n');

                generatedPackages.push(finalPackage);
            } catch (error) {
                console.error(`Error generating package ${pkg.Destination_ID}:`, error);
                // Add package with error flag
                generatedPackages.push({
                    ...pkg,
                    _error: error instanceof Error ? error.message : 'Generation failed',
                });
            }
        }

        return NextResponse.json({
            success: true,
            packages: generatedPackages,
            generated: generatedPackages.filter((p) => !p._error).length,
            errors: generatedPackages.filter((p) => p._error).length,
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
    // Calculate duration from Day_Wise_Itinerary
    let daysCount = 0;
    if (Array.isArray(pkg.Day_Wise_Itinerary)) {
        daysCount = pkg.Day_Wise_Itinerary.length;
    } else if (pkg.Duration_Days) {
        daysCount = pkg.Duration_Days;
    } else {
        daysCount = 4; // default
    }
    const nightsCount = Math.max(1, daysCount - 1);
    const calculatedDuration = `${nightsCount} Nights / ${daysCount} Days`;

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

    const destinationName = pkg.Destination_Name || 'Unknown Destination';

    const prompt = `
You are a CARE HOLIDAY PACKAGE EXPERT for a PREMIUM-FOCUSED travel brand called TravelZada.

TravelZada serves:
- 30% Economic / value-conscious travelers
- 50% Premium honeymooners & couples (CORE FOCUS)
- 20% Luxury travelers

You specialize in:
- Honeymoon & couples-only holiday packages
- Premium experiential travel with value-for-money positioning
- Smart upselling from Economic → Premium → Luxury
- Strong SEO + AEO (Answer Engine Optimization)
- Writing content that ranks on Google, AI Overviews, and voice search

You think like:
- A honeymoon consultant
- A premium travel curator
- An SEO strategist
- A conversion-focused content writer

--------------------------------------------------
PACKAGE DETAILS:
- Destination ID: ${pkg.Destination_ID}
- Destination Name: ${destinationName}
- Country: ${pkg.Country || 'Unknown'}
- Duration: ${calculatedDuration}
- Price Range: ${pkg.Price_Range_INR || 'Premium'}

--------------------------------------------------
ITINERARY:
${itineraryText || 'Generate a realistic, balanced day-wise itinerary based on duration'}

INCLUSIONS:
${inclusionsText || 'Premium stays, comfortable transfers, curated couple experiences'}

EXCLUSIONS:
${exclusionsText || 'Flights, Visa, Personal expenses'}

--------------------------------------------------
OUTPUT REQUIREMENT:

Generate a SINGLE VALID JSON OBJECT with ONLY the fields listed below.
❌ No markdown
❌ No explanations
❌ No extra keys
❌ No trailing commas

--------------------------------------------------
FIELD RULES & ENUMS (FOLLOW STRICTLY):

Overview:
- 2–3 short lines only
- Maximum 50 words
- Emotion-driven but value-conscious
- Focus on comfort, romance, convenience & curated planning
- Do NOT sound ultra-luxury or budget

Mood:
Choose ONE from:
Romantic, Relaxing, Scenic, Experiential, Adventurous, Cultural

Occasion:
Choose ONE from:
Honeymoon, Minimoon, Anniversary, Proposal, Pre-Wedding Shoot, Birthday Getaway, Wedding Ritual, Family Blessing, Milestone Celebration

Budget_Category:
Choose ONE from:
Economic, Premium, Luxury

Budget_Category logic:
- Economic → budget hotels, shared tours, minimal frills
- Premium → 4* or good 5*, private transfers, curated experiences (CORE)
- Luxury → 5* deluxe, private experiences, exclusivity

Adventure_Level:
Choose ONE from:
Low, Medium, High

Stay_Type:
Choose ONE from:
Resort, Hotel, Villa, Boutique Stay, Overwater Villa

Star_Category:
Choose ONE from:
3-Star, 4-Star, 5-Star, 5-Star Deluxe

Rating:
- Random value between 4.7 and 5.0
- Format strictly as: X.X/5

--------------------------------------------------
FORMATTING RULES:

Inclusions:
- Comma-separated string
- No bullet points

Exclusions:
- Comma-separated string
- No bullet points

Day_Wise_Itinerary:
- Format exactly as:
  Day 1: ... | Day 2: ... | Day 3: ...
- Each day must mention:
  an experience + location OR stay/activity highlight

--------------------------------------------------
IMAGE RULE:

Primary_Image_URL:
- Use a REAL Unsplash image URL
- Relevant to destination & couples/honeymoon theme
- Scenic, romantic, premium-friendly
- Format example:
  https://images.unsplash.com/...

--------------------------------------------------
SEO & AEO RULES (VERY IMPORTANT):

SEO_Title:
- Maximum 60 characters
- MUST start with destination name
- MUST include duration
- Use “Honeymoon Package” or “Couples Tour”
- Avoid words like Luxury / Ultra
- End with “TravelZada”

Format:
[Destination] [Duration] Honeymoon Package for Couples | TravelZada

SEO_Description:
- Maximum 155 characters
- Conversational & answer-friendly
- Mention:
  destination, duration, honeymoon, premium stays, support
- Tone: reassuring, value-driven, romantic

Example style:
"Book a romantic 6N Bali honeymoon package with premium stays, curated experiences & 24/7 support. Perfect for couples."

SEO_Keywords:
- Comma-separated
- High-intent, India-focused searches
- Must include:
  destination honeymoon package,
  destination couples tour,
  destination honeymoon package from India,
  destination premium honeymoon package,
  duration destination itinerary,
  best destination package for couples

--------------------------------------------------
GUEST REVIEWS RULES:

Guest_Reviews:
- Exactly 2 reviews
- Indian couple names only (e.g., Rahul & Priya)
- Honeymoon / anniversary focused
- Mention 1–2 real highlights (hotel, activity, location)
- Date format: 2024-MM-DD
- Rating must be "5"

--------------------------------------------------
BOOKING POLICIES (STATIC):

Booking_Policies:
{
  "booking": ["50% advance to confirm booking", "Balance 15 days before travel"],
  "payment": ["Bank Transfer", "Credit Card", "UPI", "EMI Available"],
  "cancellation": ["Free cancellation up to 30 days before travel", "50% refund 15–30 days before travel", "No refund within 15 days"]
}

--------------------------------------------------
FAQ RULES (SEO + AEO OPTIMIZED):

FAQ_Items:
- Exactly 5 FAQs
- Questions must mirror real Google searches
- Start with: What / Is / Can / How / Which / When
- Include destination name naturally
- Cover:
  inclusions, suitability for couples, customization, payments, best time to visit
- Answers:
  2–3 sentences
  Clear, reassuring, destination-aware
  Value-focused, not salesy

--------------------------------------------------
WHY BOOK WITH US:

Why_Book_With_Us:
- Exactly 3 items
- Short, trust-driven labels
- Benefit-oriented descriptions

--------------------------------------------------
FINAL OUTPUT STRUCTURE (STRICT):

{
  "Overview": "",
  "Mood": "",
  "Occasion": "",
  "Budget_Category": "",
  "Adventure_Level": "",
  "Stay_Type": "",
  "Star_Category": "",
  "Rating": "",
  "Inclusions": "",
  "Exclusions": "",
  "Day_Wise_Itinerary": "",
  "Primary_Image_URL": "",
  "SEO_Title": "",
  "SEO_Description": "",
  "SEO_Keywords": "",
  "Guest_Reviews": [],
  "Booking_Policies": {},
  "FAQ_Items": [],
  "Why_Book_With_Us": []
}

--------------------------------------------------
FINAL STRICT RULES:
1. Output ONLY valid JSON
2. No empty values
3. No hallucinated facts beyond destination logic
4. Content must feel premium, romantic & trustworthy
5. Think like a brand building long-term SEO authority
`;

    const completion = await openai.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a premium travel content expert. Respond ONLY with valid JSON. No markdown, no commentary.',
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
    console.log(responseText);
    console.log('--- End Raw AI Response ---\n');

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
    }

    let generated: Partial<GeneratedPackageData>;
    try {
        generated = JSON.parse(cleanedResponse.trim());
    } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        generated = {};
    }

    // Convert Day_Wise_Itinerary array to string format if needed
    let itineraryString = generated.Day_Wise_Itinerary || '';
    if (Array.isArray(pkg.Day_Wise_Itinerary)) {
        itineraryString = pkg.Day_Wise_Itinerary
            .map((d: any) => `Day ${d.day}: ${d.description}`)
            .join(' | ');
    }

    // Convert Inclusions array to string if needed
    let inclusionsString = generated.Inclusions || '';
    if (Array.isArray(pkg.Inclusions)) {
        inclusionsString = pkg.Inclusions.join(', ');
    }

    // Convert Exclusions array to string if needed
    let exclusionsString = generated.Exclusions || '';
    if (Array.isArray(pkg.Exclusions)) {
        exclusionsString = pkg.Exclusions.join(', ');
    }

    // Use AI response directly where possible, falling back to safe defaults if AI fails entirely
    const completePackage: GeneratedPackageData = {
        Overview: generated.Overview || pkg.Destination_Name,
        Mood: generated.Mood || 'Romantic',
        Occasion: generated.Occasion || 'Honeymoon',
        Travel_Type: 'Couple', // Fixed requirement
        Budget_Category: generated.Budget_Category || 'Premium',
        Theme: '', // Explicitly blank as per verified rules
        Adventure_Level: generated.Adventure_Level || 'Low',
        Stay_Type: generated.Stay_Type || 'Resort',
        Star_Category: generated.Star_Category || '4-Star',
        Meal_Plan: 'Breakfast', // Fixed requirement

        // Blank fields
        Child_Friendly: '',
        Elderly_Friendly: '',
        Language_Preference: '',
        Seasonality: '',
        Hotel_Examples: '',
        Location_Breakup: '',
        Airport_Code: '',
        Climate_Type: '',
        Safety_Score: '',
        Sustainability_Score: '',
        Ideal_Traveler_Persona: '',

        // Fixed requirement
        Transfer_Type: 'Private',

        Rating: generated.Rating || '4.8/5',

        Inclusions: inclusionsString || 'Accommodation, Breakfast, Transfers',
        Exclusions: exclusionsString || 'Flights, Visa, Personal Expenses',
        Day_Wise_Itinerary: itineraryString || `Day 1: Arrival | Day 2: Explore | Day 3: Departure`,

        Primary_Image_URL: generated.Primary_Image_URL || pkg.Primary_Image_URL || '',

        SEO_Title: generated.SEO_Title || `${destinationName} Package | TravelZada`,
        SEO_Description: generated.SEO_Description || `Book your ${destinationName} trip with TravelZada.`,
        SEO_Keywords: generated.SEO_Keywords || `${destinationName} tour, honeymoon package`,

        Guest_Reviews: generated.Guest_Reviews || [],
        Booking_Policies: generated.Booking_Policies || {
            booking: [],
            payment: [],
            cancellation: []
        },
        FAQ_Items: generated.FAQ_Items || [],
        Why_Book_With_Us: generated.Why_Book_With_Us || []
    };

    return completePackage;
}


function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
}
