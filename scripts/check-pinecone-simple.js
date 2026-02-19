const path = require('path');
const fs = require('fs');

const LOG_FILE = path.resolve(__dirname, '../pinecone_simple_log.txt');
function log(msg) {
    console.log(msg);
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
}
try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { }

// Load .env
const envPath = path.resolve(__dirname, '../.env.local');
const envPath2 = path.resolve(__dirname, '../.env');
let envLoaded = false;

[envPath, envPath2].forEach(p => {
    if (!envLoaded && fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        content.split('\n').forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) process.env[k.trim()] = v.trim();
        });
        log(`Loaded env from ${p}`);
        envLoaded = true;
    }
});

async function run() {
    try {
        log("Importing pinecone...");
        const { Pinecone } = require('@pinecone-database/pinecone');

        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });

        const indexName = process.env.PINECONE_INDEX || 'travelzada-packages';
        log(`Targeting index: ${indexName}`);

        const index = pinecone.index(indexName);

        log("Fetching index stats...");
        const stats = await index.describeIndexStats();
        log(`Index Stats: ${JSON.stringify(stats)}`);

        // Dummy query
        const dummyVector = new Array(1536).fill(0.01);
        // Query for ANY packages
        log("Querying for top 50 packages...");

        const results = await index.query({
            vector: dummyVector,
            topK: 50,
            includeMetadata: true
        });

        log(`Found ${results.matches.length} total matches.`);
        let count5 = 0;
        results.matches.forEach(m => {
            const days = m.metadata.Duration_Days;
            if (days === 5 || days === "5") {
                count5++;
                const name = m.metadata.Destination_Name;
                log(`[MATCH] ID: ${m.id}, Name: "${name}", Duration: ${m.metadata.Duration}, Days: ${days}`);
            } else {
                // Log a few non-matches to see structure
                if (Math.random() < 0.1) log(`[SKIP] ID: ${m.id}, Days: ${days} (${typeof days})`);
            }
        });
        log(`Total matches with Duration_Days == 5 in top 50: ${count5}`);

    } catch (e) {
        log(`ERROR: ${e.message}`);
        log(e.stack);
    }
}

run();
