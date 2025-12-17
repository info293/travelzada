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
    let itineraryText = '';
    if (Array.isArray(pkg.Day_Wise_Itinerary)) {
        itineraryText = pkg.Day_Wise_Itinerary.map((d) => `Day ${d.day}: ${d.description}`).join('\n');
    } else if (typeof pkg.Day_Wise_Itinerary === 'string') {
        itineraryText = pkg.Day_Wise_Itinerary;
    }

    const inclusionsText = Array.isArray(pkg.Inclusions)
        ? pkg.Inclusions.join(', ')
        : (typeof pkg.Inclusions === 'string' ? pkg.Inclusions : 'Standard inclusions');

    const exclusionsText = Array.isArray(pkg.Exclusions)
        ? pkg.Exclusions.join(', ')
        : (typeof pkg.Exclusions === 'string' ? pkg.Exclusions : 'Standard exclusions');

    const prompt = `You are a travel content expert. Generate complete travel package content for the following destination.

DESTINATION INFO FROM EXCEL:
- Destination ID: ${pkg.Destination_ID}
- Destination Name: ${pkg.Destination_Name}
- Country: ${pkg.Country || 'Unknown'}
- Duration: ${pkg.Duration || `${pkg.Duration_Nights || 3} Nights / ${pkg.Duration_Days || 4} Days`}
- Price Range: ${pkg.Price_Range_INR || 'Not specified'}
- Travel Type: ${pkg.Travel_Type || ''}
- Mood: ${pkg.Mood || ''}
- Occasion: ${pkg.Occasion || ''}
- Theme: ${pkg.Theme || ''}
- Stay Type: ${pkg.Stay_Type || ''}
- Star Category: ${pkg.Star_Category || ''}
- Meal Plan: ${pkg.Meal_Plan || ''}
- Child Friendly: ${pkg.Child_Friendly || ''}
- Elderly Friendly: ${pkg.Elderly_Friendly || ''}

EXISTING ITINERARY FROM EXCEL:
${itineraryText || 'No detailed itinerary provided - please generate one based on duration'}

INCLUSIONS FROM EXCEL: ${inclusionsText}
EXCLUSIONS FROM EXCEL: ${exclusionsText}

Based on the above information, generate a COMPLETE travel package JSON with AI-generated content for missing fields.
Fill in any empty fields with appropriate values based on the destination.

Return a JSON object with these exact fields:
{
  "Overview": "A compelling 2-3 sentence marketing description of this destination experience",
  "Mood": "Appropriate mood if not provided (Relax/Adventure/Romance/Culture/etc)",
  "Occasion": "Suitable occasion if not provided (Family Vacation/Honeymoon/Solo Trip/etc)",
  "Travel_Type": "Type if not provided (Family/Couple/Solo/Group/etc)",
  "Budget_Category": "Budget/Mid/Premium based on price",
  "Theme": "Theme if not provided (Beach/Mountain/Culture/Wildlife/etc)",
  "Adventure_Level": "Light/Moderate/High",
  "Stay_Type": "Hotel/Resort/Villa/Homestay if not provided",
  "Star_Category": "3-Star/4-Star/5-Star if not provided",
  "Meal_Plan": "Breakfast Only/Half Board/Full Board if not provided",
  "Child_Friendly": "Yes/No if not provided",
  "Elderly_Friendly": "Yes/No if not provided",
  "Language_Preference": "English/Hindi/Local",
  "Seasonality": "All Year/Best in Summer/Best in Winter/Monsoon/etc",
  "Hotel_Examples": "2-3 example hotel names for this destination",
  "Inclusions": "Comma-separated list of inclusions as a single string",
  "Exclusions": "Comma-separated list of exclusions as a single string",
  "Day_Wise_Itinerary": "Day 1: ... | Day 2: ... | Day 3: ... format as single string",
  "Rating": "4.5/5 or similar",
  "Location_Breakup": "e.g. 2N City + 1N Beach",
  "Airport_Code": "Nearest airport code (e.g. DEL, BOM, BLR)",
  "Transfer_Type": "Private/Shared/Self",
  "Climate_Type": "Tropical/Temperate/Cold/Desert/etc",
  "Safety_Score": "X/10",
  "Sustainability_Score": "X/10",
  "Ideal_Traveler_Persona": "One sentence describing ideal traveler",
  "Primary_Image_URL": "A relevant Unsplash image URL for this destination",
  "SEO_Title": "SEO optimized title under 60 chars",
  "SEO_Description": "SEO meta description under 160 chars",
  "SEO_Keywords": "comma-separated keywords",
  "Guest_Reviews": [
    {"name": "Realistic Indian name", "content": "Positive review text", "date": "2024-XX-XX", "rating": "5"},
    {"name": "Another name", "content": "Another review", "date": "2024-XX-XX", "rating": "4"}
  ],
  "Booking_Policies": {
    "booking": ["20% Advance to confirm", "50% 30 Days before travel", "100% 15 Days before travel"],
    "payment": ["Bank Transfer", "Credit Card", "UPI"],
    "cancellation": ["Free cancellation up to 30 days before travel", "50% refund up to 15 days", "No refund within 15 days"]
  },
  "FAQ_Items": [
    {"question": "Relevant FAQ 1?", "answer": "Answer 1"},
    {"question": "Relevant FAQ 2?", "answer": "Answer 2"},
    {"question": "Relevant FAQ 3?", "answer": "Answer 3"}
  ],
  "Why_Book_With_Us": [
    {"label": "Benefit 1", "description": "Description of benefit"},
    {"label": "Benefit 2", "description": "Description of benefit"}
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks, no extra text.`;

    const completion = await openai.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a professional travel content writer. Always respond with valid JSON only. Generate all requested fields.',
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

    // Ensure all required fields have values - use AI generated or provide defaults
    const duration = pkg.Duration || `${pkg.Duration_Nights || 3} Nights / ${pkg.Duration_Days || 4} Days`;
    const destinationName = pkg.Destination_Name || 'Unknown Destination';

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

    const completePackage: GeneratedPackageData = {
        Overview: generated.Overview || `Experience the best of ${destinationName} with our carefully curated ${duration} package. Enjoy premium accommodations, guided tours, and unforgettable memories.`,
        Mood: generated.Mood || pkg.Mood || 'Relax',
        Occasion: generated.Occasion || pkg.Occasion || 'Vacation',
        Travel_Type: generated.Travel_Type || pkg.Travel_Type || 'Couple',
        Budget_Category: generated.Budget_Category || pkg.Budget_Category || 'Mid',
        Theme: generated.Theme || pkg.Theme || 'Culture & Leisure',
        Adventure_Level: generated.Adventure_Level || 'Light',
        Stay_Type: generated.Stay_Type || pkg.Stay_Type || 'Hotel',
        Star_Category: generated.Star_Category || pkg.Star_Category || '4-Star',
        Meal_Plan: generated.Meal_Plan || pkg.Meal_Plan || 'Breakfast Only',
        Child_Friendly: generated.Child_Friendly || pkg.Child_Friendly || 'Yes',
        Elderly_Friendly: generated.Elderly_Friendly || pkg.Elderly_Friendly || 'Yes',
        Language_Preference: generated.Language_Preference || 'English',
        Seasonality: generated.Seasonality || 'All Year',
        Hotel_Examples: generated.Hotel_Examples || `${destinationName} Resort, ${destinationName} Hotel`,
        Inclusions: inclusionsString || 'Accommodation, Breakfast, Airport Transfers, Sightseeing',
        Exclusions: exclusionsString || 'Flights, Visa, Travel Insurance, Personal Expenses',
        Day_Wise_Itinerary: itineraryString || `Day 1: Arrival & Check-in | Day 2: Sightseeing Tour | Day 3: Leisure Day | Day 4: Departure`,
        Rating: generated.Rating || '4.5/5',
        Location_Breakup: generated.Location_Breakup || `${pkg.Duration_Nights || 3}N ${destinationName}`,
        Airport_Code: generated.Airport_Code || pkg.Airport_Code || 'XXX',
        Transfer_Type: generated.Transfer_Type || pkg.Transfer_Type || 'Private',
        Climate_Type: generated.Climate_Type || 'Tropical',
        Safety_Score: generated.Safety_Score || '8/10',
        Sustainability_Score: generated.Sustainability_Score || '7/10',
        Ideal_Traveler_Persona: generated.Ideal_Traveler_Persona || `Travelers looking for a memorable ${destinationName} experience`,
        Primary_Image_URL: generated.Primary_Image_URL || pkg.Primary_Image_URL || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80`,
        SEO_Title: generated.SEO_Title || `${destinationName} Package | ${duration} Getaway`,
        SEO_Description: generated.SEO_Description || `Book the best ${destinationName} package with ${duration}. Includes accommodation, transfers, and tours.`,
        SEO_Keywords: generated.SEO_Keywords || `${destinationName.toLowerCase()}, travel package, vacation, holiday`,
        Guest_Reviews: (pkg.Guest_Reviews && pkg.Guest_Reviews.length > 0) ? pkg.Guest_Reviews : (generated.Guest_Reviews || [
            { name: 'Rahul Kumar', content: 'Amazing experience! Everything was perfectly organized.', date: '2024-11-15', rating: '5' },
            { name: 'Priya Sharma', content: 'Beautiful destination and excellent service.', date: '2024-10-20', rating: '5' }
        ]),
        Booking_Policies: (pkg.Booking_Policies && (pkg.Booking_Policies.booking?.length || pkg.Booking_Policies.payment?.length || pkg.Booking_Policies.cancellation?.length))
            ? {
                booking: pkg.Booking_Policies.booking || [],
                payment: pkg.Booking_Policies.payment || [],
                cancellation: pkg.Booking_Policies.cancellation || []
            }
            : (generated.Booking_Policies || {
                booking: ['20% Advance to confirm', '50% 30 Days before travel', '100% 15 Days before travel'],
                payment: ['Bank Transfer', 'Credit Card', 'UPI'],
                cancellation: ['Free cancellation up to 30 days before travel', '50% refund up to 15 days', 'No refund within 15 days']
            }),
        FAQ_Items: (pkg.FAQ_Items && pkg.FAQ_Items.length > 0) ? pkg.FAQ_Items : (generated.FAQ_Items || [
            { question: 'Is breakfast included?', answer: 'Yes, daily breakfast is included at all hotels.' },
            { question: 'Are airport transfers included?', answer: 'Yes, private airport transfers are included in the package.' },
            { question: 'Can I customize the itinerary?', answer: 'Yes, our travel experts can customize the itinerary based on your preferences.' }
        ]),
        Why_Book_With_Us: (pkg.Why_Book_With_Us && pkg.Why_Book_With_Us.length > 0) ? pkg.Why_Book_With_Us : (generated.Why_Book_With_Us || [
            { label: '24/7 Support', description: 'We are available round the clock for any assistance.' },
            { label: 'Best Price Guarantee', description: 'We match any comparable price you find elsewhere.' }
        ])
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
