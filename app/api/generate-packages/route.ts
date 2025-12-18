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
        itineraryText = pkg.Day_Wise_Itinerary.map((d) => `Day ${d.day}: ${d.description}`).join('\n');
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

    const prompt = `You are an expert travel content writer for a luxury honeymoon and couples travel company called TravelZada.

PACKAGE DETAILS:
- Destination ID: ${pkg.Destination_ID}
- Destination Name: ${destinationName}
- Country: ${pkg.Country || 'Unknown'}
- Duration: ${calculatedDuration}
- Price Range: ${pkg.Price_Range_INR || 'Premium'}

ITINERARY:
${itineraryText || 'Generate based on duration'}

INCLUSIONS: ${inclusionsText || 'Standard luxury inclusions'}
EXCLUSIONS: ${exclusionsText || 'Flights, Visa, Personal Expenses'}

Generate a JSON object with ONLY the following fields. Follow the rules EXACTLY:

{
  "Overview": "Write a compelling 2-3 LINE SUMMARY only. Focus on romantic/luxury experience. No more than 50 words.",
  
  "Mood": "Choose ONE from: Romantic, Relaxing, Adventure",
  
  "Occasion": "Choose ONE from: Honeymoon, Minimoon, Anniversary, Birthday, Wedding Ritual, Blessing, Milestones",
  
  "Budget_Category": "Choose ONE from: Mid, Premium, Luxury (based on price range)",
  
  "Adventure_Level": "Choose ONE from: Low, Med, High",
  
  "Stay_Type": "Choose ONE from: Resort, Hotel, Villa",
  
  "Star_Category": "Choose from: 3-Star, 4-Star, 5-Star based on price",
  
  "Rating": "Generate a random rating between 4.7 and 5.0 (format: X.X/5)",
  
  "Inclusions": "Format existing inclusions as comma-separated string",
  
  "Exclusions": "Format existing exclusions as comma-separated string",
  
  "Day_Wise_Itinerary": "Format as: Day 1: ... | Day 2: ... | Day 3: ...",
  
  "Primary_Image_URL": "Provide a relevant high-quality Unsplash image URL for ${destinationName}",
  
  "SEO_Title": "Format: [Destination] [Duration] Package | Honeymoon & Couples Trip - TravelZada (max 60 chars)",
  
  "SEO_Description": "Format: Book your dream [Destination] [Duration] honeymoon package. Includes [key inclusions]. Best prices & 24/7 support. (max 155 chars)",
  
  "SEO_Keywords": "Format: [destination] honeymoon package, [destination] couples trip, [destination] romantic getaway, [duration] [destination] tour, best [destination] package",
  
  "Guest_Reviews": [
    {"name": "Indian couple name like 'Rahul & Priya'", "content": "Honeymoon-focused positive review about the destination", "date": "2024-XX-XX", "rating": "5"},
    {"name": "Another Indian couple name", "content": "Another romantic review mentioning specific highlights", "date": "2024-XX-XX", "rating": "5"}
  ],
  
  "Booking_Policies": {
    "booking": ["50% advance to confirm booking", "Balance 15 days before travel"],
    "payment": ["Bank Transfer", "Credit Card", "UPI", "EMI Available"],
    "cancellation": ["Free cancellation up to 30 days before travel", "50% refund 15-30 days before", "No refund within 15 days"]
  },
  
  "FAQ_Items": [
    {"question": "What is included in this ${destinationName} package?", "answer": "Detailed answer about inclusions"},
    {"question": "Is this package suitable for honeymoon couples?", "answer": "Yes, this package is specially curated for couples..."},
    {"question": "What are the payment options?", "answer": "We accept Bank Transfer, Credit Card, UPI, and offer EMI options."},
    {"question": "Can this itinerary be customized?", "answer": "Yes, our travel experts can customize the itinerary based on your preferences."},
    {"question": "What is the best time to visit ${destinationName}?", "answer": "Answer based on destination's peak season"}
  ],
  
  "Why_Book_With_Us": [
    {"label": "Honeymoon Specialists", "description": "10+ years of curating romantic getaways for couples"},
    {"label": "24/7 Support", "description": "Round-the-clock assistance during your trip"},
    {"label": "Best Price Guarantee", "description": "We match any comparable price you find"}
  ]
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown code blocks, no extra text
2. Keep Overview to 2-3 lines maximum (50 words or less)
3. Rating must be between 4.7 and 5.0
4. All reviews should be from couples with Indian names
5. FAQs should answer what customers actually want to know about THIS specific package`;

    const completion = await openai.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'system',
                content: 'You are a luxury travel content writer specializing in honeymoon and couples packages. Always respond with valid JSON only. Be concise and romantic in tone.',
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

    // Generate random rating between 4.7 and 5.0
    const randomRating = (4.7 + Math.random() * 0.3).toFixed(1);

    // Build complete package with FIXED values as per requirements
    const completePackage: GeneratedPackageData = {
        // AI Generated fields
        Overview: generated.Overview || `Experience the romance of ${destinationName} with our exclusive ${calculatedDuration} couples package.`,

        // Fixed: Mood from allowed values
        Mood: generated.Mood || 'Romantic',

        // Fixed: Occasion from allowed values
        Occasion: generated.Occasion || 'Honeymoon',

        // FIXED: Travel_Type is always Couple
        Travel_Type: 'Couple',

        // Fixed: Budget_Category from allowed values
        Budget_Category: generated.Budget_Category || 'Premium',

        // BLANK: Theme
        Theme: '',

        // Fixed: Adventure_Level from allowed values
        Adventure_Level: generated.Adventure_Level || 'Low',

        // Fixed: Stay_Type from allowed values
        Stay_Type: generated.Stay_Type || 'Resort',

        // Keep from Excel or AI
        Star_Category: generated.Star_Category || pkg.Star_Category || '4-Star',

        // FIXED: Meal_Plan is always Breakfast
        Meal_Plan: 'Breakfast',

        // BLANK fields
        Child_Friendly: '',
        Elderly_Friendly: '',
        Language_Preference: '',
        Seasonality: '',
        Hotel_Examples: '',

        // Inclusions/Exclusions from Excel or AI
        Inclusions: inclusionsString || 'Accommodation, Breakfast, Airport Transfers, Sightseeing',
        Exclusions: exclusionsString || 'Flights, Visa, Travel Insurance, Personal Expenses',

        // Itinerary
        Day_Wise_Itinerary: itineraryString || `Day 1: Arrival & Check-in | Day 2: Sightseeing | Day 3: Leisure | Day 4: Departure`,

        // Random rating 4.7+
        Rating: `${randomRating}/5`,

        // BLANK fields
        Location_Breakup: '',
        Airport_Code: '',

        // FIXED: Transfer_Type is always Private
        Transfer_Type: 'Private',

        // BLANK fields
        Climate_Type: '',
        Safety_Score: '',
        Sustainability_Score: '',
        Ideal_Traveler_Persona: '',

        // Image
        Primary_Image_URL: generated.Primary_Image_URL || pkg.Primary_Image_URL || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80`,

        // SEO fields with rules
        SEO_Title: generated.SEO_Title || `${destinationName} ${calculatedDuration} Package | Honeymoon - TravelZada`,
        SEO_Description: generated.SEO_Description || `Book your dream ${destinationName} ${calculatedDuration} honeymoon package. Includes accommodation, transfers & sightseeing. Best prices & 24/7 support.`,
        SEO_Keywords: generated.SEO_Keywords || `${destinationName.toLowerCase()} honeymoon package, ${destinationName.toLowerCase()} couples trip, ${destinationName.toLowerCase()} romantic getaway`,

        // Reviews, Policies, FAQs from AI or defaults
        Guest_Reviews: (pkg.Guest_Reviews && pkg.Guest_Reviews.length > 0) ? pkg.Guest_Reviews : (generated.Guest_Reviews || [
            { name: 'Rahul & Priya', content: 'Our honeymoon was absolutely magical! Every detail was perfectly arranged.', date: '2024-11-15', rating: '5' },
            { name: 'Amit & Sneha', content: 'Beautiful destination and excellent service. Highly recommend for couples!', date: '2024-10-20', rating: '5' }
        ]),

        Booking_Policies: (pkg.Booking_Policies && (pkg.Booking_Policies.booking?.length || pkg.Booking_Policies.payment?.length || pkg.Booking_Policies.cancellation?.length))
            ? {
                booking: pkg.Booking_Policies.booking || [],
                payment: pkg.Booking_Policies.payment || [],
                cancellation: pkg.Booking_Policies.cancellation || []
            }
            : (generated.Booking_Policies || {
                booking: ['50% advance to confirm booking', 'Balance 15 days before travel'],
                payment: ['Bank Transfer', 'Credit Card', 'UPI', 'EMI Available'],
                cancellation: ['Free cancellation up to 30 days before travel', '50% refund 15-30 days before', 'No refund within 15 days']
            }),

        FAQ_Items: (pkg.FAQ_Items && pkg.FAQ_Items.length > 0) ? pkg.FAQ_Items : (generated.FAQ_Items || [
            { question: `What is included in this ${destinationName} package?`, answer: 'This package includes accommodation, daily breakfast, airport transfers, and sightseeing as per itinerary.' },
            { question: 'Is this package suitable for honeymoon couples?', answer: 'Yes, this package is specially curated for couples celebrating honeymoon, anniversary, or romantic getaways.' },
            { question: 'What are the payment options?', answer: 'We accept Bank Transfer, Credit Card, UPI, and offer EMI options for your convenience.' },
            { question: 'Can this itinerary be customized?', answer: 'Yes, our travel experts can customize the itinerary based on your preferences and requirements.' },
            { question: `What is the best time to visit ${destinationName}?`, answer: 'Please contact our travel experts for the best time to visit based on weather and peak seasons.' }
        ]),

        Why_Book_With_Us: (pkg.Why_Book_With_Us && pkg.Why_Book_With_Us.length > 0) ? pkg.Why_Book_With_Us : (generated.Why_Book_With_Us || [
            { label: 'Honeymoon Specialists', description: '10+ years of curating romantic getaways for couples' },
            { label: '24/7 Support', description: 'Round-the-clock assistance during your trip' },
            { label: 'Best Price Guarantee', description: 'We match any comparable price you find' }
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
