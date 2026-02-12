import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embedding vector for a text string using OpenAI
 * @param text - The text to embed
 * @returns Array of 1536 numbers representing the text meaning
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
    })
    return response.data[0].embedding
}

/**
 * Format a travel package into searchable text
 * Combines all relevant fields into a single string for embedding
 */
export function formatPackageForEmbedding(pkg: any): string {
    const parts: string[] = []

    // Add destination name
    if (pkg.Destination_Name) {
        parts.push(`Destination: ${pkg.Destination_Name}`)
    }

    // Add overview/description
    if (pkg.Overview) {
        parts.push(pkg.Overview)
    }

    // Add highlights
    if (pkg.Tour_Highlights) {
        const highlights = Array.isArray(pkg.Tour_Highlights)
            ? pkg.Tour_Highlights.join(', ')
            : pkg.Tour_Highlights
        parts.push(`Highlights: ${highlights}`)
    }

    // Add travel type (solo, couple, family, friends)
    if (pkg.Travel_Type) {
        parts.push(`Travel type: ${pkg.Travel_Type}`)
    }

    // Add star category
    if (pkg.Star_Category) {
        parts.push(`Hotel: ${pkg.Star_Category}`)
    }

    // Add duration
    if (pkg.Duration) {
        parts.push(`Duration: ${pkg.Duration}`)
    }

    // Add activities if available
    if (pkg.Activities) {
        const activities = Array.isArray(pkg.Activities)
            ? pkg.Activities.join(', ')
            : pkg.Activities
        parts.push(`Activities: ${activities}`)
    }

    // Add inclusions for context
    if (pkg.Inclusions) {
        const inclusions = Array.isArray(pkg.Inclusions)
            ? pkg.Inclusions.slice(0, 5).join(', ')
            : pkg.Inclusions
        parts.push(`Includes: ${inclusions}`)
    }

    return parts.join('. ')
}

/**
 * Generate embedding for a travel package
 */
export async function embedPackage(pkg: any): Promise<number[]> {
    const text = formatPackageForEmbedding(pkg)
    return generateEmbedding(text)
}
