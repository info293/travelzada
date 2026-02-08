
// Script to test if lib/firebase.ts throws in Node environment
try {
    // Mock window/navigator typically used by Firebase to fail early if missing
    // But we WANT to see if it fails without them, as Next.js SSR won't have them

    // We need to use dynamic import because it's a module
    import('./lib/firebase.ts').then((module) => {
        console.log('Firebase initialized successfully in Node:', !!module.app);
        if (module.auth) console.log('Auth initialized:', !!module.auth);
        if (module.db) console.log('Firestore initialized:', !!module.db);
    }).catch((err) => {
        console.error('CRITICAL: Firebase initialization FAILED in Node:', err);
    });
} catch (e) {
    console.error('CRITICAL: Immediate Error:', e);
}
