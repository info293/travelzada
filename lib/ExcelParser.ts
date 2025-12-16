import * as XLSX from 'xlsx';

export interface DestinationMasterRow {
    Destination_Code: string;
    Destination_Name: string;
    Country?: string;
    Region?: string;
}

export interface PackagesMasterRow {
    Destination_ID: string;
    Price_Range_INR: string;
    Duration?: string;
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
}

export interface DaywiseItineraryRow {
    Destination_ID: string;
    Day: number | string;
    Description: string;
}

export interface InclusionsExclusionsRow {
    Destination_ID: string;
    Inclusions?: string;
    Exclusions?: string;
}

export interface ParsedExcelData {
    destinations: DestinationMasterRow[];
    packages: PackagesMasterRow[];
    itinerary: DaywiseItineraryRow[];
    inclusionsExclusions: InclusionsExclusionsRow[];
}

/**
 * Parse an Excel file (ArrayBuffer) and extract data from expected sheets.
 * Expected sheets: Destination_Master, Packages_Master, Daywise_Itinerary, Inclusions_Exclusions
 */
export function parseExcelFile(fileBuffer: ArrayBuffer): ParsedExcelData {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    const sheetNames = workbook.SheetNames;

    // Find sheets by name (case-insensitive partial match)
    const findSheet = (searchTerms: string[]): XLSX.WorkSheet | null => {
        for (const term of searchTerms) {
            const found = sheetNames.find(
                (name) => name.toLowerCase().includes(term.toLowerCase())
            );
            if (found) {
                return workbook.Sheets[found];
            }
        }
        return null;
    };

    // Parse each sheet
    const destinationSheet = findSheet(['destination_master', 'destinations', 'destination']);
    const packagesSheet = findSheet(['packages_master', 'packages', 'package']);
    const itinerarySheet = findSheet(['daywise_itinerary', 'daywise', 'itinerary']);
    const incExcSheet = findSheet(['inclusions_exclusions', 'inclusions', 'inc_exc']);

    const destinations: DestinationMasterRow[] = destinationSheet
        ? XLSX.utils.sheet_to_json<DestinationMasterRow>(destinationSheet)
        : [];

    const packages: PackagesMasterRow[] = packagesSheet
        ? XLSX.utils.sheet_to_json<PackagesMasterRow>(packagesSheet)
        : [];

    const itinerary: DaywiseItineraryRow[] = itinerarySheet
        ? XLSX.utils.sheet_to_json<DaywiseItineraryRow>(itinerarySheet)
        : [];

    const inclusionsExclusions: InclusionsExclusionsRow[] = incExcSheet
        ? XLSX.utils.sheet_to_json<InclusionsExclusionsRow>(incExcSheet)
        : [];

    return {
        destinations,
        packages,
        itinerary,
        inclusionsExclusions,
    };
}

/**
 * Get list of sheet names from an Excel file
 */
export function getSheetNames(fileBuffer: ArrayBuffer): string[] {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    return workbook.SheetNames;
}

/**
 * Parse a specific sheet from an Excel file
 */
export function parseSheet<T>(fileBuffer: ArrayBuffer, sheetName: string): T[] {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        return [];
    }
    return XLSX.utils.sheet_to_json<T>(sheet);
}
