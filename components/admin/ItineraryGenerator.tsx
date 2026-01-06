'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import jsPDF from 'jspdf';
import { DestinationPackage } from './types'; // Assuming types are exported or we redefine

// Re-defining interface if not easily importable from a clean types file
interface Package extends DestinationPackage {
    id?: string;
    Image_Alt_Text?: string;
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
    customItinerary?: any[]; // To allow modifying the day-wise plan
}

export default function ItineraryGenerator() {
    const [step, setStep] = useState(1);
    const [destinations, setDestinations] = useState<any[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [selectedDestination, setSelectedDestination] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState<ItineraryData>({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        travelDate: '',
        adults: 2,
        children: 0,
        packageId: '',
        flights: [],
        hotels: [],
        totalCost: 0,
        advancePaid: 0,
        notes: ''
    });

    useEffect(() => {
        fetchDestinations();
    }, []);

    useEffect(() => {
        if (selectedDestination) {
            fetchPackages(selectedDestination);
        }
    }, [selectedDestination]);

    const fetchDestinations = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'destinations'));
            const dests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            if (selectedDestination) {
                const normSelected = selectedDestination.toLowerCase().trim();
                filtered = pkgs.filter(p => {
                    const pName = (p.Destination_Name || '').toLowerCase().trim();
                    const pId = (p.Destination_ID || '').toLowerCase().trim();
                    // Match if names contain each other (e.g. "Bali" in "Bali, Indonesia") or exact ID match
                    return pName.includes(normSelected) || normSelected.includes(pName) || pId === normSelected;
                });
            }

            console.log(`Fetched ${pkgs.length} packages, filtered to ${filtered.length} for "${selectedDestination}"`);
            setPackages(filtered);
        } catch (error) {
            console.error("Error fetching packages", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePackageSelect = (pkg: Package) => {
        setSelectedPackage(pkg);

        // Parse existing itinerary
        let parsedItinerary: any[] = [];
        if (pkg.Day_Wise_Itinerary) {
            const items = pkg.Day_Wise_Itinerary.split('|').map(item => item.trim());
            parsedItinerary = items.map((item, index) => {
                // handle "Day X: Title" format
                const dayMatch = item.match(/Day\s*(\d+):\s*(.+)/i);
                if (dayMatch) {
                    return { day: `Day ${dayMatch[1]}`, title: dayMatch[2].trim(), description: item }; // Keep full item as description fallback or split further if needed
                }

                // Simple split by colon
                const parts = item.split(':');
                const title = parts.length > 1 ? parts[0].trim() : `Day ${index + 1}`;
                const description = parts.length > 1 ? parts.slice(1).join(':').trim() : item;

                return {
                    day: `Day ${index + 1}`,
                    title: title.replace(/^Day\s*\d+\s*/i, ''), // clean title if it has Day X
                    description: description
                };
            });
        }

        // Clean price
        const priceStr = String(pkg.Price_Min_INR || pkg.Price_Range_INR || '0');
        const priceNum = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;

        setFormData(prev => ({
            ...prev,
            packageId: pkg.Destination_ID,
            totalCost: priceNum,
            customItinerary: parsedItinerary
        }));
    };

    const addFlight = () => {
        setFormData(prev => ({
            ...prev,
            flights: [...prev.flights, { date: '', airline: '', flightNumber: '', departureTime: '', arrivalTime: '', departureCity: '', arrivalCity: '' }]
        }));
    };

    const updateFlight = (index: number, field: keyof FlightDetail, value: string) => {
        const newFlights = [...formData.flights];
        newFlights[index] = { ...newFlights[index], [field]: value };
        setFormData(prev => ({ ...prev, flights: newFlights }));
    };

    const removeFlight = (index: number) => {
        setFormData(prev => ({ ...prev, flights: prev.flights.filter((_, i) => i !== index) }));
    };

    const addHotel = () => {
        setFormData(prev => ({
            ...prev,
            hotels: [...prev.hotels, { city: '', hotelName: '', checkIn: '', checkOut: '', roomType: '', mealPlan: '' }]
        }));
    };

    const updateHotel = (index: number, field: keyof HotelDetail, value: string) => {
        const newHotels = [...formData.hotels];
        newHotels[index] = { ...newHotels[index], [field]: value };
        setFormData(prev => ({ ...prev, hotels: newHotels }));
    };

    const removeHotel = (index: number) => {
        setFormData(prev => ({ ...prev, hotels: prev.hotels.filter((_, i) => i !== index) }));
    };

    // Itinerary Management
    const updateItineraryDay = (index: number, field: string, value: string) => {
        const newItinerary = [...(formData.customItinerary || [])];
        newItinerary[index] = { ...newItinerary[index], [field]: value };
        setFormData(prev => ({ ...prev, customItinerary: newItinerary }));
    };

    const addItineraryDay = () => {
        const newItinerary = [...(formData.customItinerary || [])];
        const dayNum = newItinerary.length + 1;
        newItinerary.push({ day: `Day ${dayNum}`, title: `Day ${dayNum} Activities`, description: 'Enjoy your day.' });
        setFormData(prev => ({ ...prev, customItinerary: newItinerary }));
    };

    const removeItineraryDay = (index: number) => {
        const newItinerary = [...(formData.customItinerary || [])];
        newItinerary.splice(index, 1);
        // Renumber days
        const renumbered = newItinerary.map((item, idx) => ({ ...item, day: `Day ${idx + 1}` }));
        setFormData(prev => ({ ...prev, customItinerary: renumbered }));
    };

    const generatePDF = async () => {
        if (!selectedPackage) return;
        setLoading(true);

        try {
            // Dynamically import jspdf
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default || jsPDFModule;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;

            // Brand Colors - Matching Website UI
            const COLOR_PRIMARY = [124, 58, 237]; // #7c3aed (Purple - Primary)
            const COLOR_ACCENT = [212, 175, 55]; // #d4af37 (Gold - Accent)
            const COLOR_INK = [31, 27, 44]; // #1f1b2c (Ink - Dark Text)
            const COLOR_CREAM = [253, 249, 243]; // #fdf9f3 (Cream - Background)
            const COLOR_PRICE = [201, 152, 70]; // #c99846 (Price Gold)

            // Helper to load image
            const loadImage = (url: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = url;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL('image/png'));
                        } else {
                            reject(new Error('Could not get canvas context'));
                        }
                    };
                    img.onerror = reject;
                });
            };

            // Helper: Add Footer
            const addFooter = (pageNum: number) => {
                const footerY = pageHeight - 15;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('Travelzada • +91 99299 62350 • info@travelzada.com', pageWidth / 2, footerY, { align: 'center' });
            };

            // Helper to get image properties (width/height)
            const getImageProperties = (url: string): Promise<{ width: number; height: number }> => {
                return new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.onload = () => {
                        resolve({ width: img.width, height: img.height });
                    };
                    img.onerror = reject;
                    img.src = url;
                });
            }

            // Helper: Add Logo
            const addLogo = async () => {
                try {
                    const logoUrl = '/images/logo/Travelzada Logo April (1).png';
                    const logoData = await loadImage(logoUrl);

                    // Calculate aspect ratio to prevent distortion
                    const imgProps = await getImageProperties(logoUrl);
                    const targetHeight = 15;
                    const targetWidth = (imgProps.width / imgProps.height) * targetHeight;

                    // Add logo to top left
                    const xPos = 15; // Left margin
                    pdf.addImage(logoData, 'PNG', xPos, 10, targetWidth, targetHeight, undefined, 'FAST');
                } catch (e) {
                    // fallback if props fail but we have data (rare)
                    // console.error('Failed to load logo', e)
                }
            };

            // Parse helper with better newline handling
            const parseListField = (field: string | string[] | undefined): string[] => {
                if (!field) return [];
                if (Array.isArray(field)) return field.map((i: string) => String(i).trim());
                if (typeof field === 'string') {
                    // Try splitting by newline first if it looks like a block
                    if (field.includes('\n')) {
                        return field.split('\n').map(i => i.trim()).filter(i => i.length > 0);
                    }
                    // Else split by commas
                    return field.split(',').map((i: string) => i.trim()).filter(i => i.length > 0);
                }
                return [];
            };

            const inclusions = parseListField(selectedPackage.Inclusions);
            const exclusions = parseListField(selectedPackage.Exclusions);

            // Helper to parse policies
            const parsePolicies = (items: any): string[] => {
                if (!items) return []
                if (Array.isArray(items)) {
                    if (items.length === 1 && typeof items[0] === 'string' && items[0].includes('", "')) {
                        return items[0].split('", "').map((i: string) => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim())
                    }
                    return items.map((i: any) => String(i).trim())
                }
                if (typeof items === 'string') {
                    if (items.includes('", "')) {
                        return items.split('", "').map(i => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim())
                    }
                    return items.split(',').map(i => i.trim())
                }
                return []
            }


            // --- PAGE 1: COVER PAGE ---
            await addLogo();

            // Image URL
            const imageUrl = selectedPackage.Primary_Image_URL
                ? selectedPackage.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

            // 2. Main Image
            let contentCursorY = 50;
            try {
                const mainImageData = await loadImage(imageUrl);
                const imgStartY = 35;
                const imgHeight = pageHeight * 0.35;
                pdf.addImage(mainImageData, 'JPEG', 0, imgStartY, pageWidth, imgHeight, undefined, 'FAST');
                // Alt Text
                if (selectedPackage.Image_Alt_Text) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(8);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(selectedPackage.Image_Alt_Text, pageWidth - 10, imgStartY + imgHeight + 5, { align: 'right' });
                }
                contentCursorY = imgStartY + imgHeight + 15;
            } catch (e) {
                console.error('Failed to load main image', e);
            }

            // 3. Text Content
            // Title
            pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(28);

            const maxTitleWidth = pageWidth - 40;
            const titleLines = pdf.splitTextToSize(selectedPackage.Destination_Name || 'Custom Package', maxTitleWidth);
            pdf.text(titleLines, pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += (titleLines.length * 10) + 5;

            // Tags
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);
            pdf.setTextColor(100, 100, 100);
            const tags = [
                selectedPackage.Duration,
                selectedPackage.Star_Category || 'Luxury Stay',
                selectedPackage.Travel_Type || 'Custom Trip'
            ].join('  •  ');
            pdf.text(tags, pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += 15;

            // Client Info (Specific to Custom Itinerary)
            if (formData.clientName) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(`Prepared for ${formData.clientName}`, pageWidth / 2, contentCursorY, { align: 'center' });
                contentCursorY += 15;
            }

            // Price Label
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            const priceLabel = formData.totalCost > 0 ? 'TOTAL TRIP COST' : 'STARTING FROM';
            pdf.text(priceLabel, pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += 10;

            // Price - Gold
            const formatPrice = (p: any) => new Intl.NumberFormat('en-IN').format(Number(String(p).replace(/[^0-9]/g, '')) || 0);

            pdf.setFont('times', 'bold'); // Serif as requested recentl
            pdf.setFontSize(26);
            pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2]);
            const priceVal = formData.totalCost > 0 ? formData.totalCost : selectedPackage.Price_Range_INR;
            pdf.text(`INR ${formatPrice(priceVal)}`, pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += 7;

            // "per person" - Matching logic from public page (gray-500, small)
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10); // Approximate sm/xs
            pdf.setTextColor(107, 114, 128); // gray-500
            pdf.text('per person', pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += 12;

            // Date Quote
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Quoted on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, contentCursorY, { align: 'center' });

            contentCursorY += 8;

            // Separator
            pdf.setDrawColor(220, 220, 220);
            pdf.line((pageWidth / 2) - 15, contentCursorY, (pageWidth / 2) + 15, contentCursorY);

            contentCursorY += 10;

            // Overview
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            const overviewText = pdf.splitTextToSize(selectedPackage.Overview || '', pageWidth - 50);
            pdf.text(overviewText, pageWidth / 2, contentCursorY, { align: 'center' });


            // --- PAGE 2: DETAILS & HIGHLIGHTS ---
            pdf.addPage();
            addFooter(2);
            await addLogo();
            let y = margin + 10;
            y += 5; // Header space

            // Details Box
            const boxHeight = 45;
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 5, 5, 'F');

            let boxY = y + 12;
            const col1X = margin + 10;
            const col2X = margin + (pageWidth - (margin * 2)) / 2 + 10;

            // Row 1
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Duration', col1X, boxY);
            pdf.text('Location', col2X, boxY);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            pdf.text(String(selectedPackage.Duration || ''), col1X, boxY + 6);
            pdf.text(String(selectedPackage.Destination_Name || ''), col2X, boxY + 6);

            boxY += 18;
            // Row 2
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Hotel Category', col1X, boxY);
            pdf.text('Travel Type', col2X, boxY);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            pdf.text(String(selectedPackage.Star_Category || '4-Star'), col1X, boxY + 6);
            pdf.text(String(selectedPackage.Travel_Type || 'Custom'), col2X, boxY + 6);

            y += boxHeight + 15;



            // Highlights
            // Check spacing before adding highlights
            if (y > pageHeight - 80) {
                pdf.addPage();
                addFooter(3);
                addLogo();
                y = margin + 15;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Highlights', margin, y);
            y += 12;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            const highlights = inclusions.slice(0, 8);
            highlights.forEach(item => {
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.setFont('helvetica', 'bold');
                pdf.text('+', margin, y);

                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(item, margin + 8, y);
                y += 9;
            });


            // --- PAGE 3: ITINERARY ---
            pdf.addPage();
            addFooter(3);
            await addLogo();
            y = margin + 15;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Day-wise Itinerary', margin, y);
            y += 12;

            const itinerary = formData.customItinerary && formData.customItinerary.length > 0 ? formData.customItinerary : [];
            // CLEAN SIMPLE TABLE DESIGN (Matching public page)
            const tableStartX = margin;
            const tableWidth = pageWidth - (margin * 2);
            const dayColWidth = 35;
            const rowHeight = 12;

            pdf.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
            pdf.rect(tableStartX, y, tableWidth, rowHeight + 2, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(255, 255, 255);
            pdf.text('Day', tableStartX + 8, y + 8);
            pdf.text('Activities', tableStartX + dayColWidth + 8, y + 8);
            y += rowHeight + 2;

            itinerary.forEach((day: any, index: number) => {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                const descLines = pdf.splitTextToSize(day.title + (day.description ? "\n" + day.description : ""), tableWidth - dayColWidth - 15);
                const currentRowHeight = Math.max(rowHeight, (descLines.length * 5) + 8);

                if (y + currentRowHeight > pageHeight - 30) {
                    pdf.addPage();
                    addFooter(3);
                    addLogo();
                    y = margin + 25;
                }

                if (index % 2 === 0) {
                    pdf.setFillColor(252, 250, 248);
                } else {
                    pdf.setFillColor(255, 255, 255);
                }
                pdf.rect(tableStartX, y, tableWidth, currentRowHeight, 'F');

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text(day.day, tableStartX + 8, y + 7);

                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(descLines, tableStartX + dayColWidth + 8, y + 7);

                pdf.setDrawColor(230, 230, 230);
                pdf.setLineWidth(0.2);
                pdf.line(tableStartX, y + currentRowHeight, tableStartX + tableWidth, y + currentRowHeight);

                y += currentRowHeight;
            });
            y += 10;


            // --- INCLUSIONS & EXCLUSIONS ---
            const getListHeight = (items: string[], width: number) => {
                let h = 0;
                items.forEach(item => {
                    const lines = pdf.splitTextToSize(item, width - 10);
                    h += (lines.length * 6) + 2;
                });
                return h;
            }

            const colW = (pageWidth - (margin * 3)) / 2;
            const incHeight = getListHeight(inclusions, colW) + 20;
            const excHeight = getListHeight(exclusions, colW) + 20;
            const maxHeight = Math.max(incHeight, excHeight, 100);

            pdf.addPage();
            addFooter(4);
            await addLogo();
            y = margin + 15;

            const startY = y;
            // Inclusions
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin, y - 5, colW, maxHeight, 5, 5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Inclusions', margin + 3, y + 1);
            y += 10;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            inclusions.forEach(item => {
                const lines = pdf.splitTextToSize(item, colW - 10);
                pdf.setTextColor(22, 163, 74);
                pdf.setFont('helvetica', 'bold');
                pdf.text('+', margin + 3, y);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(lines, margin + 10, y);
                y += (lines.length * 6) + 3;
            });

            // Exclusions
            let y2 = startY;
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin + colW + margin, y2 - 5, colW, maxHeight, 5, 5, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Exclusions', margin + colW + margin + 3, y2 + 1);
            y2 += 10;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            exclusions.forEach(item => {
                const lines = pdf.splitTextToSize(item, colW - 10);
                pdf.setTextColor(239, 68, 68);
                pdf.setFont('helvetica', 'bold');
                pdf.text('-', margin + colW + margin + 3, y2);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(lines, margin + colW + margin + 8, y2);
                y2 += (lines.length * 6) + 3;
            });
            y = startY + maxHeight + 10;


            // --- BOOKING POLICIES ---
            // Check if we need a new page for policies
            if (y > pageHeight - 120) { // Ensure at least 120mm space for policies, or force new page
                pdf.addPage();
                addFooter(5);
                await addLogo();
                y = margin + 15;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Booking Policies', margin, y);
            y += 15;

            const drawPolicySection = (title: string, items: string[]) => {
                // Check inner section spacing
                if (y > pageHeight - 40) {
                    pdf.addPage();
                    addFooter(5);
                    addLogo();
                    y = margin + 20;
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text(title, margin, y);
                y += 7;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(60, 60, 60);
                items.forEach(p => {
                    const bullet = '•';
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                    pdf.text(bullet, margin, y);
                    pdf.setTextColor(60, 60, 60);
                    const textWidth = pageWidth - (margin * 2) - 5;
                    const lines = pdf.splitTextToSize(p, textWidth);
                    pdf.text(lines, margin + 5, y);
                    y += (lines.length * 5) + 3;
                });
                y += 8;
            }

            if (selectedPackage.Booking_Policies) {
                drawPolicySection('Booking Terms', parsePolicies(selectedPackage.Booking_Policies.booking || ['Instant confirmation', 'Flexible dates']));
                drawPolicySection('Payment Policy', parsePolicies(selectedPackage.Booking_Policies.payment || ['Pay in instalments', 'Zero cost EMI']));
                drawPolicySection('Cancellation Policy', parsePolicies(selectedPackage.Booking_Policies.cancellation || ['Free cancellation up to 7 days']));
            }



            // FLIGHTS & HOTELS (Moved here)
            // Force new page for this section
            pdf.addPage();
            addFooter(6); // Adjust page number dynamic if possible, hardcoded for now or use variable
            await addLogo();
            y = margin + 15;

            if (formData.flights.length > 0) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(15);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text('Flight Details', margin, y);
                y += 10;

                formData.flights.forEach(flight => {
                    // Card Container
                    const cardHeight = 35;
                    pdf.setFillColor(252, 252, 252); // Almost white
                    pdf.setDrawColor(230, 230, 230); // Light gray border
                    pdf.roundedRect(margin, y, pageWidth - (margin * 2), cardHeight, 3, 3, 'FD');

                    // Left Accent Bar (Blue)
                    pdf.setFillColor(59, 130, 246); // Blue-500
                    pdf.rect(margin, y + 4, 1.5, cardHeight - 8, 'F');

                    const contentX = margin + 8;
                    const contentWidth = pageWidth - (margin * 2) - 16;
                    let currentY = y + 10;

                    // Row 1: Airline & Date
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                    pdf.text(flight.airline, contentX, currentY);

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                    pdf.text(flight.date, margin + pageWidth - (margin * 2) - 8, currentY, { align: 'right' });

                    // Subtext: Flight Number
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(flight.flightNumber.toUpperCase(), contentX + pdf.getStringUnitWidth(flight.airline) * 5, currentY);

                    currentY += 12;

                    // Row 2: Route Visual
                    // Departure
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    pdf.setTextColor(50, 50, 50);
                    pdf.text(flight.departureCity, contentX, currentY);

                    if (flight.departureTime) {
                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(9);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text(flight.departureTime, contentX, currentY + 5);
                    }

                    // Arrival (Right Aligned)
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    pdf.setTextColor(50, 50, 50);
                    pdf.text(flight.arrivalCity, margin + pageWidth - (margin * 2) - 8, currentY, { align: 'right' });

                    if (flight.arrivalTime) {
                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(9);
                        pdf.setTextColor(100, 100, 100);
                        pdf.text(flight.arrivalTime, margin + pageWidth - (margin * 2) - 8, currentY + 5, { align: 'right' });
                    }

                    // Connector Line (Visual)
                    const lineStartX = contentX + 35;
                    const lineEndX = margin + contentWidth - 35;
                    const lineY = currentY - 1;

                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.5);
                    pdf.line(lineStartX, lineY, lineEndX, lineY);

                    // Small circle at start
                    pdf.setFillColor(200, 200, 200);
                    pdf.circle(lineStartX, lineY, 1, 'F');

                    // Arrow/Circle at end
                    pdf.circle(lineEndX, lineY, 1, 'F');

                    // "Direct" or Icon text in middle
                    pdf.setFontSize(7);
                    pdf.setTextColor(180, 180, 180);
                    pdf.text('✈', (lineStartX + lineEndX) / 2, lineY + 1, { align: 'center' });

                    y += cardHeight + 8;
                });
                y += 5;
            }

            if (formData.hotels.length > 0) {
                // Check space for hotels header + 1 card
                if (y > pageHeight - 50) {
                    pdf.addPage();
                    addFooter(6);
                    addLogo();
                    y = margin + 15;
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(15);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text('Accommodation', margin, y);
                y += 10;

                formData.hotels.forEach(hotel => {
                    // Check individual card space
                    if (y > pageHeight - 40) {
                        pdf.addPage();
                        addFooter(6);
                        addLogo();
                        y = margin + 15;
                    }

                    const cardHeight = 35;
                    // Card Container
                    pdf.setFillColor(255, 255, 255);
                    pdf.setDrawColor(230, 230, 230);
                    pdf.roundedRect(margin, y, pageWidth - (margin * 2), cardHeight, 3, 3, 'FD');

                    // Left Accent Bar (Gold)
                    pdf.setFillColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
                    pdf.rect(margin, y + 4, 1.5, cardHeight - 8, 'F');

                    const contentX = margin + 8;
                    let currentY = y + 10;

                    // Row 1: Hotel Name & City
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                    pdf.text(hotel.hotelName, contentX, currentY);

                    // City Pill
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(120, 120, 120);
                    pdf.text(`•   ${hotel.city}`, contentX + pdf.getStringUnitWidth(hotel.hotelName) * 5.5, currentY);

                    // Row 2: Room & Meal (Bottom Left)
                    currentY += 12;
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`${hotel.roomType}`, contentX, currentY);

                    // Meal Plan (Badge style text)
                    if (hotel.mealPlan) {
                        pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                        pdf.setFontSize(9);
                        pdf.text(`(${hotel.mealPlan})`, contentX + pdf.getStringUnitWidth(hotel.roomType) * 4.5 + 2, currentY);
                    }

                    // Dates (Bottom Right)
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2]);
                    pdf.text(`${hotel.checkIn}  —  ${hotel.checkOut}`, pageWidth - margin - 8, currentY, { align: 'right' });

                    // Label above dates
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(7);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text('CHECK-IN — CHECK-OUT', pageWidth - margin - 8, currentY - 6, { align: 'right' });

                    y += cardHeight + 8;
                });
                y += 5;
            }

            // --- GUEST REVIEWS (Moved after Hotels) ---
            if (selectedPackage.Guest_Reviews && selectedPackage.Guest_Reviews.length > 0) {
                // Check if we need a new page for reviews
                if (y > pageHeight - 60) {
                    pdf.addPage();
                    addFooter(6);
                    await addLogo();
                    y = margin + 15;
                } else {
                    y += 10; // Spacing from previous section
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(20);
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text('Guest Reviews', margin, y);
                y += 12;

                selectedPackage.Guest_Reviews.slice(0, 3).forEach(review => {
                    // Review Card
                    if (y > pageHeight - 40) {
                        pdf.addPage();
                        addFooter(6);
                        addLogo();
                        y = margin + 20;
                    }

                    pdf.setFillColor(250, 250, 252);
                    pdf.roundedRect(margin, y, pageWidth - (margin * 2), 25, 3, 3, 'F');

                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                    pdf.text(review.name, margin + 5, y + 8);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(review.date, pageWidth - margin - 5, y + 8, { align: 'right' });

                    pdf.setTextColor(60, 60, 60);
                    const contentLines = pdf.splitTextToSize(review.content, pageWidth - (margin * 2) - 10);
                    pdf.text(contentLines, margin + 5, y + 16);

                    y += 25 + 5;
                });
            }

            // --- FAQs ---
            pdf.addPage();
            addFooter(6);
            await addLogo();
            y = margin + 15;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Frequently Asked Questions', margin, y);
            y += 12;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            (selectedPackage.FAQ_Items || []).slice(0, 5).forEach((faq: any) => {
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(`Q: ${faq.question}`, margin, y);
                y += 6;
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(60, 60, 60);
                const answerLines = pdf.splitTextToSize(`A: ${faq.answer}`, pageWidth - (margin * 2));
                pdf.text(answerLines, margin, y);
                y += (answerLines.length * 5) + 8;
            });

            // --- FINAL CTA ---
            y += 15;
            if (y > pageHeight - 40) { pdf.addPage(); addFooter(4); await addLogo(); y = margin + 25; }

            const btnW = 50;
            const btnH = 12;
            const gap = 10;
            const startX = (pageWidth - (btnW * 2 + gap)) / 2;

            // WhatsApp Button
            pdf.setFillColor(37, 211, 102);
            pdf.roundedRect(startX, y, btnW, btnH, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('WhatsApp Us', startX + (btnW / 2), y + 8, { align: 'center' });
            pdf.link(startX, y, btnW, btnH, { url: `https://wa.me/919929962350?text=${encodeURIComponent(`Hi, here is the custom itinerary for ${formData.clientName}.`)}` });

            // Call Button
            pdf.setFillColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.roundedRect(startX + btnW + gap, y, btnW, btnH, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.text('Call Us', startX + btnW + gap + (btnW / 2), y + 8, { align: 'center' });
            pdf.link(startX + btnW + gap, y, btnW, btnH, { url: 'tel:+919929962350' });


            // Save
            const fileName = `${formData.clientName.replace(/\s+/g, '_')}_Itinerary.pdf`;
            pdf.save(fileName);

            // Log to CRM (existing logic)
            try {
                const now = new Date().toISOString();
                const customerRecord = {
                    clientName: formData.clientName,
                    clientEmail: formData.clientEmail,
                    clientPhone: formData.clientPhone,
                    packageId: selectedPackage.Destination_ID,
                    packageName: selectedPackage.Destination_Name,
                    destinationName: selectedPackage.Destination_Name,
                    travelDate: formData.travelDate,
                    adults: formData.adults,
                    children: formData.children,
                    totalCost: formData.totalCost,
                    advancePaid: formData.advancePaid,
                    balanceDue: formData.totalCost - formData.advancePaid,
                    flights: formData.flights,
                    hotels: formData.hotels,
                    customItinerary: formData.customItinerary || [],
                    notes: formData.notes,
                    status: 'draft',
                    history: [{
                        action: 'Itinerary generated',
                        timestamp: now,
                        details: `PDF created for ${formData.clientName}`
                    }],
                    createdAt: now,
                    updatedAt: now,
                    createdBy: 'admin'
                };
                await addDoc(collection(db, 'customer_itineraries'), customerRecord);
                console.log('Customer record saved to CRM');
            } catch (saveError) {
                console.error('Failed to save customer record:', saveError);
            }


        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create Custom Itinerary</h2>
                <div className="flex items-center gap-2 text-sm">
                    <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>1. Select Package</span>
                    <span className="text-gray-300">→</span>
                    <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>2. Customize Details</span>
                    <span className="text-gray-300">→</span>
                    <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>3. Generate PDF</span>
                </div>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Destination</label>
                            <select
                                className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={selectedDestination}
                                onChange={(e) => setSelectedDestination(e.target.value)}
                            >
                                <option value="">Select a Destination...</option>
                                {destinations.map(dest => (
                                    <option key={dest.id} value={dest.name || dest.Destination_Name}>{dest.name || dest.Destination_Name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Available Packages ({packages.length})</h3>
                        </div>
                        {loading && <div className="text-gray-500">Loading packages...</div>}
                        {!loading && packages.length === 0 && selectedDestination && <div className="text-gray-500">No packages found for this destination.</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {packages.map(pkg => (
                                <div
                                    key={pkg.id}
                                    onClick={() => handlePackageSelect(pkg)}
                                    className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${selectedPackage?.id === pkg.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    <h4 className="font-bold text-gray-900 mb-2">{pkg.Destination_Name}</h4>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.Overview}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="bg-gray-100 px-2 py-1 rounded">{pkg.Duration}</span>
                                        <span className="font-semibold text-green-600">{pkg.Price_Range_INR}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            disabled={!selectedPackage}
                            onClick={() => setStep(2)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue to Details
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-fadeIn">
                    {/* Client Details */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            👤 Client Verification
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                    placeholder="e.g. Mr. Sharma"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Travel Date</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                    value={formData.travelDate}
                                    onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Adults</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                        value={formData.adults}
                                        onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Children</label>
                                    <input
                                        type="number"
                                        className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                        value={formData.children}
                                        onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flight Details */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                ✈️ Flight Details
                            </h3>
                            <button onClick={addFlight} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Flight</button>
                        </div>

                        {formData.flights.map((flight, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 mb-3 relative group">
                                <button onClick={() => removeFlight(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <input type="text" placeholder="Airline" className="input-sm border rounded p-2 text-sm" value={flight.airline} onChange={e => updateFlight(idx, 'airline', e.target.value)} />
                                    <input type="text" placeholder="Flight No." className="input-sm border rounded p-2 text-sm" value={flight.flightNumber} onChange={e => updateFlight(idx, 'flightNumber', e.target.value)} />
                                    <input type="text" placeholder="From (City)" className="input-sm border rounded p-2 text-sm" value={flight.departureCity} onChange={e => updateFlight(idx, 'departureCity', e.target.value)} />
                                    <input type="text" placeholder="To (City)" className="input-sm border rounded p-2 text-sm" value={flight.arrivalCity} onChange={e => updateFlight(idx, 'arrivalCity', e.target.value)} />
                                    <input type="date" className="input-sm border rounded p-2 text-sm" value={flight.date} onChange={e => updateFlight(idx, 'date', e.target.value)} />
                                    <input type="time" placeholder="Dep Time" className="input-sm border rounded p-2 text-sm" value={flight.departureTime} onChange={e => updateFlight(idx, 'departureTime', e.target.value)} />
                                    <input type="time" placeholder="Arr Time" className="input-sm border rounded p-2 text-sm" value={flight.arrivalTime} onChange={e => updateFlight(idx, 'arrivalTime', e.target.value)} />
                                </div>
                            </div>
                        ))}
                        {formData.flights.length === 0 && <p className="text-sm text-gray-400 italic">No flights added yet.</p>}
                    </div>

                    {/* Hotel Details */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                🏨 Hotel Details
                            </h3>
                            <button onClick={addHotel} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Hotel</button>
                        </div>

                        {formData.hotels.map((hotel, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 mb-3 relative group">
                                <button onClick={() => removeHotel(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input type="text" placeholder="City" className="input-sm border rounded p-2 text-sm" value={hotel.city} onChange={e => updateHotel(idx, 'city', e.target.value)} />
                                    <input type="text" placeholder="Hotel Name" className="input-sm border rounded p-2 text-sm" value={hotel.hotelName} onChange={e => updateHotel(idx, 'hotelName', e.target.value)} />
                                    <input type="text" placeholder="Room Type" className="input-sm border rounded p-2 text-sm" value={hotel.roomType} onChange={e => updateHotel(idx, 'roomType', e.target.value)} />
                                    <input type="text" placeholder="Meal Plan (e.g. CP, MAP)" className="input-sm border rounded p-2 text-sm" value={hotel.mealPlan} onChange={e => updateHotel(idx, 'mealPlan', e.target.value)} />
                                    <div className="flex gap-2">
                                        <input type="date" placeholder="Check In" className="w-full input-sm border rounded p-2 text-sm" value={hotel.checkIn} onChange={e => updateHotel(idx, 'checkIn', e.target.value)} />
                                        <input type="date" placeholder="Check Out" className="w-full input-sm border rounded p-2 text-sm" value={hotel.checkOut} onChange={e => updateHotel(idx, 'checkOut', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.hotels.length === 0 && <p className="text-sm text-gray-400 italic">No hotels added yet.</p>}
                    </div>

                    {/* Financials */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            💰 Financials
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Total Trip Cost (INR)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                    value={formData.totalCost}
                                    onChange={(e) => setFormData({ ...formData, totalCost: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Advance Paid (INR)</label>
                                <input
                                    type="number"
                                    className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                                    value={formData.advancePaid}
                                    onChange={(e) => setFormData({ ...formData, advancePaid: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Day Wise Itinerary */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                📅 Day Wise Itinerary
                            </h3>
                            <button onClick={addItineraryDay} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Day</button>
                        </div>

                        <div className="space-y-4">
                            {formData.customItinerary?.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 relative group">
                                    <button onClick={() => removeItineraryDay(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">{item.day}</span>
                                        <input
                                            type="text"
                                            className="flex-1 font-semibold text-gray-800 border-none focus:ring-0 p-0"
                                            value={item.title}
                                            onChange={(e) => updateItineraryDay(idx, 'title', e.target.value)}
                                            placeholder="Day Title"
                                        />
                                    </div>
                                    <textarea
                                        className="w-full text-sm text-gray-600 border-gray-200 rounded p-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={2}
                                        value={item.description}
                                        onChange={(e) => updateItineraryDay(idx, 'description', e.target.value)}
                                        placeholder="Description of activities..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setStep(1)}
                            className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            disabled={!formData.clientName}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Review & Generate
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && selectedPackage && (
                <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate Itinerary!</h2>
                        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                            We have compiled the details for <strong>{formData.clientName}</strong> going to <strong>{selectedPackage.Destination_Name}</strong>.
                            Click below to download the PDF.
                        </p>

                        <button
                            onClick={generatePDF}
                            className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-3 mx-auto"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Download Itinerary PDF
                        </button>
                    </div>

                    <div className="flex justify-start pt-4">
                        <button
                            onClick={() => setStep(2)}
                            className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Back to Edit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
