import { doc, getDocs, collection } from 'firebase/firestore'
import { db } from './lib/firebase' // Using local import path from root

async function dump() {
    try {
        console.log('Fetching destinations...')
        const destSnap = await getDocs(collection(db, 'destinations'))
        console.log(`Found ${destSnap.size} destinations`)
        destSnap.docs.slice(0, 3).forEach(d => {
            console.log('\nDESTINATION:', d.id)
            const data = d.data()
            console.log('- slug:', data.slug)
            console.log('- name:', data.name)
            console.log('- packageIds:', data.packageIds)
        })

        console.log('\nFetching packages...')
        const packSnap = await getDocs(collection(db, 'packages'))
        console.log(`Found ${packSnap.size} packages`)
        packSnap.docs.slice(0, 3).forEach(d => {
            console.log('\nPACKAGE:', d.id)
            const data = d.data()
            console.log('- Destination_ID:', data.Destination_ID)
            console.log('- Destination_Name:', data.Destination_Name)
            console.log('- Slug:', data.Slug)
        })

        console.log('\nChecking Baku packages specifically...')
        packSnap.docs.filter(d => {
            const data = d.data()
            return data.Destination_Name?.toLowerCase().includes('baku') || data.Destination_ID?.toLowerCase().includes('baku')
        }).forEach(d => {
            console.log('\nBAKU PACKAGE:', d.id)
            console.log('- Destination_ID:', d.data().Destination_ID)
            console.log('- Destination_Name:', d.data().Destination_Name)
            console.log('- Slug:', d.data().Slug)
        })

        process.exit(0)
    } catch (err) {
        console.error('Error:', err)
        process.exit(1)
    }
}

dump()
