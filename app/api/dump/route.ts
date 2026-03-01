import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
    try {
        const destSnap = await getDocs(collection(db, 'destinations'));
        const destinations = destSnap.docs.map(d => ({
            id: d.id,
            slug: d.data().slug,
            name: d.data().name,
            packageIds: d.data().packageIds
        }));

        const packSnap = await getDocs(collection(db, 'packages'));
        const packages = packSnap.docs.map(d => ({
            id: d.id,
            Destination_ID: d.data().Destination_ID,
            Destination_Name: d.data().Destination_Name,
            Slug: d.data().Slug
        }));

        return NextResponse.json({
            status: 'success',
            destinationsCount: destinations.length,
            packagesCount: packages.length,
            destinations: destinations,
            packagesSample: packages.slice(0, 5),
            bakuPackages: packages.filter(p => p.Destination_Name?.toLowerCase().includes('baku') || p.Destination_ID?.toLowerCase().includes('baku'))
        });
    } catch (e: any) {
        return NextResponse.json({ status: 'error', error: e.message });
    }
}
