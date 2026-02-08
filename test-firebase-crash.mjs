
// Simulation of lib/firebase.ts in Node
const firebaseConfig = {
    apiKey: "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E",
    authDomain: "travelzada.firebaseapp.com",
    projectId: "travelzada",
    storageBucket: "travelzada.firebasestorage.app",
    messagingSenderId: "941629695254",
    appId: "1:941629695254:web:df7fd6f7ed6d14eb14dc37",
    measurementId: "G-5JQNQ4BRCJ"
};

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

try {
    console.log('Initializing App...');
    const app = initializeApp(firebaseConfig);
    console.log('App Initialized.');

    console.log('Initializing Auth...');
    const auth = getAuth(app); // This is the suspect
    console.log('Auth Initialized.');

    console.log('Initializing Firestore...');
    const db = getFirestore(app);
    console.log('Firestore Initialized.');

    console.log('SUCCESS: Firebase verified in Node environment.');
} catch (error) {
    console.error('FAILURE: Firebase initialization crashed:', error);
}
