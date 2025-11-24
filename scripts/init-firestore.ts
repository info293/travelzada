/**
 * Script to initialize Firestore with packages from destination_package.json
 * Run this with: npx ts-node scripts/init-firestore.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import destinationPackages from '../data/destination_package.json'

const firebaseConfig = {
  apiKey: "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E",
  authDomain: "travelzada.firebaseapp.com",
  projectId: "travelzada",
  storageBucket: "travelzada.firebasestorage.app",
  messagingSenderId: "941629695254",
  appId: "1:941629695254:web:df7fd6f7ed6d14eb14dc37",
  measurementId: "G-5JQNQ4BRCJ"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function initFirestore() {
  try {
    console.log('Initializing Firestore with packages...')
    
    // Check if packages already exist
    const packagesRef = collection(db, 'packages')
    const snapshot = await getDocs(packagesRef)
    
    if (snapshot.size > 0) {
      console.log(`Found ${snapshot.size} existing packages. Skipping initialization.`)
      console.log('To re-initialize, delete all packages from Firestore first.')
      return
    }

    // Add all packages
    for (const pkg of destinationPackages as any[]) {
      const packageData = {
        ...(pkg as Record<string, any>),
        Last_Updated: new Date().toISOString().split('T')[0],
        Created_By: 'System Import',
      }
      
      await addDoc(packagesRef, packageData)
      console.log(`Added package: ${(pkg as any).Destination_ID}`)
    }

    console.log(`Successfully imported ${destinationPackages.length} packages to Firestore!`)
  } catch (error) {
    console.error('Error initializing Firestore:', error)
  }
}

initFirestore()

