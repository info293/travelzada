import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import DestinationRailClient from './DestinationRailClient'

interface Destination {
    id: string
    name: string
    description: string
    image: string
    region?: string
    slug: string
}

interface DestinationRailProps {
    region: 'India' | 'International'
    title: string
    subtitle?: string
    tagLabel?: string
}

export default async function DestinationRail({ region, title, subtitle, tagLabel }: DestinationRailProps) {
    let destinations: Destination[] = []

    try {
        const destRef = collection(db, 'destinations')
        const q = query(destRef)
        const snapshot = await getDocs(q)

        snapshot.forEach(doc => {
            const data = doc.data() as Destination
            if (data.region === region) {
                destinations.push({ ...data, id: doc.id })
            }
        })
    } catch (error) {
        console.error('Error fetching destinations:', error)
    }

    if (destinations.length === 0) return null

    return (
        <DestinationRailClient
            title={title}
            subtitle={subtitle}
            tagLabel={tagLabel}
            destinations={destinations}
        />
    )
}
