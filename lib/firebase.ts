// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E",
  authDomain: "travelzada.firebaseapp.com",
  projectId: "travelzada",
  storageBucket: "travelzada.firebasestorage.app",
  messagingSenderId: "941629695254",
  appId: "1:941629695254:web:df7fd6f7ed6d14eb14dc37",
  measurementId: "G-5JQNQ4BRCJ"
}

// Initialize Firebase app (this is safe for SSR)
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0]

// Initialize Auth (this is also SSR-safe)
const auth: Auth = getAuth(app)

// Initialize Firestore (this is also SSR-safe)
const db: Firestore = getFirestore(app)

// Analytics - browser only, initialized lazily
let analytics: Analytics | null = null

// Helper to get analytics safely
const getAnalyticsSafe = async (): Promise<Analytics | null> => {
  if (typeof window === 'undefined') return null
  if (analytics) return analytics

  const supported = await isSupported()
  if (supported) {
    analytics = getAnalytics(app)
  }
  return analytics
}

export { app, analytics, auth, db, getAnalyticsSafe }
