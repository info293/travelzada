
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import path from 'path'
import fs from 'fs'

// Load env
const envLocalPath = path.resolve(__dirname, '../.env.local')
const envPath = path.resolve(__dirname, '../.env')

function loadEnvFile(filePath: string) {
    try {
        if (fs.existsSync(filePath)) {
            const envConfig = fs.readFileSync(filePath, 'utf8')
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=')
                if (key && value) {
                    process.env[key.trim()] = value.trim()
                }
            })
            console.log(`✅ Loaded env from ${filePath}`)
            return true
        }
    } catch (e) {
        console.error(`⚠️ Error loading ${filePath}:`, e)
    }
    return false
}

if (!loadEnvFile(envLocalPath)) {
    if (!loadEnvFile(envPath)) {
        console.warn("⚠️ No .env or .env.local found!")
    }
}


const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Fallback if env vars not loaded (using public config from init-firestore.ts as reference)
if (!firebaseConfig.apiKey) {
    console.log("⚠️ .env.local not loaded or missing keys. Using hardcoded config (NOT RECOMMENDED for production).")
    firebaseConfig.apiKey = "AIzaSyDFMs2l-0OlMBAJS-XjcXM9oHX3uRNRE5E"
    firebaseConfig.authDomain = "travelzada.firebaseapp.com"
    firebaseConfig.projectId = "travelzada"
    firebaseConfig.storageBucket = "travelzada.firebasestorage.app"
    firebaseConfig.messagingSenderId = "941629695254"
    firebaseConfig.appId = "1:941629695254:web:df7fd6f7ed6d14eb14dc37"
    firebaseConfig.measurementId = "G-5JQNQ4BRCJ"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const LOG_FILE = path.resolve(__dirname, '../reindex_log.txt')
function log(msg: string) {
    console.log(msg)
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n')
    } catch (e) { }
}

// Clear log
try { fs.writeFileSync(LOG_FILE, '') } catch (e) { }

async function reindexPinecone() {
    // Dynamically import libraries AFTER env vars are loaded
    const { generateEmbedding } = await import('../lib/embeddings')
    const { upsertPackage, deleteAllVectors } = await import('../lib/pinecone')

    try {
        log('🔄 Starting full re-index of Pinecone...')

        // 1. Fetch all packages from Firestore
        log('📡 Fetching packages from Firestore...')
        const packagesRef = collection(db, 'packages')
        const snapshot = await getDocs(packagesRef)

        if (snapshot.empty) {
            log('❌ No packages found in Firestore!')
            return
        }

        const packages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        log(`✅ Found ${packages.length} packages.`)

        // 2. Clear existing Pinecone index (optional but recommended for clean slate)
        log('🗑️ Clearing existing Pinecone index...')
        try {
            await deleteAllVectors()
            log('✅ Index cleared.')
        } catch (e) {
            log(`⚠️ Could not clear index (might be empty or connection error): ${e}`)
        }

        // 3. Process each package
        log('🧠 Generating embeddings and upserting...')

        let successCount = 0
        let failCount = 0

        for (const pkg of packages) {
            try {
                const pkgAny = pkg as any

                // Construct text for embedding
                // We include important fields to ensure semantic search works well
                const textToEmbed = `
                Trip to ${pkgAny.Destination_Name}
                Duration: ${pkgAny.Duration}
                Type: ${pkgAny.Travel_Type}
                Overview: ${pkgAny.Overview}
                Highlights: ${Array.isArray(pkgAny.Highlights) ? pkgAny.Highlights.join(', ') : pkgAny.Highlights}
                Inclusions: ${Array.isArray(pkgAny.Inclusions) ? pkgAny.Inclusions.join(', ') : pkgAny.Inclusions}
                Theme: ${pkgAny.Theme} ${pkgAny.Mood}
            `.trim().replace(/\s+/g, ' ')

                const embedding = await generateEmbedding(textToEmbed)

                if (!embedding) {
                    log(`⚠️ Failed to generate embedding for ${pkgAny.Destination_Name} (${pkgAny.id})`)
                    failCount++
                    continue
                }

                // Upsert to Pinecone
                // formatting happens securely inside lib/pinecone.ts which we already updated!
                await upsertPackage(pkgAny, embedding)

                successCount++
                if (successCount % 5 === 0) log(`Processed ${successCount} packages...`)

            } catch (error) {
                log(`\n❌ Error processing ${pkg.id}: ${error}`)
                failCount++
            }
        }

        log(`\n\n✨ Re-indexing complete!`)
        log(`✅ Successfully indexed: ${successCount}`)
        log(`❌ Failed: ${failCount}`)

    } catch (error) {
        log(`🔥 Critical error during re-indexing: ${error}`)
    }
}

// Run the script
reindexPinecone()
