'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
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
function MapBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap()

    useEffect(() => {
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
        } else {
            // Default center if no points
            map.setView([20, 0], 2)
        }
    }, [positions, map])

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

// Performant Animated Car Marker that travels along the itinerary route
function CarMarker({ routePath }: { routePath: [number, number][] }) {
    const markerRef = useRef<L.Marker>(null)

    // Set up the static car icon once
    const carIcon = useMemo(() => {
        return L.divIcon({
            className: 'car-marker-container clear-background',
            html: `
            <div class="car-ik-inner" style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transition: transform 0.1s linear;">
                <svg viewBox="0 0 24 24" fill="#eab308" stroke="white" stroke-width="1.5" style="width: 28px; height: 28px;">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                    <circle cx="7" cy="17" r="2.5"/><circle cx="16" cy="17" r="2.5"/>
                </svg>
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
        })
    }, [])

    const stableRoutePathStr = useMemo(() => JSON.stringify(routePath), [routePath])

    useEffect(() => {
        const path = JSON.parse(stableRoutePathStr) as [number, number][];
        if (path.length < 2) return

        let animationFrameId: number;
        let startTimestamp: number | null = null;

        // Settings for the car
        const durationPerSegment = 2000; // ms to travel between each itinerary stop
        const totalDuration = (path.length - 1) * durationPerSegment;

        const animate = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;

            // Loop progress with a tiny pause at the end
            const loopTime = totalDuration + 2000;
            const currentLoopElapsed = elapsed % loopTime;

            if (currentLoopElapsed > totalDuration) {
                // Pause at the end for 2 seconds
                if (markerRef.current) {
                    markerRef.current.setLatLng(path[path.length - 1]);
                }
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            const progress = currentLoopElapsed / totalDuration;

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

                const innerEl = markerRef.current.getElement()?.querySelector('.car-ik-inner') as HTMLElement;
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

    return <Marker ref={markerRef} position={routePath[0]} icon={carIcon} zIndexOffset={1000} />
}

interface MapProps {
    mainDestination?: string;
    itinerary?: { title: string; day?: string }[];
    hideCarAnimation?: boolean;
}

export default function LeafletMap({ mainDestination, itinerary = [], hideCarAnimation = false }: MapProps) {
    const [coordinates, setCoordinates] = useState<{ [key: string]: [number, number] }>({})
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 1. Fetch User Geolocation with fallback
    useEffect(() => {
        let mounted = true;
        // Default fallback (e.g., New Delhi, India)
        const fallbackLocation: [number, number] = [28.6139, 77.2090];

        if (typeof window !== 'undefined' && "geolocation" in navigator) {
            // Set a timeout to use fallback if user ignores prompt
            const timer = setTimeout(() => {
                if (mounted && !userLocation) {
                    setUserLocation(fallbackLocation);
                }
            }, 6000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (mounted) {
                        clearTimeout(timer);
                        setUserLocation([position.coords.latitude, position.coords.longitude]);
                    }
                },
                (error) => {
                    console.log("Geolocation error or denied:", error.message);
                    if (mounted) setUserLocation(fallbackLocation);
                },
                { timeout: 5000 }
            );

            return () => { mounted = false; clearTimeout(timer); };
        } else {
            setUserLocation(fallbackLocation);
        }
    }, [userLocation])

    // 2. Fetch Destination Coordinates
    useEffect(() => {
        const fetchCoordinates = async () => {
            const placesToGeocode = new Set<string>();
            if (mainDestination) placesToGeocode.add(mainDestination);
            itinerary.forEach(item => {
                if (item.title) placesToGeocode.add(item.title);
            });

            if (placesToGeocode.size === 0) return

            let hasChanges = false
            const newCoords: { [key: string]: [number, number] } = { ...coordinates }

            for (const place of Array.from(placesToGeocode)) {
                if (newCoords[place] || !place.trim()) continue;

                setIsLoading(true)
                try {
                    // Smart Query: Append main destination to itinerary items to ensure accurate geocoding
                    let searchQuery = place;
                    if (
                        mainDestination &&
                        place.toLowerCase() !== mainDestination.toLowerCase() &&
                        !place.toLowerCase().includes(mainDestination.toLowerCase())
                    ) {
                        searchQuery = `${place}, ${mainDestination}`;
                    }

                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&email=hello@travelzada.com`, {
                        headers: {
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data && data.length > 0) {
                            newCoords[place] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
                            hasChanges = true
                        } else if (searchQuery !== place) {
                            // Fallback if the combined query fails
                            const resFallback = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1&email=hello@travelzada.com`)
                            if (resFallback.ok) {
                                const dataFallback = await resFallback.json()
                                if (dataFallback && dataFallback.length > 0) {
                                    newCoords[place] = [parseFloat(dataFallback[0].lat), parseFloat(dataFallback[0].lon)]
                                    hasChanges = true
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to geocode:", place)
                }

                // Ultimate Fallback for common demo queries if Nominatim API blocks/fails us
                if (!newCoords[place]) {
                    const fallbackMap: { [key: string]: [number, number] } = {
                        'bali': [-8.409518, 115.188919],
                        'thailand': [15.870032, 100.992541],
                        'dubai': [25.2048, 55.2708],
                        'paris': [48.8566, 2.3522],
                        'london': [51.5074, -0.1278],
                        'tokyo': [35.6762, 139.6503],
                        'new york': [40.7128, -74.0060],
                        'maldives': [3.2028, 73.2207],
                        'switzerland': [46.8182, 8.2275],
                        'singapore': [1.3521, 103.8198]
                    }

                    const lowerPlace = place.toLowerCase().trim()
                    // Try exact match or substring match
                    for (const [key, coords] of Object.entries(fallbackMap)) {
                        if (lowerPlace.includes(key)) {
                            newCoords[place] = coords
                            hasChanges = true
                            break
                        }
                    }

                    // If still nothing, just give it a random coordinate to not break the UI flow completely
                    if (!newCoords[place]) {
                        // Offset from user location slightly so it's visible, or just hardcode India center
                        newCoords[place] = [20 + Math.random() * 10, 70 + Math.random() * 10]
                        hasChanges = true
                    }
                }
            }

            if (hasChanges) {
                setCoordinates(newCoords)
            }
            setIsLoading(false)
        }

        fetchCoordinates()
    }, [mainDestination, itinerary, coordinates])

    // 3. Construct Routes
    const mainDestPos = mainDestination ? coordinates[mainDestination] : null;

    // Car Path: Main Destination -> Itinerary Point 1 -> Itinerary Point 2...
    const carPath: [number, number][] = mainDestPos ? [mainDestPos] : [];
    const validItineraryPoints = itinerary
        .filter(item => item.title && coordinates[item.title])
        .map(item => ({ ...item, pos: coordinates[item.title] }));

    validItineraryPoints.forEach(pt => {
        // Only add if it's materially different from the previous point to avoid zero-distance errors
        const lastPt = carPath[carPath.length - 1];
        if (!lastPt || Math.abs(lastPt[0] - pt.pos[0]) > 0.001 || Math.abs(lastPt[1] - pt.pos[1]) > 0.001) {
            carPath.push(pt.pos);
        }
    });

    // Flight Path: User Location -> Main Destination (-> all other destinations if in wizard mode)
    const flightPath: [number, number][] = [];
    if (userLocation && mainDestPos) {
        flightPath.push(userLocation);
        flightPath.push(mainDestPos);

        // If we are hiding car animations (meaning we are on the Wizard page showing macro-destinations),
        // we should make the airplane fly between ALL selected destinations.
        if (hideCarAnimation) {
            validItineraryPoints.forEach(pt => {
                const lastPt = flightPath[flightPath.length - 1];
                if (!lastPt || Math.abs(lastPt[0] - pt.pos[0]) > 0.001 || Math.abs(lastPt[1] - pt.pos[1]) > 0.001) {
                    flightPath.push(pt.pos);
                }
            });
        }
    }

    // Determine all bounds
    const allPositions: [number, number][] = [];
    if (userLocation) allPositions.push(userLocation);
    if (mainDestPos) allPositions.push(mainDestPos);
    validItineraryPoints.forEach(pt => allPositions.push(pt.pos));

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-inner relative z-0">
            {isLoading && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white z-[1000] border border-white/20 flex items-center gap-2 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Locating Itinerary...
                </div>
            )}

            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%', background: '#111827' }} // dark gray background initially
                zoomControl={false}
                attributionControl={false}
            >
                {/* Standard colorful OpenStreetMap base map */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBounds positions={allPositions} />

                {/* The Flight Path Line */}
                {flightPath.length > 1 && (
                    <Polyline
                        positions={flightPath}
                        pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
                    />
                )}

                {/* The Car Path Line */}
                {!hideCarAnimation && carPath.length > 1 && (
                    <Polyline
                        positions={carPath}
                        pathOptions={{ color: '#eab308', weight: 4, opacity: 0.9 }}
                    />
                )}

                {/* User Location Marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup className="custom-popup">
                            <div className="font-bold text-gray-900">Your Location</div>
                            <div className="text-sm text-gray-600">Starting point</div>
                        </Popup>
                    </Marker>
                )}

                {/* Main Destination Marker */}
                {mainDestPos && (
                    <Marker position={mainDestPos} icon={customDotIcon}>
                        <Popup className="custom-popup">
                            <div className="font-bold text-gray-900">{mainDestination}</div>
                            <div className="text-sm text-gray-600">Base Destination</div>
                        </Popup>
                    </Marker>
                )}

                {/* Itinerary Destination Markers */}
                {validItineraryPoints.map((item, index) => {
                    return (
                        <Marker key={`itinerary-${index}`} position={item.pos} icon={customDotIcon}>
                            <Popup className="custom-popup">
                                <div className="font-bold text-gray-900">{item.title}</div>
                                {item.day && (
                                    <div className="text-sm text-primary font-bold">{item.day}</div>
                                )}
                            </Popup>
                        </Marker>
                    )
                })}

                {/* Animated Airplane */}
                {flightPath.length > 1 && (
                    <AirplaneMarker routePath={flightPath as [number, number][]} />
                )}

                {/* Animated Car */}
                {!hideCarAnimation && carPath.length > 1 && (
                    <CarMarker routePath={carPath as [number, number][]} />
                )}

            </MapContainer>
        </div>
    )
}
