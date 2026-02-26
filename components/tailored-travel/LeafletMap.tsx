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
            <div id="airplane-ik-inner" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); transition: transform 0.1s linear;">
                <svg viewBox="0 0 24 24" fill="#6366f1" stroke="white" stroke-width="1.5" style="width: 32px; height: 32px;">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        })
    }, [])

    useEffect(() => {
        if (routePath.length < 2) return

        let animationFrameId: number;
        let startTimestamp: number | null = null;

        // Settings
        const durationPerSegment = 2500; // ms to travel between each stop
        const totalDuration = (routePath.length - 1) * durationPerSegment;

        const animate = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const elapsed = timestamp - startTimestamp;

            // Loop progress with a tiny pause at the end
            const progressLoop = (elapsed % (totalDuration + 1500)) / totalDuration;

            if (progressLoop > 1) {
                // Pause at the end for 1.5 second
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            const currentSegmentFloat = progressLoop * (routePath.length - 1);
            const currentSegment = Math.floor(currentSegmentFloat);
            const segmentProgress = currentSegmentFloat - currentSegment;

            const startPoint = routePath[currentSegment];
            const endPoint = routePath[currentSegment + 1];

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

                const innerEl = markerRef.current.getElement()?.querySelector('#airplane-ik-inner') as HTMLElement;
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
    }, [routePath])

    if (routePath.length < 2) return null;

    return <Marker ref={markerRef} position={routePath[0]} icon={airplaneIcon} zIndexOffset={1000} />
}

export default function LeafletMap({ routeItems }: { routeItems: any[] }) {
    const [coordinates, setCoordinates] = useState<{ [key: string]: [number, number] }>({})
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 1. Fetch User Geolocation
    useEffect(() => {
        if (typeof window !== 'undefined' && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.log("Geolocation error or denied:", error.message);
                    // Fallback to a default starting point if denied (e.g., somewhere central)
                }
            );
        }
    }, [])

    // 2. Fetch Destination Coordinates
    useEffect(() => {
        const fetchCoordinates = async () => {
            if (routeItems.length === 0) return

            let hasChanges = false
            const newCoords: { [key: string]: [number, number] } = { ...coordinates }

            for (const item of routeItems) {
                if (newCoords[item.destination] || !item.destination.trim()) continue;

                setIsLoading(true)
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(item.destination)}&limit=1`)
                    const data = await res.json()
                    if (data && data.length > 0) {
                        newCoords[item.destination] = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
                        hasChanges = true
                    }
                } catch (e) {
                    console.error("Failed to geocode:", item.destination)
                }
            }

            if (hasChanges) {
                setCoordinates(newCoords)
            }
            setIsLoading(false)
        }

        fetchCoordinates()
    }, [routeItems, coordinates])

    // 3. Construct Route
    const validDestinations = routeItems
        .filter(item => coordinates[item.destination])
        .map(item => coordinates[item.destination])

    const fullRoutePath = userLocation ? [userLocation, ...validDestinations] : validDestinations;

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-inner relative z-0">
            {isLoading && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white z-[1000] border border-white/20 flex items-center gap-2 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    Locating...
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

                <MapBounds positions={fullRoutePath} />

                {/* The Path Line */}
                {fullRoutePath.length > 1 && (
                    <Polyline
                        positions={fullRoutePath}
                        pathOptions={{ color: '#6366f1', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
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

                {/* Destination Markers */}
                {routeItems.map((item, index) => {
                    const pos = coordinates[item.destination]
                    if (!pos) return null

                    return (
                        <Marker key={index} position={pos} icon={customDotIcon}>
                            <Popup className="custom-popup">
                                <div className="font-bold text-gray-900">{item.destination}</div>
                                {item.nights > 0 && (
                                    <div className="text-sm text-gray-600">{item.nights} Nights</div>
                                )}
                            </Popup>
                        </Marker>
                    )
                })}

                {/* Animated Airplane */}
                {fullRoutePath.length > 1 && (
                    <AirplaneMarker routePath={fullRoutePath as [number, number][]} />
                )}

            </MapContainer>
        </div>
    )
}
