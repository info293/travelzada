import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import OccasionSectionClient from './OccasionSectionClient'

interface FirestorePackage {
    id?: string
    Destination_Name: string
    Duration: string
    Price_Range_INR: string | number
    Primary_Image_URL: string
    Star_Category?: string
    Travel_Type?: string
    Destination_ID?: string
    Occasion?: string
}

export default async function DynamicOccasionRails() {
    const groups: Record<string, FirestorePackage[]> = {}

    try {
        const packagesRef = collection(db, 'packages')
        const allPackagesSnapshot = await getDocs(packagesRef)

        allPackagesSnapshot.forEach((doc) => {
            const data = doc.data() as FirestorePackage
            const pkg = { id: doc.id, ...data }

            if (data.Occasion) {
                const occasions = data.Occasion.split(',').map(o => o.trim())
                occasions.forEach(occ => {
                    if (!occ) return
                    const normalizedOccasion = occ.charAt(0).toUpperCase() + occ.slice(1).toLowerCase()
                    if (!groups[normalizedOccasion]) {
                        groups[normalizedOccasion] = []
                    }
                    // Check for duplicates
                    if (!groups[normalizedOccasion].some(p => p.id === pkg.id)) {
                        groups[normalizedOccasion].push(pkg)
                    }
                })
            }
        })
    } catch (error) {
        console.error('Error fetching occasion packages:', error)
    }

    const occasions = Object.keys(groups).sort()

    if (occasions.length === 0) return null

    return (
        <>
            {occasions.map((occasion, index) => (
                <OccasionSectionClient
                    key={occasion}
                    occasion={occasion}
                    packages={groups[occasion]}
                    index={index}
                />
            ))}
        </>
    )
}
