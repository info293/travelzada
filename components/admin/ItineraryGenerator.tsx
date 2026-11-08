'use client';

/**
 * Quote / itinerary builder used by sales: Customer → Package → Customise → Preview & Download.
 * The PDF is designed as HTML pages (components/admin/proposal) and captured into a PDF in the browser.
 * Also embedded in the lead CRM (LeadCrmDetail) — keep ItineraryPrefill / GeneratedItinerarySummary compatible.
 */
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { collection, getDocs, addDoc, query, orderBy, doc, getDoc } from 'firebase/firestore';
import {
    ArrowDown, ArrowUp, BedDouble, CalendarDays, Check, ChevronLeft, ChevronRight, Download, Eye, FileText,
    Image as ImageIcon, Loader2, MapPin, MessageCircle, Minus, Package as PackageIcon, Plane, Plus, RotateCcw,
    Search, Share2, SlidersHorizontal, Sparkles, Trash2, UserRound, Wallet, X,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { DestinationPackage } from './types';
import { Badge, Button, Card, Field, cx, formatINR, inputClass, waLink } from './ui';
import ProposalDocument from './proposal/ProposalDocument';
import { buildProposalData, cleanImageUrl, makeQuoteRef, parseList } from './proposal/buildProposalData';
import { PAGE_H, PAGE_W, formatLongDate, nightsBetween, type ProposalData } from './proposal/types';

interface Package extends DestinationPackage {
    id?: string;
    Image_Alt_Text?: string;
    Highlights?: string[];
    Day_Wise_Itinerary_Details?: Array<{ day: number; title: string; description: string; activities?: string[] }>;
}

interface FlightDetail {
    date: string;
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureCity: string;
    arrivalCity: string;
}

interface HotelDetail {
    city: string;
    hotelName: string;
    checkIn: string;
    checkOut: string;
    roomType: string;
    mealPlan: string;
}

interface DayPlan {
    day: string;
    title: string;
    description: string;
    /** Comma separated activity chips, as typed */
    activitiesText?: string;
}

interface ItineraryData {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    travelDate: string;
    adults: number;
    children: number;
    packageId: string;
    flights: FlightDetail[];
    hotels: HotelDetail[];
    totalCost: number;
    advancePaid: number;
    notes: string;
    customItinerary?: DayPlan[]; // the day-wise plan, editable
    tripType: string;
    priceNote: string;
    designerName: string;
    validDays: number;
}

/** Optional values to pre-fill the builder with (e.g. from a Meta lead or an AI-drafted proposal). Applied on mount. */
export interface ItineraryPrefill {
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    travelDate?: string;
    adults?: number;
    children?: number;
    destinationName?: string; // matched against destination names to pre-select
    packageDocId?: string; // Firestore id of the package to pre-select
    totalCost?: number;
    notes?: string;
    customItinerary?: { day: string; title: string; description: string }[];
    hotels?: HotelDetail[];
    /** Values that replace the catalog package's fields on the PDF (e.g. an AI-revised inclusions list).
     *  Used on its own as a custom package when there is no packageDocId. */
    packageOverrides?: Partial<Package>;
    /** Skip customer + package steps and open "Customise" once the package is applied */
    autoAdvance?: boolean;
}

export interface GeneratedItinerarySummary {
    packageName: string;
    destinationName: string;
    travelDate: string;
    adults: number;
    children: number;
    totalCost: number;
    advancePaid: number;
    notes: string;
    days: number;
    fileName: string;
}

interface ItineraryGeneratorProps {
    prefill?: ItineraryPrefill;
    /** Called after the PDF is generated, e.g. to log it as a CRM proposal */
    onGenerated?: (summary: GeneratedItinerarySummary) => void;
}

const STEPS = [
    { n: 1, label: 'Customer', icon: UserRound },
    { n: 2, label: 'Package', icon: PackageIcon },
    { n: 3, label: 'Customise', icon: SlidersHorizontal },
    { n: 4, label: 'Preview & send', icon: Eye },
] as const;

const TRIP_TYPES = ['Honeymoon', 'Anniversary', 'Babymoon', 'Proposal trip', 'Couple getaway', 'Family holiday', 'Friends trip'];

const priceFromPackage = (pkg: Package) => parseInt(String(pkg.Price_Min_INR || pkg.Price_Range_INR || '0').replace(/[^0-9]/g, '')) || 0;

const safeName = (s: string) => s.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

/** Parse the catalog's day-wise plan into editable days (prefers the structured AI details) */
function parseDays(pkg: Package): DayPlan[] {
    if (pkg.Day_Wise_Itinerary_Details?.length) {
        return pkg.Day_Wise_Itinerary_Details.map((d, i) => ({
            day: `Day ${d.day || i + 1}`,
            title: d.title || `Day ${i + 1}`,
            description: d.description || '',
            activitiesText: (d.activities || []).join(', '),
        }));
    }
    if (!pkg.Day_Wise_Itinerary) return [];
    return String(pkg.Day_Wise_Itinerary).split('|').map((s) => s.trim()).filter(Boolean).map((item, index) => {
        const dayMatch = item.match(/^Day\s*(\d+)\s*[:\-–]\s*(.+)$/i);
        if (dayMatch) {
            const rest = dayMatch[2].trim();
            // "Title - long description" → split once
            const split = rest.match(/^(.{6,80}?)\s+[-–]\s+(.+)$/);
            return split
                ? { day: `Day ${dayMatch[1]}`, title: split[1].trim(), description: split[2].trim() }
                : { day: `Day ${dayMatch[1]}`, title: rest, description: '' };
        }
        const parts = item.split(':');
        return {
            day: `Day ${index + 1}`,
            title: (parts.length > 1 ? parts[0].trim() : `Day ${index + 1}`).replace(/^Day\s*\d+\s*/i, '') || `Day ${index + 1}`,
            description: parts.length > 1 ? parts.slice(1).join(':').trim() : item,
        };
    });
}

/** Normalise list fields so the textareas edit one item per line */
function normalisePackage(pkg: Package): Package {
    return {
        ...pkg,
        Inclusions: parseList(pkg.Inclusions).join('\n'),
        Exclusions: parseList(pkg.Exclusions).join('\n'),
    };
}

export default function ItineraryGenerator({ prefill, onGenerated }: ItineraryGeneratorProps = {}) {
    const { currentUser } = useAuth();
    const [step, setStep] = useState(1);
    const [destinations, setDestinations] = useState<any[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedDestination, setSelectedDestination] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [loading, setLoading] = useState(false);
    const [pkgSearch, setPkgSearch] = useState('');
    const prefillApplied = useRef({ destination: false, package: false });
    const [quoteRef, setQuoteRef] = useState(() => makeQuoteRef());
    const [quoteDate] = useState(() => new Date());

    // Generation state
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState('');
    const [genError, setGenError] = useState('');
    const [result, setResult] = useState<{ blob: Blob; fileName: string; pages: number } | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [zoomPage, setZoomPage] = useState<number | null>(null);

    // Form Data
    const [formData, setFormData] = useState<ItineraryData>({
        clientName: prefill?.clientName || '',
        clientEmail: prefill?.clientEmail || '',
        clientPhone: prefill?.clientPhone || '',
        travelDate: prefill?.travelDate || '',
        adults: prefill?.adults ?? 2,
        children: prefill?.children ?? 0,
        packageId: '',
        flights: [],
        hotels: [],
        totalCost: prefill?.totalCost || 0,
        advancePaid: 0,
        notes: prefill?.notes || '',
        tripType: '',
        priceNote: '',
        designerName: '',
        validDays: 7,
    });
    const set = <K extends keyof ItineraryData>(key: K, value: ItineraryData[K]) => setFormData((prev) => ({ ...prev, [key]: value }));

    // Travel designer defaults to the signed-in sales person
    useEffect(() => {
        const name = (currentUser as any)?.displayName || '';
        if (name) setFormData((prev) => (prev.designerName ? prev : { ...prev, designerName: name }));
    }, [currentUser]);

    // Prefill: pick the destination once destinations are loaded
    useEffect(() => {
        if (prefillApplied.current.destination || !destinations.length) return;
        const wanted = (prefill?.destinationName || '').toLowerCase().trim();
        if (!wanted) return;
        prefillApplied.current.destination = true;
        const match = destinations.find((d) => {
            const name = String(d.name || d.Destination_Name || '').toLowerCase().trim();
            return name && (name === wanted || wanted.includes(name) || name.includes(wanted));
        });
        if (match) setSelectedDestination(match.id);
    }, [destinations, prefill?.destinationName]);

    // Prefill: select the package (loaded directly by id, so it works even if it isn't linked to the destination),
    // apply overrides on top, or build a custom package from the overrides alone; then apply price/itinerary/hotels
    useEffect(() => {
        if (prefillApplied.current.package || !prefill || !destinations.length) return;
        if (!prefill.packageDocId && !prefill.packageOverrides) return;
        prefillApplied.current.package = true;

        (async () => {
            let pkg: Package | null = packages.find((p) => p.id === prefill.packageDocId) || null;
            if (!pkg && prefill.packageDocId) {
                try {
                    const snap = await getDoc(doc(db, 'packages', prefill.packageDocId));
                    if (snap.exists()) pkg = { id: snap.id, ...snap.data() } as Package;
                } catch (error) {
                    console.error('Error loading prefilled package', error);
                }
            }
            const overrides = prefill.packageOverrides || {};
            const finalPkg: Package = pkg
                ? { ...pkg, ...overrides }
                : ({
                    id: 'custom',
                    Destination_ID: String(overrides.Destination_Name || 'custom-trip').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    Destination_Name: 'Custom Trip',
                    Overview: '',
                    Duration: '',
                    Inclusions: '',
                    Exclusions: '',
                    Day_Wise_Itinerary: '',
                    ...overrides,
                } as Package);

            setPackages((prev) => (prev.some((p) => p.id === finalPkg.id) ? prev.map((p) => (p.id === finalPkg.id ? finalPkg : p)) : [finalPkg, ...prev]));
            handlePackageSelect(finalPkg);
            setFormData((prev) => ({
                ...prev,
                ...(prefill.totalCost ? { totalCost: prefill.totalCost } : {}),
                ...(prefill.customItinerary?.length ? { customItinerary: prefill.customItinerary } : {}),
                ...(prefill.hotels?.length ? { hotels: prefill.hotels } : {}),
            }));
            if (prefill.autoAdvance) setStep(3);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destinations]);

    useEffect(() => {
        fetchDestinations();
    }, []);

    useEffect(() => {
        if (selectedDestination) {
            fetchPackages(selectedDestination);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDestination]);

    const fetchDestinations = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'destinations'));
            const dests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            dests.sort((a, b) => String(a.name || a.Destination_Name || '').localeCompare(String(b.name || b.Destination_Name || '')));
            setDestinations(dests);
        } catch (error) {
            console.error("Error fetching destinations", error);
        }
    };

    const fetchPackages = async (destId: string) => {
        setLoading(true);
        try {
            const q = query(collection(db, 'packages'), orderBy('Last_Updated', 'desc'));
            const snapshot = await getDocs(q);
            const pkgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package));

            let filtered = pkgs;
            if (destId) {
                const normSelectedId = destId.toLowerCase().trim();
                const destObj = destinations.find(d => d.id === destId);
                const destNameRaw = destObj ? (destObj.name || destObj.Destination_Name || '') : '';
                const destName = destNameRaw.toLowerCase().trim();

                // Prefer the destination's linked packageIds (same as travelzada.com), else match by id / name
                const linkedPackageIds: string[] = destObj?.packageIds || [];
                if (Array.isArray(linkedPackageIds) && linkedPackageIds.length > 0) {
                    filtered = pkgs.filter(p => linkedPackageIds.includes(p.Destination_ID || ''));
                } else {
                    const destTokens = destName.split(/\s*(?:&|\/|and)\s*/).map((t: string) => t.trim()).filter((t: string) => t.length > 2);
                    filtered = pkgs.filter(p => {
                        const pName = (p.Destination_Name || '').toLowerCase().trim();
                        const pId = (p.Destination_ID || '').toLowerCase().trim();
                        if (pId === normSelectedId) return true;
                        if (destName && (pName.includes(destName) || destName.includes(pName))) return true;
                        if (destTokens.some((token: string) => pName.includes(token))) return true;
                        return pName.includes(normSelectedId);
                    });
                }
            }
            setPackages((prev) => {
                // keep a prefilled / custom package in the list
                const extra = prev.filter((p) => p.id === 'custom' || (selectedPackage && p.id === selectedPackage.id && !filtered.some((f) => f.id === p.id)));
                return [...extra, ...filtered];
            });
        } catch (error) {
            console.error("Error fetching packages", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePackageSelect = (raw: Package) => {
        const pkg = normalisePackage(raw);
        setSelectedPackage(pkg);
        const priceNum = priceFromPackage(pkg);
        setFormData(prev => ({
            ...prev,
            packageId: pkg.Destination_ID,
            totalCost: priceNum * Math.max(1, prev.adults || 1),
            customItinerary: parseDays(pkg),
            tripType: prev.tripType || String(pkg.Occasion || pkg.Travel_Type || '').split(/[,/|]/)[0].trim(),
        }));
    };

    const startCustomTrip = () => {
        const destObj = destinations.find((d) => d.id === selectedDestination);
        const destName = destObj?.name || destObj?.Destination_Name || prefill?.destinationName || '';
        const pkg = {
            id: 'custom',
            Destination_ID: `custom-${(destName || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            Destination_Name: destName ? `${destName} Romantic Getaway` : 'Your Custom Trip',
            Overview: '',
            Duration: '',
            Inclusions: '',
            Exclusions: '',
            Day_Wise_Itinerary: '',
            Primary_Image_URL: destObj?.image || '',
        } as Package;
        setPackages((prev) => [pkg, ...prev.filter((p) => p.id !== 'custom')]);
        setSelectedPackage(pkg);
        setFormData((prev) => ({ ...prev, packageId: pkg.Destination_ID, customItinerary: [], totalCost: 0 }));
    };

    const updatePkg = (field: keyof Package, value: any) => setSelectedPackage((prev) => (prev ? ({ ...prev, [field]: value } as Package) : prev));

    // Flights
    const addFlight = () => set('flights', [...formData.flights, { date: '', airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureCity: '', arrivalCity: '' }]);
    const updateFlight = (index: number, field: keyof FlightDetail, value: string) => set('flights', formData.flights.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
    const removeFlight = (index: number) => set('flights', formData.flights.filter((_, i) => i !== index));

    // Hotels
    const addHotel = () => {
        const last = formData.hotels[formData.hotels.length - 1];
        set('hotels', [...formData.hotels, { city: '', hotelName: '', checkIn: last?.checkOut || formData.travelDate || '', checkOut: '', roomType: '', mealPlan: last?.mealPlan || '' }]);
    };
    const updateHotel = (index: number, field: keyof HotelDetail, value: string) => set('hotels', formData.hotels.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
    const removeHotel = (index: number) => set('hotels', formData.hotels.filter((_, i) => i !== index));

    // Day-wise plan
    const days = formData.customItinerary || [];
    const renumber = (list: DayPlan[]) => list.map((item, idx) => ({ ...item, day: `Day ${idx + 1}` }));
    const updateItineraryDay = (index: number, field: keyof DayPlan, value: string) => set('customItinerary', days.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
    const addItineraryDay = () => set('customItinerary', [...days, { day: `Day ${days.length + 1}`, title: '', description: '' }]);
    const removeItineraryDay = (index: number) => set('customItinerary', renumber(days.filter((_, i) => i !== index)));
    const moveDay = (index: number, dir: -1 | 1) => {
        const j = index + dir;
        if (j < 0 || j >= days.length) return;
        const next = [...days];
        [next[index], next[j]] = [next[j], next[index]];
        set('customItinerary', renumber(next));
    };

    const destObj = destinations.find((d) => d.id === selectedDestination);
    const destinationName: string = destObj?.name || destObj?.Destination_Name || prefill?.destinationName || '';
    const pax = Math.max(1, (formData.adults || 0) + (formData.children || 0));
    const catalogPrice = selectedPackage ? priceFromPackage(selectedPackage) : 0;

    // Everything the PDF shows, rebuilt whenever the form changes
    const proposalData: ProposalData | null = useMemo(() => {
        if (!selectedPackage) return null;
        return buildProposalData({
            pkg: selectedPackage,
            client: { name: formData.clientName, phone: formData.clientPhone, email: formData.clientEmail },
            travelDate: formData.travelDate,
            adults: formData.adults || 0,
            children: formData.children || 0,
            tripType: formData.tripType,
            totalCost: formData.totalCost,
            advancePaid: formData.advancePaid,
            priceNote: formData.priceNote,
            days: (formData.customItinerary || []).map((d) => ({
                day: d.day,
                title: d.title,
                description: d.description,
                activities: String(d.activitiesText || '').split(',').map((s) => s.trim()).filter(Boolean),
            })),
            hotels: formData.hotels,
            flights: formData.flights,
            notes: formData.notes,
            destinationName,
            destinationSlug: destObj?.slug,
            designerName: formData.designerName,
            quoteRef,
            quoteDate,
            validDays: formData.validDays,
        });
    }, [selectedPackage, formData, destinationName, destObj?.slug, quoteRef, quoteDate]);

    // Any edit makes the last PDF stale
    useEffect(() => { setResult(null); }, [proposalData]);

    const fileName = useMemo(() => {
        const datePart = formData.travelDate || quoteDate.toISOString().slice(0, 10);
        const dest = safeName(destinationName || selectedPackage?.Destination_Name || 'Trip');
        return `Travelzada_${safeName(formData.clientName) || 'Guest'}_${dest}_${datePart}.pdf`;
    }, [formData.clientName, formData.travelDate, destinationName, selectedPackage?.Destination_Name, quoteDate]);

    const downloadBlob = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };

    const generatePDF = async () => {
        if (!selectedPackage || !proposalData) return;
        setGenerating(true);
        setGenError('');
        setProgress('Starting…');

        try {
            const { renderProposalPdf } = await import('./proposal/renderProposalPdf');
            const blob = await renderProposalPdf(proposalData, { onProgress: (m) => setProgress(m) });
            downloadBlob(blob, fileName);
            setResult({ blob, fileName, pages: pageCount });

            // Log to CRM (customer_itineraries)
            try {
                const now = new Date().toISOString();
                const customerRecord = {
                    clientName: formData.clientName,
                    clientEmail: formData.clientEmail,
                    clientPhone: formData.clientPhone,
                    packageId: selectedPackage.Destination_ID,
                    packageName: selectedPackage.Destination_Name,
                    destinationName: destinationName || selectedPackage.Destination_Name,
                    travelDate: formData.travelDate,
                    adults: formData.adults,
                    children: formData.children,
                    totalCost: formData.totalCost,
                    advancePaid: formData.advancePaid,
                    balanceDue: formData.totalCost - formData.advancePaid,
                    flights: formData.flights,
                    hotels: formData.hotels,
                    customItinerary: (formData.customItinerary || []).map((d) => ({ day: d.day, title: d.title, description: d.description, activities: d.activitiesText || '' })),
                    notes: formData.notes,
                    tripType: formData.tripType,
                    quoteRef,
                    validUntil: proposalData.validUntil,
                    fileName,
                    status: 'draft',
                    history: [{
                        action: 'Itinerary generated',
                        timestamp: now,
                        details: `PDF ${quoteRef} created for ${formData.clientName}`
                    }],
                    createdAt: now,
                    updatedAt: now,
                    createdBy: (currentUser as any)?.email || 'admin'
                };
                await addDoc(collection(db, 'customer_itineraries'), JSON.parse(JSON.stringify(customerRecord)));
            } catch (saveError) {
                console.error('Failed to save customer record:', saveError);
            }

            onGenerated?.({
                packageName: selectedPackage.Destination_Name,
                destinationName: destinations.find((d) => d.id === selectedDestination)?.name || selectedPackage.Destination_Name,
                travelDate: formData.travelDate,
                adults: formData.adults,
                children: formData.children,
                totalCost: formData.totalCost,
                advancePaid: formData.advancePaid,
                notes: formData.notes,
                days: formData.customItinerary?.length || 0,
                fileName,
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            setGenError(error instanceof Error ? error.message : 'Something went wrong while creating the PDF.');
        } finally {
            setGenerating(false);
            setProgress('');
        }
    };

    const firstName = formData.clientName.trim().split(/\s+/)[0] || '';
    const waMessage = proposalData
        ? `Hi ${firstName || 'there'}! Here's your personalised ${destinationName || proposalData.trip.title} itinerary from Travelzada (Quote ${quoteRef}).\n\n` +
          `${proposalData.trip.title}${proposalData.trip.durationLabel ? ` · ${proposalData.trip.durationLabel}` : ''}\n` +
          (formData.totalCost > 0 ? `Total: ${formatINR(formData.totalCost)} for ${formData.adults} adult${formData.adults === 1 ? '' : 's'}${formData.children ? ` + ${formData.children} child${formData.children === 1 ? '' : 'ren'}` : ''}\n` : '') +
          `Valid till ${formatLongDate(proposalData.validUntil)}.\n\nI've attached the PDF — have a look and tell me if you'd like any changes!`
        : '';
    const clientWa = waLink(formData.clientPhone, waMessage);

    const canShareFile = typeof navigator !== 'undefined' && !!(navigator as any).canShare && !!result &&
        (() => { try { return (navigator as any).canShare({ files: [new File([result.blob], result.fileName, { type: 'application/pdf' })] }); } catch { return false; } })();

    const shareFile = async () => {
        if (!result) return;
        try {
            await (navigator as any).share({ files: [new File([result.blob], result.fileName, { type: 'application/pdf' })], title: result.fileName, text: waMessage });
        } catch { /* user cancelled */ }
    };

    // Step gating
    const canGo = (n: number) => n === 1 || (n === 2 && !!formData.clientName.trim()) || (n >= 3 && !!formData.clientName.trim() && !!selectedPackage);
    const goTo = (n: number) => { if (canGo(n)) { setStep(n); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); } };

    const filteredPackages = packages.filter((p) => {
        const q = pkgSearch.trim().toLowerCase();
        if (!q) return true;
        return [p.Destination_Name, p.Duration, p.Travel_Type, p.Overview].some((v) => String(v || '').toLowerCase().includes(q));
    });

    return (
        <div className="space-y-5">
            {/* Stepper */}
            <Card padded={false} className="p-2">
                <div className="grid grid-cols-4 gap-1">
                    {STEPS.map((s) => {
                        const active = step === s.n;
                        const done = step > s.n;
                        const Icon = s.icon;
                        return (
                            <button
                                key={s.n}
                                type="button"
                                onClick={() => goTo(s.n)}
                                disabled={!canGo(s.n)}
                                className={cx(
                                    'flex items-center justify-center sm:justify-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                                    active ? 'bg-bordeaux-600 text-white' : done ? 'text-bordeaux-700 hover:bg-bordeaux-50' : 'text-gray-500 hover:bg-gray-50 disabled:hover:bg-transparent',
                                )}
                            >
                                <span className={cx('w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold', active ? 'bg-white/20' : done ? 'bg-bordeaux-100' : 'bg-gray-100')}>
                                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                </span>
                                <span className="hidden sm:block min-w-0">
                                    <span className={cx('block text-[11px] font-semibold uppercase tracking-wide', active ? 'text-white/70' : 'text-gray-400')}>Step {s.n}</span>
                                    <span className="block text-sm font-semibold truncate">{s.label}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* STEP 1 — Customer */}
            {step === 1 && (
                <Card>
                    <SectionTitle icon={<UserRound className="w-5 h-5" />} title="Who is this quote for?" subtitle="This appears on the cover — “Prepared for …”." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <Field label="Customer name *">
                            <input className={inputClass} placeholder="e.g. Priya & Rohan Sharma" value={formData.clientName} onChange={(e) => set('clientName', e.target.value)} autoFocus />
                        </Field>
                        <Field label="WhatsApp / phone" hint="Used for the “Share on WhatsApp” button">
                            <input className={inputClass} type="tel" placeholder="98765 43210" value={formData.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} />
                        </Field>
                        <Field label="Email">
                            <input className={inputClass} type="email" placeholder="name@email.com" value={formData.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
                        </Field>
                        <Field label="Travel date (start)">
                            <input className={inputClass} type="date" value={formData.travelDate} onChange={(e) => set('travelDate', e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Stepper label="Adults" value={formData.adults} min={1} onChange={(v) => set('adults', v)} />
                            <Stepper label="Children" value={formData.children} min={0} onChange={(v) => set('children', v)} />
                        </div>
                    </div>
                    <div className="mt-5">
                        <span className="block text-xs font-semibold text-gray-700 mb-2">Occasion</span>
                        <div className="flex flex-wrap gap-2">
                            {TRIP_TYPES.map((t) => (
                                <button key={t} type="button" onClick={() => set('tripType', formData.tripType === t ? '' : t)}
                                    className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors', formData.tripType === t ? 'bg-bordeaux-600 text-white border-bordeaux-600' : 'bg-white text-gray-700 border-gray-300 hover:border-bordeaux-300')}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <StepNav onNext={() => goTo(2)} nextDisabled={!formData.clientName.trim()} nextLabel="Choose package" />
                </Card>
            )}

            {/* STEP 2 — Package */}
            {step === 2 && (
                <Card>
                    <SectionTitle icon={<PackageIcon className="w-5 h-5" />} title="Pick a package to start from" subtitle="Everything (days, inclusions, price) can be changed in the next step." />
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] gap-3">
                        <select className={inputClass} value={selectedDestination} onChange={(e) => setSelectedDestination(e.target.value)}>
                            <option value="">Select a destination…</option>
                            {destinations.map(dest => (
                                <option key={dest.id} value={dest.id}>{dest.name || dest.Destination_Name}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input className={cx(inputClass, 'pl-9')} placeholder="Search packages…" value={pkgSearch} onChange={(e) => setPkgSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="mt-5">
                        {loading && <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading packages…</div>}
                        {!loading && !selectedDestination && packages.length === 0 && (
                            <p className="text-sm text-gray-500 py-6 text-center">Choose a destination to see its packages — or build a custom trip.</p>
                        )}
                        {!loading && selectedDestination && filteredPackages.length === 0 && (
                            <p className="text-sm text-gray-500 py-6 text-center">No packages found for this destination.</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            <button type="button" onClick={startCustomTrip}
                                className={cx('rounded-2xl border-2 border-dashed p-5 text-left transition-all flex flex-col justify-center min-h-[180px]', selectedPackage?.id === 'custom' ? 'border-bordeaux-500 bg-bordeaux-50' : 'border-gray-300 hover:border-bordeaux-300 hover:bg-gray-50')}>
                                <span className="w-10 h-10 rounded-xl bg-bordeaux-100 text-bordeaux-700 flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
                                <span className="mt-3 font-bold text-gray-900">{selectedPackage?.id === 'custom' ? selectedPackage.Destination_Name : 'Build a custom trip'}</span>
                                <span className="text-sm text-gray-500 mt-1">Start blank and add your own days, hotels and price.</span>
                            </button>
                            {filteredPackages.filter((p) => p.id !== 'custom').map(pkg => {
                                const img = cleanImageUrl(pkg.Primary_Image_URL);
                                const active = selectedPackage?.id === pkg.id;
                                return (
                                    <button type="button" key={pkg.id} onClick={() => handlePackageSelect(pkg)}
                                        className={cx('rounded-2xl border overflow-hidden text-left transition-all hover:shadow-md bg-white', active ? 'border-bordeaux-500 ring-2 ring-bordeaux-200' : 'border-gray-200 hover:border-bordeaux-300')}>
                                        <div className="h-28 bg-gradient-to-br from-bordeaux-600 to-mauve bg-cover bg-center relative" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                                            {active && <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bordeaux-600 text-white flex items-center justify-center shadow"><Check className="w-4 h-4" /></span>}
                                            {pkg.Duration && <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-gray-800">{pkg.Duration}</span>}
                                        </div>
                                        <div className="p-3.5">
                                            <h4 className="font-bold text-gray-900 leading-snug">{pkg.Destination_Name}</h4>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pkg.Overview}</p>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <span className="text-xs text-gray-500 truncate">{pkg.Star_Category || pkg.Travel_Type}</span>
                                                <span className="text-sm font-bold text-bordeaux-700 whitespace-nowrap">{pkg.Price_Range_INR || (pkg.Price_Min_INR ? formatINR(pkg.Price_Min_INR) : '')}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <StepNav onBack={() => goTo(1)} onNext={() => goTo(3)} nextDisabled={!selectedPackage} nextLabel="Customise" />
                </Card>
            )}

            {/* STEP 3 — Customise */}
            {step === 3 && selectedPackage && (
                <div className="space-y-5">
                    {/* Trip basics */}
                    <Card>
                        <SectionTitle icon={<MapPin className="w-5 h-5" />} title="Trip basics" subtitle={`Quote for ${formData.clientName || '—'} · ${formData.adults} adult${formData.adults === 1 ? '' : 's'}${formData.children ? `, ${formData.children} child` : ''}${formData.travelDate ? ` · ${formatLongDate(formData.travelDate)}` : ''}`}
                            action={<Button variant="ghost" size="sm" onClick={() => goTo(1)}>Edit customer</Button>} />
                        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Trip title (cover headline)" className="md:col-span-2">
                                    <input className={inputClass} value={selectedPackage.Destination_Name || ''} onChange={(e) => updatePkg('Destination_Name', e.target.value)} />
                                </Field>
                                <Field label="Duration">
                                    <input className={inputClass} placeholder="5 Nights / 6 Days" value={selectedPackage.Duration || ''} onChange={(e) => updatePkg('Duration', e.target.value)} />
                                </Field>
                                <Field label="Hotel category">
                                    <input className={inputClass} placeholder="4★ & 5★" value={selectedPackage.Star_Category || ''} onChange={(e) => updatePkg('Star_Category', e.target.value)} />
                                </Field>
                                <Field label="Meal plan">
                                    <input className={inputClass} placeholder="Breakfast & dinner" value={selectedPackage.Meal_Plan || ''} onChange={(e) => updatePkg('Meal_Plan', e.target.value)} />
                                </Field>
                                <Field label="Route (comma separated)" hint="e.g. Ubud (2N), Seminyak (3N)">
                                    <input className={inputClass} value={selectedPackage.Location_Breakup || ''} onChange={(e) => updatePkg('Location_Breakup', e.target.value)} />
                                </Field>
                                <Field label="Overview" className="md:col-span-2">
                                    <textarea className={inputClass} rows={3} value={selectedPackage.Overview || ''} onChange={(e) => updatePkg('Overview', e.target.value)} />
                                </Field>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-gray-700 mb-1">Cover photo</span>
                                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-bordeaux-600 via-bordeaux-800 to-coffee bg-cover bg-center flex items-end p-3"
                                    style={cleanImageUrl(selectedPackage.Primary_Image_URL) ? { backgroundImage: `url("${cleanImageUrl(selectedPackage.Primary_Image_URL)}")` } : undefined}>
                                    {!cleanImageUrl(selectedPackage.Primary_Image_URL) && <span className="text-xs text-white/80 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Brand gradient will be used</span>}
                                </div>
                                <input className={cx(inputClass, 'mt-2 text-xs')} placeholder="Paste image URL" value={selectedPackage.Primary_Image_URL || ''} onChange={(e) => updatePkg('Primary_Image_URL', e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    {/* Price */}
                    <Card>
                        <SectionTitle icon={<Wallet className="w-5 h-5" />} title="Price" subtitle="Shown as a big price card on page 2." />
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Total trip cost (₹, all travellers)" hint={catalogPrice ? `Catalog: ${formatINR(catalogPrice)} per person` : undefined}>
                                <input className={inputClass} type="number" min={0} value={formData.totalCost || ''} onChange={(e) => set('totalCost', parseInt(e.target.value) || 0)} />
                            </Field>
                            <Field label="Advance paid (₹)">
                                <input className={inputClass} type="number" min={0} value={formData.advancePaid || ''} onChange={(e) => set('advancePaid', parseInt(e.target.value) || 0)} />
                            </Field>
                            <Field label="Price note (optional)">
                                <input className={inputClass} placeholder="Inclusive of GST & taxes" value={formData.priceNote} onChange={(e) => set('priceNote', e.target.value)} />
                            </Field>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                            <Badge tone="wine">Per person ≈ {formatINR(Math.round((formData.totalCost || 0) / pax))}</Badge>
                            {formData.advancePaid > 0 && <Badge tone="amber">Balance due {formatINR(Math.max(0, formData.totalCost - formData.advancePaid))}</Badge>}
                            {catalogPrice > 0 && formData.totalCost !== catalogPrice * Math.max(1, formData.adults) && (
                                <Button variant="ghost" size="sm" onClick={() => set('totalCost', catalogPrice * Math.max(1, formData.adults))}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Use catalog price × {formData.adults} adult{formData.adults === 1 ? '' : 's'}
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Day by day */}
                    <Card>
                        <SectionTitle icon={<CalendarDays className="w-5 h-5" />} title={`Day-by-day plan (${days.length} day${days.length === 1 ? '' : 's'})`} subtitle="Each day becomes a card on the itinerary pages. Activities show as chips."
                            action={<Button variant="secondary" size="sm" onClick={addItineraryDay}><Plus className="w-3.5 h-3.5" /> Add day</Button>} />
                        <div className="mt-5 space-y-3">
                            {days.map((item, idx) => (
                                <div key={idx} className="rounded-2xl border border-gray-200 p-4 bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 w-12 h-12 rounded-xl bg-bordeaux-600 text-white flex flex-col items-center justify-center leading-none">
                                            <span className="text-[9px] font-bold tracking-widest opacity-80">DAY</span>
                                            <span className="text-lg font-bold">{idx + 1}</span>
                                        </span>
                                        <input className={cx(inputClass, 'font-semibold')} value={item.title} onChange={(e) => updateItineraryDay(idx, 'title', e.target.value)} placeholder="Day title, e.g. Arrive in Bali & sunset at Tanah Lot" />
                                        <div className="flex shrink-0">
                                            <IconBtn label="Move up" onClick={() => moveDay(idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></IconBtn>
                                            <IconBtn label="Move down" onClick={() => moveDay(idx, 1)} disabled={idx === days.length - 1}><ArrowDown className="w-4 h-4" /></IconBtn>
                                            <IconBtn label="Remove day" onClick={() => removeItineraryDay(idx)} danger><Trash2 className="w-4 h-4" /></IconBtn>
                                        </div>
                                    </div>
                                    <textarea className={cx(inputClass, 'mt-3')} rows={2} value={item.description} onChange={(e) => updateItineraryDay(idx, 'description', e.target.value)} placeholder="What happens today…" />
                                    <input className={cx(inputClass, 'mt-2 text-xs')} value={item.activitiesText || ''} onChange={(e) => updateItineraryDay(idx, 'activitiesText', e.target.value)} placeholder="Activities (comma separated) — e.g. Private transfer, Candle-light dinner, Spa" />
                                </div>
                            ))}
                            {days.length === 0 && <p className="text-sm text-gray-400 italic">No days yet — add the first day.</p>}
                        </div>
                    </Card>

                    {/* Hotels */}
                    <Card>
                        <SectionTitle icon={<BedDouble className="w-5 h-5" />} title="Hotels" subtitle={selectedPackage.Hotel_Examples ? `Catalog suggests: ${selectedPackage.Hotel_Examples}` : 'Add each stay with check-in / check-out dates.'}
                            action={<Button variant="secondary" size="sm" onClick={addHotel}><Plus className="w-3.5 h-3.5" /> Add hotel</Button>} />
                        <div className="mt-5 space-y-3">
                            {formData.hotels.map((hotel, idx) => {
                                const n = nightsBetween(hotel.checkIn, hotel.checkOut);
                                return (
                                    <div key={idx} className="rounded-2xl border border-gray-200 p-4 bg-gray-50/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-gray-800">Stay {idx + 1}{n ? <span className="ml-2 text-bordeaux-700">· {n} night{n === 1 ? '' : 's'}</span> : null}</span>
                                            <IconBtn label="Remove hotel" onClick={() => removeHotel(idx)} danger><Trash2 className="w-4 h-4" /></IconBtn>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input className={inputClass} placeholder="City" value={hotel.city} onChange={e => updateHotel(idx, 'city', e.target.value)} />
                                            <input className={cx(inputClass, 'md:col-span-2')} placeholder="Hotel name" value={hotel.hotelName} onChange={e => updateHotel(idx, 'hotelName', e.target.value)} />
                                            <input className={inputClass} placeholder="Room type, e.g. Pool Villa" value={hotel.roomType} onChange={e => updateHotel(idx, 'roomType', e.target.value)} />
                                            <input className={inputClass} placeholder="Meal plan, e.g. Breakfast (CP)" value={hotel.mealPlan} onChange={e => updateHotel(idx, 'mealPlan', e.target.value)} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="date" title="Check-in" className={inputClass} value={hotel.checkIn} onChange={e => updateHotel(idx, 'checkIn', e.target.value)} />
                                                <input type="date" title="Check-out" className={inputClass} value={hotel.checkOut} onChange={e => updateHotel(idx, 'checkOut', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {formData.hotels.length === 0 && <p className="text-sm text-gray-400 italic">No hotels added — the stays page will be skipped.</p>}
                        </div>
                    </Card>

                    {/* Flights */}
                    <Card>
                        <SectionTitle icon={<Plane className="w-5 h-5" />} title="Flights" subtitle="Shown as boarding-pass cards. Tip: write the city with its code, e.g. Delhi (DEL)."
                            action={<Button variant="secondary" size="sm" onClick={addFlight}><Plus className="w-3.5 h-3.5" /> Add flight</Button>} />
                        <div className="mt-5 space-y-3">
                            {formData.flights.map((flight, idx) => (
                                <div key={idx} className="rounded-2xl border border-gray-200 p-4 bg-gray-50/50">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-800">Flight {idx + 1}</span>
                                        <IconBtn label="Remove flight" onClick={() => removeFlight(idx)} danger><Trash2 className="w-4 h-4" /></IconBtn>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <input type="text" placeholder="Airline" className={inputClass} value={flight.airline} onChange={e => updateFlight(idx, 'airline', e.target.value)} />
                                        <input type="text" placeholder="Flight no." className={inputClass} value={flight.flightNumber} onChange={e => updateFlight(idx, 'flightNumber', e.target.value)} />
                                        <input type="text" placeholder="From, e.g. Delhi (DEL)" className={inputClass} value={flight.departureCity} onChange={e => updateFlight(idx, 'departureCity', e.target.value)} />
                                        <input type="text" placeholder="To, e.g. Bali (DPS)" className={inputClass} value={flight.arrivalCity} onChange={e => updateFlight(idx, 'arrivalCity', e.target.value)} />
                                        <input type="date" title="Date" className={inputClass} value={flight.date} onChange={e => updateFlight(idx, 'date', e.target.value)} />
                                        <input type="time" title="Departure time" className={inputClass} value={flight.departureTime} onChange={e => updateFlight(idx, 'departureTime', e.target.value)} />
                                        <input type="time" title="Arrival time" className={inputClass} value={flight.arrivalTime} onChange={e => updateFlight(idx, 'arrivalTime', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            {formData.flights.length === 0 && <p className="text-sm text-gray-400 italic">No flights added.</p>}
                        </div>
                    </Card>

                    {/* Inclusions / exclusions / notes */}
                    <Card>
                        <SectionTitle icon={<FileText className="w-5 h-5" />} title="Inclusions, exclusions & notes" subtitle="One item per line. Policies come from the package's booking policies." />
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="What's included ✓">
                                <textarea className={inputClass} rows={7} value={selectedPackage.Inclusions || ''} onChange={(e) => updatePkg('Inclusions', e.target.value)} />
                            </Field>
                            <Field label="Not included ✕">
                                <textarea className={inputClass} rows={7} value={selectedPackage.Exclusions || ''} onChange={(e) => updatePkg('Exclusions', e.target.value)} />
                            </Field>
                            <Field label="Important notes for the customer" hint="Printed in an “Important notes” box. One note per line." className="md:col-span-2">
                                <textarea className={inputClass} rows={3} value={formData.notes} onChange={(e) => set('notes', e.target.value)} />
                            </Field>
                            <Field label="Your name (travel designer on the cover)">
                                <input className={inputClass} placeholder="Team Travelzada" value={formData.designerName} onChange={(e) => set('designerName', e.target.value)} />
                            </Field>
                            <Field label="Quote valid for (days)" hint={`Valid until ${formatLongDate(new Date(quoteDate.getTime() + Math.max(1, formData.validDays) * 86400000).toISOString())}`}>
                                <input className={inputClass} type="number" min={1} max={60} value={formData.validDays} onChange={(e) => set('validDays', Math.max(1, parseInt(e.target.value) || 7))} />
                            </Field>
                        </div>
                    </Card>

                    <Card>
                        <StepNav onBack={() => goTo(2)} onNext={() => goTo(4)} nextDisabled={!formData.clientName.trim()} nextLabel="Preview PDF" noBorder />
                    </Card>
                </div>
            )}

            {/* STEP 4 — Preview & send */}
            {step === 4 && selectedPackage && proposalData && (
                <div className="space-y-5">
                    <Card>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-bold text-gray-900 truncate">{proposalData.trip.title}</h3>
                                    <Badge tone="wine">{quoteRef}</Badge>
                                    {pageCount > 0 && <Badge>{pageCount} pages</Badge>}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    For <b className="text-gray-800">{formData.clientName}</b>
                                    {formData.totalCost > 0 && <> · {formatINR(formData.totalCost)}</>}
                                    {' '}· valid till {formatLongDate(proposalData.validUntil)} · <span className="font-mono text-xs">{fileName}</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 shrink-0">
                                <Button variant="secondary" onClick={() => goTo(3)} disabled={generating}><ChevronLeft className="w-4 h-4" /> Edit</Button>
                                {!result ? (
                                    <Button onClick={generatePDF} loading={generating} className="px-5">
                                        {!generating && <Download className="w-4 h-4" />} {generating ? progress || 'Creating PDF…' : 'Download PDF'}
                                    </Button>
                                ) : (
                                    <Button variant="secondary" onClick={() => downloadBlob(result.blob, result.fileName)}><Download className="w-4 h-4" /> Download again</Button>
                                )}
                            </div>
                        </div>

                        {genError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                                <X className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>Couldn&apos;t create the PDF: {genError}. Please try again — if the cover photo is from an unusual site, try a different image URL.</div>
                            </div>
                        )}

                        {result && (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"><Check className="w-5 h-5" /></span>
                                        <div>
                                            <p className="font-semibold text-emerald-900">PDF downloaded · {(result.blob.size / 1024 / 1024).toFixed(1)} MB</p>
                                            <p className="text-sm text-emerald-800">
                                                Saved to customer records. <b>WhatsApp links can&apos;t attach files</b> — after the chat opens, tap 📎 and attach <span className="font-mono text-xs">{result.fileName}</span>.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        {canShareFile && (
                                            <Button variant="secondary" onClick={shareFile}><Share2 className="w-4 h-4" /> Share PDF…</Button>
                                        )}
                                        {clientWa ? (
                                            <a href={clientWa} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5a] shadow-sm">
                                                <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                                            </a>
                                        ) : (
                                            <span className="text-xs text-emerald-800 self-center">Add the customer&apos;s phone in step 1 to share on WhatsApp.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <SectionTitle icon={<Eye className="w-5 h-5" />} title="Live preview" subtitle="Exactly what the customer gets. Click a page to view it larger." />
                        </div>
                        <ProposalDocument
                            data={proposalData}
                            onReady={setPageCount}
                            containerStyle={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}
                            pageWrapper={(page, i) => (
                                <PageThumb index={i} onClick={() => setZoomPage(i)}>{page}</PageThumb>
                            )}
                        />
                    </Card>

                    {zoomPage !== null && (
                        <ZoomModal index={zoomPage} total={pageCount} onClose={() => setZoomPage(null)} onNav={(i) => setZoomPage(i)}>
                            <ProposalDocument data={proposalData} pageWrapper={(page, i) => (i === zoomPage ? page : null)} />
                        </ZoomModal>
                    )}

                    <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => { setQuoteRef(makeQuoteRef()); }} disabled={generating}>
                            <RotateCcw className="w-4 h-4" /> New quote number
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------------- helpers */

function SectionTitle({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-bordeaux-50 text-bordeaux-700 flex items-center justify-center">{icon}</span>
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

function StepNav({ onBack, onNext, nextDisabled, nextLabel, noBorder }: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel: string; noBorder?: boolean }) {
    return (
        <div className={cx('flex items-center justify-between gap-3', !noBorder && 'mt-6 pt-5 border-t border-gray-100')}>
            {onBack ? <Button variant="secondary" onClick={onBack}><ChevronLeft className="w-4 h-4" /> Back</Button> : <span />}
            <Button onClick={onNext} disabled={nextDisabled} className="px-5">{nextLabel} <ChevronRight className="w-4 h-4" /></Button>
        </div>
    );
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
    return (
        <div>
            <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
            <div className="flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden">
                <button type="button" className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40" onClick={() => onChange(Math.max(min, (value || 0) - 1))} disabled={(value || 0) <= min}><Minus className="w-4 h-4" /></button>
                <input className="w-full text-center text-sm font-semibold py-2 focus:outline-none" type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))} />
                <button type="button" className="px-3 py-2 text-gray-600 hover:bg-gray-50" onClick={() => onChange((value || 0) + 1)}><Plus className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
    return (
        <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
            className={cx('p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed', danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100')}>
            {children}
        </button>
    );
}

const THUMB_SCALE = 0.3;

function PageThumb({ children, index, onClick }: { children: ReactNode; index: number; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="group text-left">
            <div className="rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200 group-hover:ring-bordeaux-400 group-hover:shadow-lg transition-all bg-white"
                style={{ width: PAGE_W * THUMB_SCALE, height: PAGE_H * THUMB_SCALE }}>
                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>{children}</div>
            </div>
            <div className="mt-1.5 text-xs font-semibold text-gray-500 text-center">Page {index + 1}</div>
        </button>
    );
}

function ZoomModal({ children, index, total, onClose, onNav }: { children: ReactNode; index: number; total: number; onClose: () => void; onNav: (i: number) => void }) {
    const [scale, setScale] = useState(0.7);
    useEffect(() => {
        const calc = () => setScale(Math.min(1, (window.innerWidth - 32) / PAGE_W, (window.innerHeight - 110) / PAGE_H));
        calc();
        window.addEventListener('resize', calc);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && index < total - 1) onNav(index + 1);
            if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('resize', calc); window.removeEventListener('keydown', onKey); };
    }, [index, total, onClose, onNav]);
    return (
        <div className="fixed inset-0 z-[70] bg-gray-900/80 flex flex-col items-center justify-center p-4" onClick={onClose}>
            <div className="flex items-center gap-3 mb-3 text-white" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30" disabled={index === 0} onClick={() => onNav(index - 1)}><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm font-semibold">Page {index + 1} of {total}</span>
                <button type="button" className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30" disabled={index >= total - 1} onClick={() => onNav(index + 1)}><ChevronRight className="w-5 h-5" /></button>
                <button type="button" className="p-2 rounded-full bg-white/10 hover:bg-white/20 ml-4" onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-lg overflow-hidden shadow-2xl bg-white" style={{ width: PAGE_W * scale, height: PAGE_H * scale }} onClick={(e) => e.stopPropagation()}>
                <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
            </div>
        </div>
    );
}
