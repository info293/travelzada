import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
export const app = initializeApp({
  apiKey: "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E",
  authDomain: "travelzada.firebaseapp.com",
  projectId: "travelzada",
  storageBucket: "travelzada.firebasestorage.app",
  messagingSenderId: "941629695254",
  appId: "1:941629695254:web:df7fd6f7ed6d14eb14dc37",
})
export const db = getFirestore(app)
