'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import jsPDF from 'jspdf';
import { DestinationPackage } from './types'; // Assuming types are exported or we redefine

// Re-defining interface if not easily importable from a clean types file
interface Package extends DestinationPackage {
    id?: string;
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
            const jsPDFModule = await import('jspdf');
            const jsPDF = jsPDFModule.default || jsPDFModule;

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;

            // Brand Colors
            const COLOR_PRIMARY = [124, 58, 237]; // #7c3aed
            const COLOR_ACCENT = [212, 175, 55]; // #d4af37
            const COLOR_INK = [31, 27, 44]; // #1f1b2c
            const COLOR_CREAM = [253, 249, 243]; // #fdf9f3
            const COLOR_PRICE = [201, 152, 70]; // #c99846

            // Helpers
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

            const getImageProperties = (url: string): Promise<{ width: number; height: number }> => {
                return new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.onload = () => resolve({ width: img.width, height: img.height });
                    img.onerror = reject;
                    img.src = url;
                });
            };

            // Pre-load assets
            let logoData: string | null = null;
            let flightIconData: string | null = null;
            let hotelIconData: string | null = null;

            try {
                const [logo, flight, hotel] = await Promise.all([
                    loadImage('/images/logo/Travelzada Logo April (1).png').catch(e => null),
                    loadImage('https://img.icons8.com/fluency/96/airplane-take-off.png').catch(e => null),
                    loadImage('https://img.icons8.com/fluency/96/5-star-hotel.png').catch(e => null)
                ]);
                logoData = logo;
                flightIconData = flight;
                hotelIconData = hotel;
            } catch (e) {
                console.error("Error loading assets", e);
            }

            const addLogo = async () => {
                if (logoData) {
                    try {
                        const imgProps = await getImageProperties('/images/logo/Travelzada Logo April (1).png'); // We have data, but need props for ratio
                        // Fallback ratio if props fail or just assume standard
                        const ratio = imgProps.width / imgProps.height;
                        const targetHeight = 15;
                        const targetWidth = ratio * targetHeight;
                        pdf.addImage(logoData, 'PNG', 15, 10, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        // fallback if props fail but we have data (rare)
                        pdf.addImage(logoData, 'PNG', 15, 10, 40, 15, undefined, 'FAST');
                    }
                }
            };

            const addFooter = (pageNum: number) => {
                const footerY = pageHeight - 15;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('Travelzada • +91 99299 62350 • info@travelzada.com', pageWidth / 2, footerY, { align: 'center' });
                pdf.text(`Page ${pageNum}`, pageWidth - 15, footerY, { align: 'right' });
            };

            // --- PAGE 1: COVER ---
            try {
                // Handle markdown image URL if present
                const imageUrl = selectedPackage.Primary_Image_URL
                    ? selectedPackage.Primary_Image_URL.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2').trim()
                    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

                const mainImageData = await loadImage(imageUrl);
                const imgHeight = pageHeight * 0.6;
                pdf.addImage(mainImageData, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
            } catch (e) {
                console.error('Failed to load main image', e);
            }

            await addLogo();

            pdf.setTextColor(255, 255, 255);
            pdf.setFont('times', 'bold');
            pdf.setFontSize(32);

            const titleY = (pageHeight * 0.6) - 50; // Moved up slightly to make room
            const title = selectedPackage.Destination_Name || 'Custom Package';
            const titleLines = pdf.splitTextToSize(title, pageWidth - 40);
            pdf.text(titleLines, pageWidth / 2, titleY, { align: 'center' });

            // Calculate height of title to position tags correctly
            // 32pt font roughly needs 12-14mm per line including spacing
            const titleHeight = titleLines.length * 14;

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(12);
            const tags = [
                selectedPackage.Duration,
                selectedPackage.Star_Category || 'Luxury Stay',
                selectedPackage.Travel_Type || 'Custom Trip'
            ].join('  •  ');

            // Position tags below the title with a dynamic buffer
            pdf.text(tags, pageWidth / 2, titleY + titleHeight + 5, { align: 'center' });

            // Custom Client Info on Cover - REMOVED from Image area to be placed in white space

            const contentStartY = (pageHeight * 0.6) + 20; // Added a bit more breathing room

            // --- WHITE SPACE CONTENT ---

            // 1. CLIENT NAME (Eye Catching)
            if (formData.clientName) {
                // "Specially Prepared For" label
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text('SPECIALLY PREPARED FOR', pageWidth / 2, contentStartY, { align: 'center' });

                // Client Name - Large & Primary Colored
                pdf.setFont('times', 'bold');
                pdf.setFontSize(26);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text(formData.clientName, pageWidth / 2, contentStartY + 12, { align: 'center' });

                // Travel Dates
                if (formData.travelDate) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`${formData.travelDate}`, pageWidth / 2, contentStartY + 20, { align: 'center' });
                }
            }

            // 2. Price Section (pushed down)
            const priceY = formData.clientName ? contentStartY + 35 : contentStartY;

            // Separator Line
            pdf.setDrawColor(220, 220, 220);
            pdf.line(pageWidth / 2 - 20, priceY, pageWidth / 2 + 20, priceY);

            // Price / Package Label
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            const priceLabel = formData.totalCost > 0 ? 'TOTAL TRIP COST' : 'PACKAGE STARTING FROM';
            pdf.text(priceLabel, pageWidth / 2, priceY + 10, { align: 'center' });

            pdf.setFont('times', 'bold');
            pdf.setFontSize(22);
            pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2]); // Gold
            const price = formData.totalCost > 0 ? formData.totalCost : selectedPackage.Price_Range_INR;
            pdf.text(`INR ${price}`, pageWidth / 2, priceY + 20, { align: 'center' });

            // 3. Overview (pushed down)
            const overviewY = priceY + 35;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);

            // Limit overview lines to avoid overflow
            const overviewText = pdf.splitTextToSize(selectedPackage.Overview || '', pageWidth - 50);
            // Take first 4-5 lines max to fit cover page comfortably
            const displayedOverview = overviewText.slice(0, 5);
            if (overviewText.length > 5) displayedOverview.push('...');

            pdf.text(displayedOverview, pageWidth / 2, overviewY, { align: 'center' });

            // --- PAGE 2: DETAILS & ARRANGEMENTS ---
            pdf.addPage();
            addFooter(2);
            await addLogo();
            let y = margin + 15;

            // Details Box
            const boxHeight = 45;
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 5, 5, 'F');

            let boxY = y + 12;
            const col1X = margin + 10;
            const col2X = margin + (pageWidth - (margin * 2)) / 2 + 10;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Travelers', col1X, boxY);
            pdf.text('Destination', col2X, boxY);

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            pdf.text(`${formData.adults} Adults, ${formData.children} Children`, col1X, boxY + 6);
            pdf.text(selectedPackage.Destination_Name, col2X, boxY + 6);

            boxY += 18;
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Duration', col1X, boxY);
            pdf.text('Contact', col2X, boxY);

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(80, 80, 80);
            pdf.text(selectedPackage.Duration, col1X, boxY + 6);
            pdf.text(formData.clientPhone || formData.clientEmail || 'N/A', col2X, boxY + 6);

            y += boxHeight + 20;

            // FLIGHTS SECTION
            if (formData.flights.length > 0) {
                // Icon + Header
                if (flightIconData) {
                    pdf.addImage(flightIconData, 'PNG', margin, y - 6, 8, 8); // 8x8mm icon
                    pdf.setFont('times', 'bold');
                    pdf.setFontSize(18);
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                    pdf.text('Flight Details', margin + 12, y); // Shifted right for icon
                } else {
                    pdf.setFont('times', 'bold');
                    pdf.setFontSize(18);
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                    pdf.text('Flight Details', margin, y);
                }

                y += 10;

                formData.flights.forEach(flight => {
                    // Card Container
                    pdf.setDrawColor(230, 230, 240);
                    pdf.setFillColor(250, 252, 255); // Very light cool tint
                    pdf.roundedRect(margin, y, pageWidth - (margin * 2), 28, 2, 2, 'FD');

                    // Blue Accent Strip
                    pdf.setFillColor(59, 130, 246); // Blue
                    pdf.rect(margin, y + 3, 1.5, 22, 'F');

                    // Airline Name & Flight No
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                    pdf.text(`${flight.airline}`, margin + 8, y + 9);

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(11);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`|  ${flight.flightNumber}`, margin + 8 + (pdf.getStringUnitWidth(flight.airline) * 4.5) + 5, y + 9); // Rough spacing calc

                    // Date
                    pdf.setFontSize(10);
                    pdf.setTextColor(59, 130, 246); // Blue Text
                    pdf.text(flight.date, pageWidth - margin - 5, y + 9, { align: 'right' });

                    // Route
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`${flight.departureCity}`, margin + 8, y + 19);

                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`(${flight.departureTime})`, margin + 8 + (pdf.getStringUnitWidth(flight.departureCity) * 4) + 2, y + 19);

                    pdf.setTextColor(150, 150, 150);
                    pdf.text('➝', margin + 55, y + 19);

                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`${flight.arrivalCity}`, margin + 65, y + 19);

                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`(${flight.arrivalTime})`, margin + 65 + (pdf.getStringUnitWidth(flight.arrivalCity) * 4) + 2, y + 19);

                    y += 35;
                });
                y += 5;
            }

            // HOTELS SECTION
            if (formData.hotels.length > 0) {
                // Icon + Header
                if (hotelIconData) {
                    pdf.addImage(hotelIconData, 'PNG', margin, y - 6, 8, 8); // 8x8mm icon
                    pdf.setFont('times', 'bold');
                    pdf.setFontSize(18);
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                    pdf.text('Accommodation', margin + 12, y); // Shifted
                } else {
                    pdf.setFont('times', 'bold');
                    pdf.setFontSize(18);
                    pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]); // Primary Color
                    pdf.text('Accommodation', margin, y);
                }
                y += 10;

                formData.hotels.forEach(hotel => {
                    // Card Container
                    pdf.setDrawColor(240, 235, 230);
                    pdf.setFillColor(255, 252, 248); // Warm tint
                    pdf.roundedRect(margin, y, pageWidth - (margin * 2), 30, 2, 2, 'FD');

                    // Gold Accent Strip
                    pdf.setFillColor(212, 175, 55); // Gold
                    pdf.rect(margin, y + 3, 1.5, 24, 'F');

                    // Hotel Name
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(12);
                    pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                    pdf.text(hotel.hotelName, margin + 8, y + 9);

                    // Location
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(hotel.city, pageWidth - margin - 5, y + 9, { align: 'right' }); // Right align city

                    // Details Row 1
                    pdf.setFontSize(9);
                    pdf.setTextColor(80, 80, 80);
                    pdf.text(`Check-in: ${hotel.checkIn}`, margin + 8, y + 17);
                    pdf.text(`Check-out: ${hotel.checkOut}`, margin + 50, y + 17);

                    // Details Row 2
                    pdf.setTextColor(COLOR_PRICE[0], COLOR_PRICE[1], COLOR_PRICE[2]); // Gold text for room info
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(`${hotel.roomType}  •  ${hotel.mealPlan}`, margin + 8, y + 24);

                    y += 38;
                });
            }

            // --- PAGE 3: ITINERARY ---
            pdf.addPage();
            addFooter(3);
            await addLogo();
            y = margin + 15;

            pdf.setFont('times', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Day-wise Itinerary', margin, y);
            y += 15;

            // Parse Day Wise Itinerary
            // Use custom itinerary if available, otherwise fallback (though we populate customItinerary on select)
            const itineraryItems = formData.customItinerary && formData.customItinerary.length > 0
                ? formData.customItinerary
                : (selectedPackage.Day_Wise_Itinerary ? selectedPackage.Day_Wise_Itinerary.split('|').map(item => ({ day: 'Day ?', title: item, description: item })) : []);

            const timelineX = margin + 6;
            const timelineStartY = y;

            for (const [index, item] of itineraryItems.entries()) {
                if (y > pageHeight - margin) {
                    pdf.addPage();
                    addFooter(3);
                    await addLogo();
                    y = margin + 20;
                }

                // If item is string (fallback), parse it roughly
                let dayLabel = item.day || `Day ${index + 1}`;
                let title = item.title || `Day ${index + 1}`;
                let desc = item.description || '';

                if (typeof item === 'string') {
                    const parts = item.split(':');
                    dayLabel = `Day ${index + 1}`;
                    title = parts[0]?.trim() || dayLabel;
                    desc = parts.slice(1).join(':').trim() || item;
                }

                // Dot
                pdf.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.circle(timelineX, y - 1.5, 2, 'F');

                // Day Text
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(11);
                pdf.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
                pdf.text(dayLabel, timelineX + 10, y);

                // Title
                pdf.setFont('helvetica', 'medium');
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                const titleX = timelineX + 35;
                const titleLines = pdf.splitTextToSize(title, pageWidth - margin - titleX);
                pdf.text(titleLines, titleX, y);

                y += (titleLines.length * 6) + 2;

                // Description
                if (desc) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor(80, 80, 80);
                    const descLines = pdf.splitTextToSize(desc, pageWidth - margin - titleX);
                    pdf.text(descLines, titleX, y);
                    y += (descLines.length * 5) + 8;
                } else {
                    y += 6;
                }
            }

            // Draw Timeline Line
            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.5);
            pdf.line(timelineX, timelineStartY - 2, timelineX, y - 15);

            y += 10;

            // --- INCLUSIONS/EXCLUSIONS (If space permits, or new page) ---
            if (y > pageHeight - 120) {
                pdf.addPage();
                addFooter(4);
                await addLogo();
                y = margin + 20;
            }

            const incExcStartY = y;
            const colW = (pageWidth - (margin * 3)) / 2;

            // Inclusions
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin, y - 5, colW, 100, 5, 5, 'F');
            pdf.setFont('times', 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Inclusions', margin, y);
            y += 10;

            const inclusions = selectedPackage.Inclusions ? selectedPackage.Inclusions.split(',') : [];
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            inclusions.forEach(inc => {
                const lines = pdf.splitTextToSize(inc.trim(), colW - 10);
                pdf.setTextColor(22, 163, 74); // Green
                pdf.setFont('helvetica', 'bold');
                pdf.text('+', margin, y);
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.setFont('helvetica', 'normal');
                pdf.text(lines, margin + 6, y);
                y += (lines.length * 5) + 3;
            });

            // Exclusions
            let y2 = incExcStartY;
            pdf.setFillColor(COLOR_CREAM[0], COLOR_CREAM[1], COLOR_CREAM[2]);
            pdf.roundedRect(margin + colW + margin, y2 - 5, colW, 100, 5, 5, 'F');
            pdf.setFont('times', 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Exclusions', margin + colW + margin, y2);
            y2 += 10;

            const exclusions = selectedPackage.Exclusions ? selectedPackage.Exclusions.split(',') : [];
            exclusions.forEach(exc => {
                const lines = pdf.splitTextToSize(exc.trim(), colW - 10);
                pdf.setTextColor(239, 68, 68); // Red
                pdf.setFont('helvetica', 'bold');
                pdf.text('-', margin + colW + margin, y2);
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.setFont('helvetica', 'normal');
                pdf.text(lines, margin + colW + margin + 6, y2);
                y2 += (lines.length * 5) + 3;
            });

            // --- PAGE 4/5: Booking Policies & FAQs ---
            // Always start new page for clean separation
            pdf.addPage();
            addFooter(4);
            await addLogo();
            y = margin + 20;

            // Booking Policies
            pdf.setFont('times', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Booking Policies', margin, y);
            y += 15;

            const parsePolicies = (items: any): string[] => {
                if (!items) return [];
                if (Array.isArray(items)) {
                    if (items.length === 1 && typeof items[0] === 'string' && items[0].includes('", "')) {
                        return items[0].split('", "').map((i: string) => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim());
                    }
                    return items.map((i: any) => String(i).trim());
                }
                if (typeof items === 'string') {
                    if (items.includes('", "')) {
                        return items.split('", "').map(i => i.replace(/^"|"$/g, '').replace(/^\\"|\\"?$/g, '').trim())
                    }
                    return items.split(',').map(i => i.trim());
                }
                return [];
            };

            const drawPolicySection = (title: string, items: string[]) => {
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
            };

            if (selectedPackage.Booking_Policies) {
                drawPolicySection('Booking Terms', parsePolicies(selectedPackage.Booking_Policies.booking || ['Instant confirmation', 'Flexible dates']));
                drawPolicySection('Payment Policy', parsePolicies(selectedPackage.Booking_Policies.payment || ['Pay in instalments', 'Zero cost EMI']));
                drawPolicySection('Cancellation Policy', parsePolicies(selectedPackage.Booking_Policies.cancellation || ['Free cancellation up to 7 days']));
            } else {
                // Defaults
                drawPolicySection('Booking Terms', ['Instant confirmation', 'Flexible dates']);
                drawPolicySection('Payment Policy', ['Pay in instalments', 'Zero cost EMI']);
                drawPolicySection('Cancellation Policy', ['Free cancellation up to 7 days']);
            }

            // FAQs
            if (y > pageHeight - 100) {
                pdf.addPage();
                addFooter(5);
                await addLogo();
                y = margin + 20;
            }

            pdf.setFont('times', 'bold');
            pdf.setFontSize(20);
            pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
            pdf.text('Frequently Asked Questions', margin, y);
            y += 15;

            const faqItems = selectedPackage.FAQ_Items || [
                { question: 'What is the best time to visit?', answer: 'The dry season is best.' },
                { question: 'Do I need a visa?', answer: 'Please check with your embassy.' }
            ];

            for (const faq of faqItems) {
                if (y > pageHeight - 30) {
                    pdf.addPage();
                    addFooter(5);
                    await addLogo();
                    y = margin + 20;
                }

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(11);
                pdf.setTextColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]);
                pdf.text(`Q: ${faq.question}`, margin, y);
                y += 6;

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.setTextColor(60, 60, 60);
                const answerLines = pdf.splitTextToSize(`A: ${faq.answer}`, pageWidth - (margin * 2));
                pdf.text(answerLines, margin, y);
                y += (answerLines.length * 5) + 8;
            }

            // --- FINAL PAGE CTA ---
            y += 15;
            if (y > pageHeight - 40) {
                pdf.addPage();
                addFooter(5);
                await addLogo();
                y = margin + 25;
            }

            // Add CTA Buttons at the end
            const btnW = 50;
            const btnH = 12;
            const gap = 10;
            const startX = (pageWidth - (btnW * 2 + gap)) / 2;

            // WhatsApp Button
            pdf.setFillColor(37, 211, 102); // WhatsApp Green
            pdf.roundedRect(startX, y, btnW, btnH, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('WhatsApp Us', startX + (btnW / 2), y + 8, { align: 'center' });

            const waLink = `https://wa.me/919929962350?text=${encodeURIComponent(`Hi, here is the custom itinerary for ${formData.clientName}. Let's discuss!`)}`;
            pdf.link(startX, y, btnW, btnH, { url: waLink });

            // Call Button
            pdf.setFillColor(COLOR_INK[0], COLOR_INK[1], COLOR_INK[2]); // Dark
            pdf.roundedRect(startX + btnW + gap, y, btnW, btnH, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.text('Call Us', startX + btnW + gap + (btnW / 2), y + 8, { align: 'center' });
            pdf.link(startX + btnW + gap, y, btnW, btnH, { url: 'tel:+919929962350' });

            pdf.save(`${formData.clientName.replace(/\s+/g, '_')}_Itinerary.pdf`);

            // Save customer itinerary record to Firestore for CRM
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
            console.error("PDF Generation Error", error);
            alert("Failed to generate PDF");
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
