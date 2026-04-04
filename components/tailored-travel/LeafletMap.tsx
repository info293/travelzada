'use client'

import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState, useRef, useMemo } from 'react'

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
    iconUrl: '/images/marker-icon.png', // We'll need to use default or custom
    iconRetinaUrl: '/images/marker-icon-2x.png',
    shadowUrl: '/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Create a custom pulsing dot icon for our theme
const customDotIcon = L.divIcon({
    className: 'custom-map-marker',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute inset-0 bg-primary rounded-full animate-ping opacity-70"></div>
            <div class="relative w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md z-10"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
})

// Create a premium sleek Day marker icon
const createNumberedIcon = (numStr: string, isBase: boolean = false) => {
    return L.divIcon({
        className: 'custom-map-marker',
        html: `
            <div class="relative flex flex-col items-center justify-center transition-transform duration-300 hover:scale-[1.15] hover:-translate-y-1 pb-2 group">
                <div class="bg-white/95 backdrop-blur-md rounded-[12px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-gray-100 flex items-center justify-center cursor-pointer px-3 py-1.5 min-w-[64px] gap-2">
                    <span class="w-1.5 h-1.5 rounded-full ${isBase ? 'bg-indigo-500' : 'bg-[#ff8a3d]'} shadow-sm"></span>
                    <span class="text-gray-900 font-bold text-[11px] uppercase tracking-wider">${isBase ? 'Base' : 'Day ' + numStr}</span>
                </div>
                <!-- Sleek drop arrow -->
                <div class="absolute bottom-[2px] w-3.5 h-3.5 bg-white/95 rotate-45 z-0 border-r border-b border-gray-100 shadow-[2px_2px_4px_rgba(0,0,0,0.04)]"></div>
            </div>
        `,
        iconSize: [80, 48],
        iconAnchor: [40, 48],
        popupAnchor: [0, -48],
    })
}

// User Location icon (Green pulse)
const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
        <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-70"></div>
            <div class="relative w-4 h-4 bg-white border-2 border-green-500 rounded-full shadow-md z-10"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
})

// Auto-bounds hook to adjust map view when points change
function MapBounds({ positions, focusZoom = 6 }: { positions: [number, number][], focusZoom?: number }) {
    const map = useMap()

    // Fix for Leaflet tile rendering issues when resizing or rendering in mobile flexbox containers
    useEffect(() => {
        const timeout = setTimeout(() => {
            map.invalidateSize()
        }, 400)
        return () => clearTimeout(timeout)
    }, [map])

    // Stabilize positions to prevent map bounce on every render
    const stablePositions = useMemo(() => JSON.stringify(positions), [positions])

    useEffect(() => {
        const parsedPositions = JSON.parse(stablePositions) as [number, number][]
        if (parsedPositions.length > 0) {
            const bounds = L.latLngBounds(parsedPositions)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: focusZoom })
        } else {
            // Default center if no points
            map.setView([20, 0], 2)
        }
    }, [stablePositions, map, focusZoom])

    return null
}

// Performant Animated Airplane Marker that travels along the route
function AirplaneMarker({ routePath }: { routePath: [number, number][] }) {
    const markerRef = useRef<L.Marker>(null)

    // Set up the static airplane icon once
    const airplaneIcon = useMemo(() => {
        return L.divIcon({
            className: 'airplane-marker-container clear-background',
            html: `
            <div class="airplane-ik-inner" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); transition: transform 0.1s linear;">
                <svg viewBox="0 0 24 24" fill="#6366f1" stroke="white" stroke-width="1.5" style="width: 32px; height: 32px;">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        })
    }, [])

    // Ensure animation doesn't reset due to parent re-renders passing new array refs
    const stableRoutePathStr = useMemo(() => JSON.stringify(routePath), [routePath])

    useEffect(() => {
        const path = JSON.parse(stableRoutePathStr) as [number, number][];
        if (path.length < 2) return

        let animationFrameId: number;
        let startTimestamp: number | null = null;

        // Settings
        const durationPerSegment = 3000; // ms to travel between each stop
        const totalDuration = (path.length - 1) * durationPerSegment;

        const animate = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;

            // Loop progress with a tiny pause at the end
            const loopTime = totalDuration + 1500;
            const currentLoopElapsed = elapsed % loopTime;

            if (currentLoopElapsed > totalDuration) {
                // We are in the pause phase, jump to exact end
                if (markerRef.current) {
                    markerRef.current.setLatLng(path[path.length - 1]);
                }
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            const progress = currentLoopElapsed / totalDuration; // 0.0 to 1.0

            const currentSegmentFloat = progress * (path.length - 1);
            const currentSegment = Math.floor(currentSegmentFloat);
            const segmentProgress = currentSegmentFloat - currentSegment;

            const startPoint = path[currentSegment];
            const endPoint = path[currentSegment + 1];

            if (startPoint && endPoint && markerRef.current) {
                // Interpolate position
                const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
                const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;

                // Calculate Rotation Angle
                const dy = endPoint[0] - startPoint[0];
                const dx = (endPoint[1] - startPoint[1]) * Math.cos(startPoint[0] * Math.PI / 180);
                const angle = Math.atan2(dx, dy) * (180 / Math.PI);

                // Extremely fast imperative update bypassing React's render cycle
                markerRef.current.setLatLng([lat, lng]);

                const innerEl = markerRef.current.getElement()?.querySelector('.airplane-ik-inner') as HTMLElement;
                if (innerEl) {
                    innerEl.style.transform = `rotate(${angle}deg)`;
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [stableRoutePathStr])

    if (routePath.length < 2) return null;

    return <Marker ref={markerRef} position={routePath[0]} icon={airplaneIcon} zIndexOffset={1000} />
}

// Premium Animated Car Marker — luxury card style with glow
function CarMarker({ routePath }: { routePath: [number, number][] }) {
    const markerRef = useRef<L.Marker>(null)

    const carIcon = useMemo(() => {
        return L.divIcon({
            className: 'car-marker-container',
            html: `
            <style>
              @keyframes car-glow-pulse {
                0%,100% { box-shadow: 0 0 0 0 rgba(255,138,61,0.5), 0 6px 20px rgba(0,0,0,0.25); }
                50%      { box-shadow: 0 0 0 8px rgba(255,138,61,0), 0 6px 20px rgba(0,0,0,0.25); }
              }
              @keyframes car-shadow-breathe {
                0%,100% { transform: scaleX(1); opacity: 0.25; }
                50%      { transform: scaleX(0.8); opacity: 0.15; }
              }
            </style>
            <div class="car-ik-inner" style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                transition: transform 0.12s linear;
            ">
              <!-- Card -->
              <div style="
                  width: 52px; height: 44px;
                  background: linear-gradient(145deg, #ffffff, #f8f8f8);
                  border-radius: 14px;
                  border: 2px solid rgba(255,138,61,0.4);
                  display: flex; align-items: center; justify-content: center;
                  animation: car-glow-pulse 2s ease-in-out infinite;
                  position: relative;
                  overflow: hidden;
              ">
                <!-- Subtle inner gradient overlay -->
                <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,138,61,0.08) 0%,transparent 60%);border-radius:12px;"></div>
                <!-- Luxury car SVG (top-view) -->
                <svg viewBox="0 0 64 40" style="width:42px;height:28px;" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Car body -->
                  <rect x="4" y="14" width="56" height="16" rx="7" fill="#ff8a3d"/>
                  <!-- Cabin roof -->
                  <rect x="16" y="7" width="30" height="15" rx="6" fill="#ff8a3d"/>
                  <!-- Windshield front -->
                  <path d="M44 8 Q52 10 53 18 L44 18 Z" fill="rgba(255,255,255,0.35)" rx="2"/>
                  <!-- Windshield rear -->
                  <path d="M18 8 Q10 10 10 18 L18 18 Z" fill="rgba(255,255,255,0.25)" rx="2"/>
                  <!-- Roof glass -->
                  <rect x="19" y="9" width="24" height="10" rx="4" fill="rgba(255,255,255,0.22)"/>
                  <!-- Side windows -->
                  <rect x="20" y="10" width="10" height="8" rx="3" fill="rgba(255,255,255,0.18)"/>
                  <rect x="33" y="10" width="10" height="8" rx="3" fill="rgba(255,255,255,0.18)"/>
                  <!-- Front headlights -->
                  <ellipse cx="57" cy="19" rx="3" ry="2.2" fill="#fde68a"/>
                  <ellipse cx="57" cy="25" rx="3" ry="2.2" fill="#fde68a"/>
                  <!-- Rear tail lights -->
                  <ellipse cx="7" cy="19" rx="3" ry="2.2" fill="#fca5a5"/>
                  <ellipse cx="7" cy="25" rx="3" ry="2.2" fill="#fca5a5"/>
                  <!-- Wheels -->
                  <ellipse cx="16" cy="30" rx="5.5" ry="4" fill="#1f2937"/>
                  <ellipse cx="16" cy="30" rx="3" ry="2.5" fill="#6b7280"/>
                  <ellipse cx="48" cy="30" rx="5.5" ry="4" fill="#1f2937"/>
                  <ellipse cx="48" cy="30" rx="3" ry="2.5" fill="#6b7280"/>
                  <ellipse cx="16" cy="14" rx="5.5" ry="4" fill="#1f2937"/>
                  <ellipse cx="16" cy="14" rx="3" ry="2.5" fill="#6b7280"/>
                  <ellipse cx="48" cy="14" rx="5.5" ry="4" fill="#1f2937"/>
                  <ellipse cx="48" cy="14" rx="3" ry="2.5" fill="#6b7280"/>
                </svg>
              </div>
              <!-- Ground shadow -->
              <div style="
                  width:36px; height:6px;
                  background: rgba(0,0,0,0.18);
                  border-radius:50%;
                  margin-top:2px;
                  filter: blur(3px);
                  animation: car-shadow-breathe 2s ease-in-out infinite;
              "></div>
            </div>`,
            iconSize: [52, 56],
            iconAnchor: [26, 56],
        })
    }, [])

    const stableRoutePathStr = useMemo(() => JSON.stringify(routePath), [routePath])

    useEffect(() => {
        const path = JSON.parse(stableRoutePathStr) as [number, number][];
        if (path.length < 2) return

        let animationFrameId: number;
        let startTimestamp: number | null = null;

        // Slower, more elegant pace between itinerary stops
        const durationPerSegment = 3500;
        const totalDuration = (path.length - 1) * durationPerSegment;

        const animate = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;

            const loopTime = totalDuration + 2500;
            const currentLoopElapsed = elapsed % loopTime;

            if (currentLoopElapsed > totalDuration) {
                if (markerRef.current) markerRef.current.setLatLng(path[path.length - 1]);
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            const progress = currentLoopElapsed / totalDuration;
            const currentSegmentFloat = progress * (path.length - 1);
            const currentSegment = Math.floor(currentSegmentFloat);
            // Ease in-out per segment for smoother feel
            const rawT = currentSegmentFloat - currentSegment;
            const segmentProgress = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

            const startPoint = path[currentSegment];
            const endPoint = path[currentSegment + 1];

            if (startPoint && endPoint && markerRef.current) {
                const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
                const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;

                const dy = endPoint[0] - startPoint[0];
                const dx = (endPoint[1] - startPoint[1]) * Math.cos(startPoint[0] * Math.PI / 180);
                const angle = Math.atan2(dx, dy) * (180 / Math.PI);

                markerRef.current.setLatLng([lat, lng]);

                const innerEl = markerRef.current.getElement()?.querySelector('.car-ik-inner') as HTMLElement;
                if (innerEl) innerEl.style.transform = `rotate(${angle}deg)`;
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [stableRoutePathStr])

    if (routePath.length < 2) return null;

    return <Marker ref={markerRef} position={routePath[0]} icon={carIcon} zIndexOffset={1000} />
}

// Premium Circular Package Marker with Image & Pulsing Effect
const createPackageIcon = (imageUrl: string) => {
    return L.divIcon({
        className: 'package-image-marker',
        html: `
            <div class="relative flex flex-col items-center group">
                <!-- Outer Pulse Effect -->
                <div class="absolute -inset-1 bg-primary/30 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <!-- Main Circular Frame -->
                <div class="w-16 h-16 rounded-full border-[3px] border-white shadow-[0_8px_25px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500 group-hover:scale-125 group-hover:-translate-y-2 z-10">
                    <img src="${imageUrl}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onerror="this.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&auto=format'" />
                    
                    <!-- Glassy overlay on hover -->
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                <!-- Sleek Badge Indicator -->
                <div class="absolute -bottom-1.5 bg-gradient-to-r from-primary to-[#ff8a3d] text-white p-1.5 rounded-full shadow-lg border-2 border-white z-20 scale-90 group-hover:scale-100 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                </div>
            </div>
        `,
        iconSize: [64, 72],
        iconAnchor: [32, 72],
        popupAnchor: [0, -72],
    })
}

// Real Hotel Package Marker — uses actual package image from Firestore
const createRealHotelIcon = (imageUrl: string, tier: string) => {
    const config: Record<string, { color: string; label: string; ring: string }> = {
        '5-star': { color: '#f59e0b', label: '5★', ring: 'border-amber-400' },
        '4-star': { color: '#6366f1', label: '4★', ring: 'border-indigo-500' },
        '3-star': { color: '#10b981', label: '3★', ring: 'border-emerald-500' },
    };
    const { color, label } = config[tier] || { color: '#6b7280', label: '★' };

    return L.divIcon({
        className: 'real-hotel-marker',
        html: `
            <div class="relative flex flex-col items-center group cursor-pointer">
                <!-- Photo circle -->
                <div class="w-14 h-14 rounded-full overflow-hidden border-[3px] border-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-all duration-400 group-hover:scale-125 group-hover:-translate-y-2 z-10">
                    <img src="${imageUrl}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop&auto=format'" />
                </div>
                <!-- Star tier badge -->
                <div class="absolute -bottom-1 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md border border-white z-20" style="background:${color}">${label}</div>
            </div>
        `,
        iconSize: [56, 64],
        iconAnchor: [28, 64],
        popupAnchor: [0, -64],
    })
}

interface MapProps {
    mainDestination?: string;
    mainDestinationSubtitle?: string;
    itinerary?: { title: string; day?: string | number }[];
    hideCarAnimation?: boolean;
    userOrigin?: [number, number] | null;
    packages?: any[];
    hotelTypes?: string[];
    currentStep?: number;
}


export default function LeafletMap({
    mainDestination,
    mainDestinationSubtitle,
    itinerary = [],
    hideCarAnimation = false,
    userOrigin,
    packages = [],
    hotelTypes = [],
    currentStep = 1
}: MapProps) {
    const [coordinates, setCoordinates] = useState<{ [key: string]: [number, number] }>({})
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 1. Set User Geolocation
    useEffect(() => {
        if (userOrigin) {
            setUserLocation(userOrigin)
        } else {
            // Default fallback
            setUserLocation([28.6139, 77.2090]);
        }
    }, [userOrigin])

    // 2. Fetch Destination Coordinates
    useEffect(() => {
        const fetchCoordinates = async () => {
            setIsLoading(true)
            let hasChanges = false
            const newCoords: { [key: string]: [number, number] } = { ...coordinates }

            // 2A. Collect all places to geocode
            const placesToGeocode = new Set<string>();
            if (mainDestination && !newCoords[mainDestination]) placesToGeocode.add(mainDestination);
            itinerary.forEach(item => {
                if (item.title && !newCoords[item.title]) placesToGeocode.add(item.title);
            });

            // Add package locations to geocode
            packages.forEach(pkg => {
                if (pkg.location && !newCoords[pkg.location]) placesToGeocode.add(pkg.location);
            });

            if (placesToGeocode.size === 0) {
                setIsLoading(false)
                return
            }

            // AI/Smart Geocoding for efficiency
            try {
                const pendingList = Array.from(placesToGeocode).map(p => ({ title: p }));
                const res = await fetch('/api/tailored-travel/geocode-itinerary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mainDestination: mainDestination || '',
                        itinerary: pendingList
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.coordinates) {
                        for (const [title, coords] of Object.entries(data.coordinates)) {
                            newCoords[title] = coords as [number, number];
                            hasChanges = true;
                        }
                    }
                }
            } catch (e) {
                console.error("Geocoding failed", e);
            }

            if (hasChanges) {
                setCoordinates(newCoords)
            }
            setIsLoading(false)
        }

        fetchCoordinates()
    }, [mainDestination, itinerary, packages, coordinates])

    // 3. Construct Routes
    const mainDestPos = mainDestination ? coordinates[mainDestination] : null;

    const validItineraryPoints = itinerary
        .filter(item => item.title && coordinates[item.title])
        .map(item => ({ ...item, pos: coordinates[item.title] }));

    const flightPath: [number, number][] = [];
    if (userLocation && mainDestPos) {
        flightPath.push(userLocation);
        flightPath.push(mainDestPos);

        if (hideCarAnimation) {
            validItineraryPoints.forEach(pt => {
                const lastPt = flightPath[flightPath.length - 1];
                if (!lastPt || Math.abs(lastPt[0] - pt.pos[0]) > 0.001 || Math.abs(lastPt[1] - pt.pos[1]) > 0.001) {
                    flightPath.push(pt.pos);
                }
            });
        }
    }

    // Ground car route: used on the results page (currentStep=4)
    // Starts at the main destination then visits each itinerary day location in order
    const carRoute: [number, number][] = [];
    if (currentStep === 4 && validItineraryPoints.length >= 1) {
        if (mainDestPos) carRoute.push(mainDestPos);
        validItineraryPoints.forEach(pt => {
            const last = carRoute[carRoute.length - 1];
            // Skip duplicate coords
            if (!last || Math.abs(last[0] - pt.pos[0]) > 0.0001 || Math.abs(last[1] - pt.pos[1]) > 0.0001) {
                carRoute.push(pt.pos);
            }
        });
    }

    // Determine all bounds and focus zoom
    const allPositions: [number, number][] = [];
    let focusZoom = 6;

    if (currentStep === 1) {
        if (userLocation) allPositions.push(userLocation);
        if (mainDestPos) allPositions.push(mainDestPos);
        focusZoom = 5; // Macro view for the start
    } else if (currentStep === 2) {
        if (mainDestPos) allPositions.push(mainDestPos);
        // Focus on packages near the main destination
        packages.forEach(pkg => {
            if (pkg.location && coordinates[pkg.location]) allPositions.push(coordinates[pkg.location]);
        });
        focusZoom = 11; // Slightly zoom out more to see the distribution of packages
    } else if (currentStep === 3) {
        if (mainDestPos) allPositions.push(mainDestPos);
        focusZoom = 11; // Wide enough to see hotel districts spread across the city
    } else {
        if (mainDestPos) allPositions.push(mainDestPos);
        validItineraryPoints.forEach(pt => allPositions.push(pt.pos));
        focusZoom = 13;
    }

    // Step 3: Filter REAL packages from Firebase by the user's selected hotel tier(s)
    const hotelDistrictMarkers = useMemo(() => {
        if (currentStep !== 3 || hotelTypes.length === 0 || packages.length === 0) return [];

        // Normalise a starCategory string to match hotelTypes format (e.g. "4 Star" -> "4-star")
        const normalise = (s: string) =>
            s.toLowerCase().replace(/\s+/g, '-').replace('star', 'star').trim();

        // Filter packages whose starCategory matches any selected hotelType
        // Also deduplicate by location key
        const seenLocations = new Set<string>();
        return packages.filter(pkg => {
            const cat = normalise(pkg.starCategory || '');
            return hotelTypes.some(ht => cat.includes(ht.replace('-star', '')) || cat === ht);
        }).filter(pkg => {
            const key = (pkg.location || '').trim().toLowerCase();
            if (!key || seenLocations.has(key)) return false;
            seenLocations.add(key);
            return true;
        });
    }, [currentStep, packages, hotelTypes]);

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-inner relative z-0">
            {isLoading && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white z-[1000] border border-white/20 flex items-center gap-2 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Updating Map...
                </div>
            )}

            {/* Step 3: Hotel Zone Legend Overlay */}
            {currentStep === 3 && hotelTypes.length > 0 && (
                <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-3 pointer-events-none">
                    <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-2">Hotel Zones</div>
                    <div className="flex flex-col gap-1.5">
                        {hotelTypes.includes('5-star') && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm flex-shrink-0"></div>
                                <span className="text-[11px] font-bold text-amber-700">5★ Luxury Zones</span>
                            </div>
                        )}
                        {hotelTypes.includes('4-star') && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm flex-shrink-0"></div>
                                <span className="text-[11px] font-bold text-indigo-700">4★ Premium Zones</span>
                            </div>
                        )}
                        {hotelTypes.includes('3-star') && (
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm flex-shrink-0"></div>
                                <span className="text-[11px] font-bold text-emerald-700">3★ Comfort Zones</span>
                            </div>
                        )}
                    </div>
                    <div className="text-[9px] text-gray-300 font-medium mt-2 pt-2 border-t border-gray-100">Click a zone to see details</div>
                </div>
            )}

            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%', background: '#111827' }}
                zoomControl={true}
                attributionControl={false}
                scrollWheelZoom={true}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBounds positions={allPositions} focusZoom={focusZoom} />

                {flightPath.length > 1 && (
                    <Polyline
                        positions={flightPath}
                        pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
                    />
                )}

                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup className="custom-popup">
                            <div className="font-bold text-gray-900">Your Location</div>
                        </Popup>
                    </Marker>
                )}

                {mainDestPos && (
                    <Marker position={mainDestPos} icon={createNumberedIcon("★", true)}>
                        <Popup className="custom-popup" closeButton={false}>
                            <div className="tooltip-card p-2 text-center">
                                <div className="font-bold text-gray-900">{mainDestination}</div>
                                <div className="text-xs text-gray-600 font-medium mt-1">{mainDestinationSubtitle || "Base Destination"}</div>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Step 2: Show Packages with High-End Radial Distribution */}
                {currentStep === 2 && packages.map((pkg, idx) => {
                    const basePos = pkg.location ? coordinates[pkg.location] : null;
                    if (!basePos) return null;

                    // Fancy Radial Distribution: Spread markers in a circle if they share the same base location
                    const angle = (idx * (360 / Math.max(packages.length, 1))) * (Math.PI / 180);
                    const radius = 0.025; 
                    const jitterLat = Math.sin(angle) * radius;
                    const jitterLng = Math.cos(angle) * radius / Math.cos(basePos[0] * Math.PI / 180);
                    const pos: [number, number] = [basePos[0] + jitterLat, basePos[1] + jitterLng];

                    return (
                        <Marker 
                            key={`pkg-${idx}`} 
                            position={pos} 
                            icon={createPackageIcon(pkg.image)}
                            riseOnHover={true}
                            zIndexOffset={100}
                        >
                            <Popup className="custom-popup" maxWidth={280}>
                                <div className="group/pop p-0 overflow-hidden rounded-xl bg-white shadow-2xl">
                                    <div className="relative w-full h-32 overflow-hidden">
                                        <img src={pkg.image} className="w-full h-full object-cover transition-transform duration-700 group-hover/pop:scale-110" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&auto=format' }} />
                                        <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/30 shadow-lg">
                                            LIVE DEAL
                                        </div>
                                    </div>
                                    <div className="p-3.5">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <div className="flex -space-x-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <svg key={s} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Selection</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 leading-tight text-sm mb-3 group-hover/pop:text-primary transition-colors cursor-pointer">{pkg.name}</h4>
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                                <span className="text-[11px] font-semibold">{pkg.location}</span>
                                            </div>
                                            <button className="text-[11px] font-black text-primary hover:text-primary/80 transition-colors">EXPLORE →</button>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Step 3: Real Packages filtered by Hotel Tier */}
                {currentStep === 3 && hotelDistrictMarkers.map((pkg: any, idx: number) => {
                    const basePos = pkg.location ? coordinates[pkg.location] : null;
                    if (!basePos) return null;

                    // Radial spread so markers at the same base location don't overlap
                    const angle = (idx * (360 / Math.max(hotelDistrictMarkers.length, 1))) * (Math.PI / 180);
                    const radius = 0.022;
                    const jLat = Math.sin(angle) * radius;
                    const jLng = Math.cos(angle) * radius / Math.cos(basePos[0] * Math.PI / 180);
                    const pos: [number, number] = [basePos[0] + jLat, basePos[1] + jLng];

                    const tier = (pkg.starCategory || '').toLowerCase().replace(/\s+/g, '-');
                    const tierColor = tier.includes('5') ? '#f59e0b' : tier.includes('4') ? '#6366f1' : '#10b981';
                    const tierLabel = tier.includes('5') ? '5★ Luxury' : tier.includes('4') ? '4★ Premium' : '3★ Comfort';

                    return (
                        <Marker
                            key={`hotel-real-${idx}`}
                            position={pos}
                            icon={createRealHotelIcon(pkg.image, tier)}
                            riseOnHover={true}
                            zIndexOffset={200}
                        >
                            <Popup className="custom-popup" maxWidth={280}>
                                <div className="p-0 overflow-hidden rounded-xl bg-white shadow-2xl">
                                    {/* Package image header */}
                                    <div className="relative w-full h-32 overflow-hidden">
                                        <img
                                            src={pkg.image}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop&auto=format' }}
                                        />
                                        {/* Star tier badge */}
                                        <div className="absolute top-2 right-2 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white/30" style={{ background: tierColor }}>
                                            {tierLabel}
                                        </div>
                                    </div>
                                    <div className="p-3.5">
                                        {/* Package name */}
                                        <h4 className="font-black text-gray-900 text-sm leading-tight mb-1">
                                            {pkg.packageTitle || pkg.name}
                                        </h4>
                                        {/* Location */}
                                        <div className="flex items-center gap-1.5 text-gray-400 mb-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                            <span className="text-[11px] font-semibold">{pkg.location}</span>
                                        </div>
                                        {/* Duration if available */}
                                        {pkg.duration && (
                                            <div className="flex items-center gap-1.5 text-gray-400 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                <span className="text-[11px] font-semibold">{pkg.duration}</span>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4,5].map(s => (
                                                    <svg key={s} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill={tierColor} stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                ))}
                                            </div>
                                            <button className="text-[11px] font-black" style={{ color: tierColor }}>VIEW DEAL →</button>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Itinerary Points (Standard view) */}
                {currentStep !== 2 && currentStep !== 3 && validItineraryPoints.map((item, index) => {
                    const dayNum = item.day ? String(item.day).replace(/[^0-9]/g, '') || `${index + 1}` : `${index + 1}`
                    return (
                        <Marker key={`itinerary-${index}`} position={item.pos} icon={createNumberedIcon(dayNum)}>
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="tooltip-card p-2 text-center">
                                    <div className="font-bold text-gray-900">{item.title}</div>
                                    {item.day && <div className="text-xs text-primary font-bold mt-2">{item.day}</div>}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}

                {flightPath.length > 1 && <AirplaneMarker routePath={flightPath as [number, number][]} />}

                {/* Results page (step 4): premium double-stroke road + animated car */}
                {currentStep === 4 && carRoute.length > 1 && (
                    <>
                        {/* Soft glow underlay */}
                        <Polyline
                            positions={carRoute}
                            pathOptions={{ color: '#ff8a3d', weight: 10, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
                        />
                        {/* Dashed centre line */}
                        <Polyline
                            positions={carRoute}
                            pathOptions={{ color: '#ff8a3d', weight: 2.5, opacity: 0.85, dashArray: '8, 6', lineCap: 'round', lineJoin: 'round' }}
                        />
                    </>
                )}
                {currentStep === 4 && carRoute.length > 1 && (
                    <CarMarker routePath={carRoute} />
                )}
            </MapContainer>
        </div>
    )
}

