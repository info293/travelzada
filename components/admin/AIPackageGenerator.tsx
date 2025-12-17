'use client';

import { useState, useCallback } from 'react';
import { parseExcelFile, ParsedExcelData, PackagesMasterRow, DaywiseItineraryRow, InclusionsExclusionsRow } from '@/lib/ExcelParser';

interface GeneratedPackage {
    Destination_ID: string;
    Destination_Name: string;
    Overview?: string;
    Duration?: string;
    Duration_Nights?: number;
    Duration_Days?: number;
    Price_Range_INR?: string;
    Price_Min_INR?: number;
    Price_Max_INR?: number;
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
    Inclusions?: string | string[];
    Exclusions?: string | string[];
    Day_Wise_Itinerary?: string | Array<{ day: number; description: string }>;
    Rating?: string;
    Location_Breakup?: string;
    Airport_Code?: string;
    Transfer_Type?: string;
    Currency?: string;
    Climate_Type?: string;
    Safety_Score?: string;
    Sustainability_Score?: string;
    Ideal_Traveler_Persona?: string;
    Slug?: string;
    Primary_Image_URL?: string;
    Booking_URL?: string;
    SEO_Title?: string;
    SEO_Description?: string;
    SEO_Keywords?: string;
    Meta_Image_URL?: string;
    Guest_Reviews?: Array<{ name: string; content: string; date: string; rating?: string }>;
    Booking_Policies?: {
        booking?: string[];
        payment?: string[];
        cancellation?: string[];
    };
    FAQ_Items?: Array<{ question: string; answer: string }>;
    Why_Book_With_Us?: Array<{ label: string; description: string }>;
    _error?: string;
}

interface AIPackageGeneratorProps {
    onImportPackages: (packages: GeneratedPackage[]) => Promise<void>;
}

export default function AIPackageGenerator({ onImportPackages }: AIPackageGeneratorProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null);
    const [generatedPackages, setGeneratedPackages] = useState<GeneratedPackage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

    // New state for duplicate detection
    const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
    const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
    const [newIds, setNewIds] = useState<string[]>([]);

    // Fetch existing package IDs from Firestore
    const fetchExistingPackageIds = useCallback(async (): Promise<Set<string>> => {
        try {
            const { collection, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            if (!db) return new Set();

            const packagesRef = collection(db, 'packages');
            const snapshot = await getDocs(packagesRef);
            const ids = new Set<string>();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.Destination_ID) {
                    ids.add(String(data.Destination_ID).trim().toUpperCase());
                }
            });

            console.log(`Fetched ${ids.size} existing package IDs from database`);
            return ids;
        } catch (err) {
            console.error('Failed to fetch existing packages:', err);
            return new Set();
        }
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setGeneratedPackages([]);
        setDuplicateIds([]);
        setNewIds([]);
        setIsLoading(true);

        try {
            // Parse Excel file
            const arrayBuffer = await selectedFile.arrayBuffer();
            const parsed = parseExcelFile(arrayBuffer);
            setParsedData(parsed);

            if (parsed.packages.length === 0) {
                setError('No packages found in the Excel file. Make sure you have a "Packages" or "Packages_Master" sheet.');
                return;
            }

            // Fetch existing IDs from database
            const existingPackageIds = await fetchExistingPackageIds();
            setExistingIds(existingPackageIds);

            // Check which packages are new vs duplicates
            const duplicates: string[] = [];
            const newPackages: string[] = [];

            parsed.packages.forEach(pkg => {
                const normalizedId = String(pkg.Destination_ID || '').trim().toUpperCase();
                if (normalizedId && existingPackageIds.has(normalizedId)) {
                    duplicates.push(pkg.Destination_ID || '');
                } else if (pkg.Destination_ID) {
                    newPackages.push(pkg.Destination_ID);
                }
            });

            setDuplicateIds(duplicates);
            setNewIds(newPackages);

            console.log(`Excel contains: ${newPackages.length} new, ${duplicates.length} duplicates`);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
            setParsedData(null);
        } finally {
            setIsLoading(false);
        }
    }, [fetchExistingPackageIds]);

    const buildPackageInputs = useCallback(() => {
        if (!parsedData) return [];

        // Create index for destinations
        const destIndex: Record<string, { Destination_Name: string; Country?: string }> = {};
        for (const dest of parsedData.destinations) {
            destIndex[dest.Destination_Code?.trim() || ''] = {
                Destination_Name: dest.Destination_Name,
                Country: dest.Country,
            };
        }

        // Create index for itinerary
        const itineraryIndex: Record<string, Array<{ day: number; description: string }>> = {};
        for (const row of parsedData.itinerary) {
            const id = row.Destination_ID?.trim() || '';
            if (!itineraryIndex[id]) {
                itineraryIndex[id] = [];
            }
            itineraryIndex[id].push({
                day: typeof row.Day === 'number' ? row.Day : parseInt(row.Day) || 0,
                description: row.Description || '',
            });
        }

        // Create index for inclusions/exclusions
        const incExcIndex: Record<string, { inclusions: string[]; exclusions: string[] }> = {};
        for (const row of parsedData.inclusionsExclusions) {
            const id = row.Destination_ID?.trim() || '';
            if (!incExcIndex[id]) {
                incExcIndex[id] = { inclusions: [], exclusions: [] };
            }
            if (row.Inclusions) {
                incExcIndex[id].inclusions.push(row.Inclusions.trim());
            }
            if (row.Exclusions) {
                incExcIndex[id].exclusions.push(row.Exclusions.trim());
            }
        }

        // Create index for Guest Reviews
        const reviewsIndex: Record<string, Array<{ name: string; content: string; date: string; rating?: string }>> = {};
        for (const row of parsedData.guestReviews) {
            const id = row.Destination_ID?.trim() || '';
            if (!reviewsIndex[id]) reviewsIndex[id] = [];
            reviewsIndex[id].push({
                name: row.Name,
                content: row.Content,
                date: row.Date,
                rating: row.Rating
            });
        }

        // Create index for Booking Policies
        const policiesIndex: Record<string, { booking: string[]; payment: string[]; cancellation: string[] }> = {};
        for (const row of parsedData.bookingPolicies) {
            const id = row.Destination_ID?.trim() || '';
            if (!policiesIndex[id]) policiesIndex[id] = { booking: [], payment: [], cancellation: [] };

            const type = row.Policy_Type?.toLowerCase();
            if (type && policiesIndex[id][type as keyof typeof policiesIndex[typeof id]]) {
                policiesIndex[id][type as keyof typeof policiesIndex[typeof id]].push(row.Item);
            }
        }

        // Create index for FAQs
        const faqIndex: Record<string, Array<{ question: string; answer: string }>> = {};
        for (const row of parsedData.faqs) {
            const id = row.Destination_ID?.trim() || '';
            if (!faqIndex[id]) faqIndex[id] = [];
            faqIndex[id].push({
                question: row.Question,
                answer: row.Answer
            });
        }

        // Create index for Why Book With Us
        const whyBookIndex: Record<string, Array<{ label: string; description: string }>> = {};
        for (const row of parsedData.whyBookWithUs) {
            const id = row.Destination_ID?.trim() || '';
            if (!whyBookIndex[id]) whyBookIndex[id] = [];
            whyBookIndex[id].push({
                label: row.Label,
                description: row.Description
            });
        }

        // Build package inputs - only for NEW packages (not already in database)
        return parsedData.packages
            .filter((pkg) => {
                const normalizedId = String(pkg.Destination_ID || '').trim().toUpperCase();
                const isDuplicate = normalizedId && existingIds.has(normalizedId);
                if (isDuplicate) {
                    console.log(`Filtering out duplicate: ${pkg.Destination_ID}`);
                }
                return !isDuplicate;
            })
            .map((pkg) => {
                const pkgId = pkg.Destination_ID?.trim() || '';
                const destCode = pkgId.substring(0, 3);
                const destination = destIndex[destCode] || { Destination_Name: pkgId };
                const itinerary = (itineraryIndex[pkgId] || []).sort((a, b) => a.day - b.day);
                const incExc = incExcIndex[pkgId] || { inclusions: [], exclusions: [] };
                const reviews = reviewsIndex[pkgId] || [];
                const policies = policiesIndex[pkgId] || { booking: [], payment: [], cancellation: [] };
                const faqs = faqIndex[pkgId] || [];
                const whyBook = whyBookIndex[pkgId] || [];

                const nights = itinerary.length || parseInt(pkg.Duration?.match(/(\d+)/)?.[1] || '0') || 0;
                const days = nights + 1;

                return {
                    Destination_ID: pkgId,
                    Destination_Name: destination.Destination_Name,
                    Country: destination.Country,
                    Price_Range_INR: pkg.Price_Range_INR,
                    Duration: pkg.Duration || `${nights} Nights / ${days} Days`,
                    Duration_Nights: nights,
                    Duration_Days: days,
                    Travel_Type: pkg.Travel_Type,
                    Mood: pkg.Mood,
                    Occasion: pkg.Occasion,
                    Budget_Category: pkg.Budget_Category || deriveBudget(pkg.Price_Range_INR),
                    Theme: pkg.Theme,
                    Adventure_Level: pkg.Adventure_Level,
                    Stay_Type: pkg.Stay_Type,
                    Star_Category: pkg.Star_Category,
                    Meal_Plan: pkg.Meal_Plan,
                    Group_Size: pkg.Group_Size,
                    Child_Friendly: pkg.Child_Friendly,
                    Elderly_Friendly: pkg.Elderly_Friendly,
                    Language_Preference: pkg.Language_Preference,
                    Seasonality: pkg.Seasonality,
                    Hotel_Examples: pkg.Hotel_Examples,
                    Rating: pkg.Rating,
                    Location_Breakup: pkg.Location_Breakup,
                    Airport_Code: pkg.Airport_Code,
                    Transfer_Type: pkg.Transfer_Type,
                    Currency: pkg.Currency,
                    Climate_Type: pkg.Climate_Type,
                    Safety_Score: pkg.Safety_Score,
                    Sustainability_Score: pkg.Sustainability_Score,
                    Ideal_Traveler_Persona: pkg.Ideal_Traveler_Persona,
                    Primary_Image_URL: pkg.Primary_Image_URL,
                    Inclusions: incExc.inclusions.length > 0 ? incExc.inclusions.join(', ') : pkg.Inclusions, // Fallback to flat string if parsed
                    Exclusions: incExc.exclusions.length > 0 ? incExc.exclusions.join(', ') : pkg.Exclusions,
                    Day_Wise_Itinerary: itinerary.length > 0 ? itinerary : pkg.Day_Wise_Itinerary,

                    Guest_Reviews: reviews,
                    Booking_Policies: policies,
                    FAQ_Items: faqs,
                    Why_Book_With_Us: whyBook,
                };
            });
    }, [parsedData, existingIds]);

    const handleGenerate = useCallback(async () => {
        if (!parsedData || parsedData.packages.length === 0) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedPackages([]);

        try {
            const packageInputs = buildPackageInputs();
            setProgress({ current: 0, total: packageInputs.length });

            const response = await fetch('/api/generate-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packages: packageInputs }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate packages');
            }

            const result = await response.json();
            setGeneratedPackages(result.packages || []);
            setProgress({ current: result.generated, total: packageInputs.length });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate packages');
        } finally {
            setIsGenerating(false);
        }
    }, [parsedData, buildPackageInputs]);

    const handleImport = useCallback(async () => {
        if (generatedPackages.length === 0) return;

        setIsImporting(true);
        setError(null);

        try {
            const validPackages = generatedPackages.filter((p) => !p._error);
            await onImportPackages(validPackages);
            setGeneratedPackages([]);
            setParsedData(null);
            setFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import packages');
        } finally {
            setIsImporting(false);
        }
    }, [generatedPackages, onImportPackages]);

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            // 1. Destination Master
            const destHeaders = ['Destination_Code', 'Destination_Name', 'Country'];
            const destData = [['BAL', 'Bali', 'Indonesia']]; // Sample
            const destSheet = XLSX.utils.aoa_to_sheet([destHeaders, ...destData]);
            XLSX.utils.book_append_sheet(wb, destSheet, 'Destination_Master');

            // 2. Packages Master
            const pkgHeaders = [
                'Destination_ID', 'Destination_Name', 'Overview', 'Duration', 'Price_Range_INR',
                'Travel_Type', 'Mood', 'Occasion', 'Budget_Category', 'Theme', 'Adventure_Level',
                'Stay_Type', 'Star_Category', 'Meal_Plan', 'Group_Size', 'Child_Friendly',
                'Elderly_Friendly', 'Language_Preference', 'Seasonality', 'Hotel_Examples',
                'Rating', 'Location_Breakup', 'Airport_Code', 'Transfer_Type', 'Currency',
                'Climate_Type', 'Safety_Score', 'Sustainability_Score', 'Ideal_Traveler_Persona',
                'Primary_Image_URL', 'SEO_Title', 'SEO_Description', 'SEO_Keywords'
            ];
            const pkgData = [['BAL_001', 'Bali', 'A beautiful escape...', '5 Nights / 6 Days', '₹50,000 - ₹70,000', 'Family', 'Relax', 'Vacation', 'Mid', 'Beach', 'Light', 'Resort', '4-Star', 'Breakfast', '2A 1C', 'Yes', 'Yes', 'English', 'All Year', 'Sample Resort', '4.5/5', '3N Ubud', 'DPS', 'Private', 'INR', 'Tropical', '8/10', '7/10', 'Families', 'https://example.com/image.jpg', 'Bali Package', 'Desc', 'bali, beach']];
            const pkgSheet = XLSX.utils.aoa_to_sheet([pkgHeaders, ...pkgData]);
            XLSX.utils.book_append_sheet(wb, pkgSheet, 'Packages_Master');

            // 3. Daywise Itinerary
            const itinHeaders = ['Destination_ID', 'Day', 'Description'];
            const itinData = [['BAL_001', 1, 'Arrival in Bali']];
            const itinSheet = XLSX.utils.aoa_to_sheet([itinHeaders, ...itinData]);
            XLSX.utils.book_append_sheet(wb, itinSheet, 'Daywise_Itinerary');

            // 4. Inclusions Exclusions
            const incExcHeaders = ['Destination_ID', 'Inclusions', 'Exclusions'];
            const incExcData = [['BAL_001', 'Breakfast, Airport Transfers', 'Flights, Personal Expenses']];
            const incExcSheet = XLSX.utils.aoa_to_sheet([incExcHeaders, ...incExcData]);
            XLSX.utils.book_append_sheet(wb, incExcSheet, 'Inclusions_Exclusions');

            // 5. Guest Reviews
            const reviewHeaders = ['Destination_ID', 'Name', 'Content', 'Date', 'Rating'];
            const reviewData = [['BAL_001', 'John Doe', 'Amazing trip!', '2024-01-01', '5']];
            const reviewSheet = XLSX.utils.aoa_to_sheet([reviewHeaders, ...reviewData]);
            XLSX.utils.book_append_sheet(wb, reviewSheet, 'Guest_Reviews');

            // 6. Booking Policies
            const policyHeaders = ['Destination_ID', 'Policy_Type', 'Item'];
            const policyData = [
                ['BAL_001', 'booking', '50% advance'],
                ['BAL_001', 'cancellation', 'No refund within 15 days']
            ];
            const policySheet = XLSX.utils.aoa_to_sheet([policyHeaders, ...policyData]);
            XLSX.utils.book_append_sheet(wb, policySheet, 'Booking_Policies');

            // 7. FAQs
            const faqHeaders = ['Destination_ID', 'Question', 'Answer'];
            const faqData = [['BAL_001', 'Is breakfast included?', 'Yes']];
            const faqSheet = XLSX.utils.aoa_to_sheet([faqHeaders, ...faqData]);
            XLSX.utils.book_append_sheet(wb, faqSheet, 'FAQ_Items');

            // 8. Why Book With Us
            const whyHeaders = ['Destination_ID', 'Label', 'Description'];
            const whyData = [['BAL_001', '24/7 Support', 'We are always here']];
            const whySheet = XLSX.utils.aoa_to_sheet([whyHeaders, ...whyData]);
            XLSX.utils.book_append_sheet(wb, whySheet, 'Why_Book_With_Us');

            XLSX.writeFile(wb, 'Travelzada_Package_Template.xlsx');
        } catch (e) {
            console.error("Failed to generate template", e);
            alert("Could not generate template");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">AI Package Generator</h2>
                        <p className="text-gray-500">Upload an Excel file and let AI generate complete package details</p>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Sample Template
                    </button>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        id="excel-upload"
                        disabled={isLoading || isGenerating}
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-lg font-semibold text-gray-700 mb-1">
                            {file ? file.name : 'Click to upload Excel file'}
                        </p>
                        <p className="text-sm text-gray-500">
                            Supports .xlsx and .xls files
                        </p>
                    </label>
                </div>

                {isLoading && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        Parsing Excel file...
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                        <p className="font-semibold">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* Parsed Data Preview */}
            {parsedData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Parsed Data Preview</h3>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{parsedData.packages.length}</div>
                            <div className="text-sm text-blue-700">Total in Excel</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-200">
                            <div className="text-2xl font-bold text-green-600">{newIds.length}</div>
                            <div className="text-sm text-green-700">✅ New Packages</div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4 text-center border-2 border-yellow-200">
                            <div className="text-2xl font-bold text-yellow-600">{duplicateIds.length}</div>
                            <div className="text-sm text-yellow-700">⏭️ Already Exist</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{parsedData.itinerary.length}</div>
                            <div className="text-sm text-purple-700">Itinerary Days</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">{parsedData.inclusionsExclusions.length}</div>
                            <div className="text-sm text-orange-700">Inc/Exc Items</div>
                        </div>
                    </div>

                    {/* Show warning if there are duplicates */}
                    {duplicateIds.length > 0 && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="font-semibold text-yellow-800">⏭️ {duplicateIds.length} packages will be skipped (already in database):</p>
                            <p className="text-sm text-yellow-700 mt-1">{duplicateIds.join(', ')}</p>
                        </div>
                    )}

                    {/* Show info if no new packages */}
                    {newIds.length === 0 && parsedData.packages.length > 0 && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="font-semibold text-blue-800">ℹ️ All packages already exist in database</p>
                            <p className="text-sm text-blue-700 mt-1">No new packages to generate. Add new packages to your Excel file.</p>
                        </div>
                    )}

                    {parsedData.packages.length > 0 && (
                        <div className="overflow-x-auto max-h-64 border border-gray-200 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {parsedData.packages.slice(0, 10).map((pkg, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium text-gray-900">{pkg.Destination_ID}</td>
                                            <td className="px-4 py-2 text-gray-600">{pkg.Price_Range_INR || '-'}</td>
                                            <td className="px-4 py-2 text-gray-600">{pkg.Duration || '-'}</td>
                                            <td className="px-4 py-2 text-gray-600">{pkg.Travel_Type || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.packages.length > 10 && (
                                <div className="text-center py-2 text-sm text-gray-500 bg-gray-50">
                                    ... and {parsedData.packages.length - 10} more packages
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex gap-4">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || newIds.length === 0}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Generating with AI...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Generate {newIds.length} New Packages with AI
                                </>
                            )}
                        </button>
                    </div>

                    {progress && isGenerating && (
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Processing packages...</span>
                                <span>{progress.current} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Generated Packages */}
            {generatedPackages.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Generated Packages</h3>
                        <div className="flex gap-2">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                {generatedPackages.filter((p) => !p._error).length} Success
                            </span>
                            {generatedPackages.filter((p) => p._error).length > 0 && (
                                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    {generatedPackages.filter((p) => p._error).length} Errors
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Overview</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SEO Title</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {generatedPackages.map((pkg, idx) => (
                                    <tr key={idx} className={`hover:bg-gray-50 ${pkg._error ? 'bg-red-50' : ''}`}>
                                        <td className="px-4 py-2">
                                            {pkg._error ? (
                                                <span className="text-red-600">❌</span>
                                            ) : (
                                                <span className="text-green-600">✅</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 font-medium text-gray-900">{pkg.Destination_Name}</td>
                                        <td className="px-4 py-2 text-gray-600 max-w-md truncate">
                                            {pkg._error || pkg.Overview || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 truncate">{pkg.SEO_Title || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || generatedPackages.filter((p) => !p._error).length === 0}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isImporting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Import to Database ({generatedPackages.filter((p) => !p._error).length} packages)
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setGeneratedPackages([]);
                                setParsedData(null);
                                setFile(null);
                            }}
                            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-3">📋 Excel File Format</h3>
                <p className="text-sm text-blue-800 mb-4">
                    Your Excel file should have one or more of the following sheets:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-4">
                        <div className="font-semibold text-blue-900 mb-2">Destination_Master / Destinations</div>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li><code>Destination_Code</code> - Unique code (e.g., BAL)</li>
                            <li><code>Destination_Name</code> - Display name</li>
                            <li><code>Country</code> - Optional country</li>
                        </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="font-semibold text-blue-900 mb-2">Packages_Master / Packages</div>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li><code>Destination_ID</code> - Full package ID</li>
                            <li><code>Price_Range_INR</code> - Price info</li>
                            <li><code>Duration</code>, <code>Travel_Type</code>, etc.</li>
                        </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="font-semibold text-blue-900 mb-2">Daywise_Itinerary / Itinerary</div>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li><code>Destination_ID</code> - Package ID</li>
                            <li><code>Day</code> - Day number (1, 2, 3...)</li>
                            <li><code>Description</code> - Day description</li>
                        </ul>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                        <div className="font-semibold text-blue-900 mb-2">Inclusions_Exclusions</div>
                        <ul className="text-blue-700 space-y-1 list-disc list-inside">
                            <li><code>Destination_ID</code> - Package ID</li>
                            <li><code>Inclusions</code> - What's included</li>
                            <li><code>Exclusions</code> - What's not included</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function deriveBudget(priceStr?: string | number): string {
    if (priceStr === undefined || priceStr === null || priceStr === '') return 'Mid';

    // Convert to string if it's a number
    const priceString = String(priceStr);
    const match = priceString.match(/\d+/);
    if (!match) return 'Mid';

    const price = parseInt(match[0]);
    if (price < 60000) return 'Budget';
    if (price < 120000) return 'Mid';
    return 'Premium';
}
