import path from 'path'
import fs from 'fs'

// FORCE LOGGING TO FILE
const LOG_FILE = path.resolve(__dirname, '../pinecone_debug_log.txt')
function log(msg: string) {
    console.log(msg)
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n')
    } catch (e) { }
}

// Clear log file
try { fs.writeFileSync(LOG_FILE, '') } catch (e) { }

log("🚀 Starting check-pinecone-data.ts")

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
            log(`✅ Loaded env from ${filePath}`)
            return true
        }
    } catch (e) {
        log(`⚠️ Error loading ${filePath}: ${e}`)
    }
    return false
}

if (!loadEnvFile(envLocalPath)) {
    loadEnvFile(envPath)
}

async function checkPinecone() {
    try {
        log("📦 Importing Pinecone lib...")
        const { getIndex } = await import('../lib/pinecone')
        const { generateEmbedding } = await import('../lib/embeddings')

        const index = getIndex()
        const indexName = process.env.PINECONE_INDEX || 'travelzada-packages'
        log(`🌲 Targeting Pinecone Index: ${indexName}`)

        let embedding: number[] = []
        try {
            log("🔍 Generating embedding for 'Bali'...")
            embedding = await generateEmbedding("Bali")
        } catch (e) {
            log(`❌ Embedding generation failed: ${e}`)
            return
        }

        log(`✨ Generated embedding with length: ${embedding.length}`)

        log("✨ Querying index with vector...")

        let results;
        try {
            const queryPromise = index.query({
                vector: embedding,
                topK: 5,
                includeMetadata: true
            })
            const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Query Timeout 15s")), 15000))
            results = await Promise.race([queryPromise, timeoutPromise])
        } catch (e) {
            log(`❌ Query Error/Timeout: ${e}`)
            return
        }

        log(`✅ Found ${results.matches.length} matches.`)

        results.matches.forEach((match: any, i: number) => {
            const m = match.metadata as any
            log(`\n--- Match ${i + 1} (Score: ${match.score?.toFixed(4)}) ---`)
            log(`ID: ${match.id}`)
            log(`Name: ${m.Destination_Name}`)
            log(`Duration: "${m.Duration}"`)
            log(`Duration_Days: ${m.Duration_Days} (Type: ${typeof m.Duration_Days})`)
            log(`Star_Rating: ${m.Star_Rating} (Type: ${typeof m.Star_Rating})`)
            log(`Price: ${m.Price_Range_INR}`)
            log(`Travel_Type: ${m.Travel_Type}`)
        })

        log("\n🏁 Done.")

    } catch (e) {
        log("❌ Error in checkPinecone: " + (e instanceof Error ? e.stack : String(e)))
    }
}

checkPinecone()
