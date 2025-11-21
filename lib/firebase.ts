// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAnalytics, Analytics } from 'firebase/analytics'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E",
  authDomain: "travelzada.firebaseapp.com",
  projectId: "travelzada",
  storageBucket: "travelzada.firebasestorage.app",
  messagingSenderId: "941629695254",
  appId: "1:941629695254:web:df7fd6f7ed6d14eb14dc37",
  measurementId: "G-5JQNQ4BRCJ"
}

// Initialize Firebase - only on client side
let app: FirebaseApp | undefined
let analytics: Analytics | null = null
let auth: Auth | undefined
let db: Firestore | undefined

if (typeof window !== 'undefined') {
  // Only initialize on client side
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    
    // Initialize Analytics only in browser
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app)
    }
  } else {
    app = getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
  }
}

// Export with proper types - these will be undefined on server side
export { app, analytics, auth, db }

