
The AI Planner is an intelligent trip planning system that:
- **Engages users** in a conversational flow to collect trip preferences
- **Uses OpenAI GPT-4o-mini** to generate natural, contextual responses
- **Matches packages** from a database using sophisticated scoring algorithms
- **Handles typos and spelling mistakes** through fuzzy matching
- **Prioritizes user preferences** (hotel star rating, duration, activities) in recommendations

### Key Components
- **Frontend**: React component (`ConversationAgent.tsx`)
- **Backend API**: Next.js API route (`/api/ai-planner/chat`)
- **Data Sources**: 
  - Firestore database (packages collection)
  - Local JSON files (fallback data)
- **AI Model**: OpenAI GPT-4o-mini (temperature: 0.8)

---

## Question Flow & User Journey

### Step-by-Step Question Sequence

The system asks **5 questions** in a specific order:

#### **Step 1: Destination** (`destination`)
- **Question**: "Which destination do you want to plan?"
- **What Happens**:
  - User can type any destination name (e.g., "Bali", "Kerala", "Maldives")
  - System extracts destination using `extractDestination()` function
  - Searches through available destinations in database
  - Once found, moves to next question
- **AI Prompt**: `"Greet them briefly and ask which destination they want to plan."`
- **Extraction Logic**: Checks if user input contains any destination name from the database

#### **Step 2: Travel Date** (`date`)
- **Question**: "When do you plan to travel?"
- **What Happens**:
  - User can provide:
    - Exact date (e.g., "15th March 2025", "March 15, 2025", "2025-03-15")
    - Flexible date formats (parsed by `parseFlexibleDate()`)
  - System extracts date using `extractDate()` function
    - ISO format: "2025-03-15"
- **AI Prompt**: `"Thank them for choosing [destination] and ask when they plan to travel. Mention they can share a month or exact date."`
- **Note**: Month selection buttons were removed - users must enter date directly

#### **Step 3: Duration** (`days`)
- **Question**: "How many days do you want in [destination]?"
- **What Happens**:
  - User can:
    - Type number (e.g., "5", "7 days")
    - Select from quick options (2-10 days, 10+ days)
  - System extracts number using `extractNumber()` function
  - **Dynamic Options**: System shows only available durations for the selected destination
  - Filters packages to show only relevant day options
- **AI Prompt**: `"Acknowledge their travel date and ask how many days they want in [destination]. Mention they can tap a quick option."`
- **Priority**: Duration matching has **HIGH PRIORITY** in package ranking (second only to hotel star rating)

#### **Step 4: Hotel Type** (`hotel`)
- **Question**: "What type of accommodation do you prefer: 3-star, 4-star, or 5-star?"
- **What Happens**:
  - User can select: 3★ Comfort, 4★ Premium, or 5★ Luxury
  - System maps selection to `Star_Category` format: "3 Star", "4 Star", "5 Star"
  - **CRITICAL**: This is the **HIGHEST PRIORITY** in package ranking
  - If user selects 5-star, ONLY 5-star packages appear first (no mixing with 4-star)
  - Heavy penalties applied for mismatches:
    - User wants 5-star, gets 4-star: **-30 points**
    - User wants 5-star, gets 3-star: **-50 points**
- **AI Prompt**: `"Thank them and ask which stay style they prefer: 3-star, 4-star, or 5-star."`
- **Extraction Logic**: 
  - Checks for star numbers (3, 4, 5)
  - Maps budget/luxury terms to star ratings
  - Returns format: "X Star" (matches database `Star_Category` field)

#### **Step 5: Travel Type** (`travelType`)
- **Question**: "Who will you be travelling with: solo, family, couple, or friends?"
- **What Happens**:
  - **Smart Logic**: 
    - If only **ONE** travel type option exists for the destination → **Auto-selects and skips question**
    - If **NO** options exist → **Defaults to "couple" and skips question**
    - If **MULTIPLE** options exist → **Shows the question**
  - System extracts travel type using `extractTravelType()` function
  - Checks available packages for the destination to determine available options
  - Maps user input to: "solo", "family", "couple", "friends"
- **AI Prompt**: `"Acknowledge their stay preference and ask who they are travelling with: solo, family, couple, or friends."`
- **Auto-Skip Example**: If destination only has "Couple" packages, question is skipped and "couple" is auto-selected

#### **Step 6: Feedback (Optional)** (`feedback`)
- **Question**: "Do you have any specific activities in mind, like spa treatments, yoga, or adventure sports?"
- **What Happens**:
  - User can:
    - Provide specific activities/feedback (e.g., "I want spa and yoga", "scuba diving", "romantic dinner")
    - Type "skip" to skip this question
  - **Fuzzy Matching**: System handles spelling mistakes and typos
  - **Synonym Matching**: Understands related terms (e.g., "spa" matches "massage", "wellness")
  - **High Priority**: Feedback matching has **THIRD PRIORITY** in package ranking
  - Packages matching user feedback get significant score boosts
- **AI Prompt**: `"Thank them for sharing their preferences. Ask if they have any specific questions, suggestions, or things they want to include in their trip (like spa, yoga, adventure activities, etc.). Mention they can skip if they want."`
- **Processing**: Uses `searchPackageByFeedback()` function with fuzzy matching and synonym support

#### **Step 7: Recommendations** (`complete`)
- **What Happens**:
  - System generates personalized package recommendations
  - Shows top 2 packages based on scoring algorithm
  - AI generates summary explaining why packages fit user preferences
  - User can view package details or edit trip details

---

## AI Prompts & System Instructions

### System Prompt (OpenAI Configuration)
```
"You are Travelzada, a warm and concise AI trip planner. 
Keep responses under 120 words, ask one question at a time, 
and use Indian English nuances when helpful."
```

**Model**: `gpt-4o-mini`  
**Temperature**: `0.8` (allows creativity while maintaining consistency)

### Prompt Generation Function

The `withStyle()` function wraps all prompts:
```javascript
const withStyle = (instruction: string, maxWords = 35) =>
  `Keep the reply under ${maxWords} words. Be clear, upbeat, and avoid repetition. ${instruction}`
```

### Question-Specific Prompts

1. **Initial Greeting**:
   - Prompt: `"Greet them briefly and ask which destination they want to plan."`
   - Max Words: 20

2. **Date Question**:
   - Prompt: `"Thank them for choosing [destination] and ask when they plan to travel. Mention they can share a month or exact date."`
   - Max Words: 32

3. **Days Question**:
   - Prompt: `"Acknowledge their travel date and ask how many days they want in [destination]. Mention they can tap a quick option."`
   - Max Words: 30

4. **Hotel Question**:
   - Prompt: `"Thank them and ask which stay style they prefer: 3-star, 4-star, or 5-star."`
   - Max Words: 25

5. **Travel Type Question**:
   - Prompt: `"Acknowledge their stay preference and ask who they are travelling with: solo, family, couple, or friends."`
   - Max Words: 26

6. **Feedback Question**:
   - Prompt: `"Thank them for sharing their preferences. Ask if they have any specific questions, suggestions, or things they want to include in their trip (like spa, yoga, adventure activities, etc.). Mention they can skip if they want."`
   - Max Words: 35

7. **Recommendation Summary**:
   - Prompt: `"Summarize why the '[Package Name]' package ([Duration], [Price]) fits their [Travel Type] trip to [Destination]. Include 2 short bullet highlights from this overview: [Overview] and inclusions: [Inclusions]. End by inviting them to review Trip Details."`
   - Max Words: 80

### Fallback Prompts

When user input doesn't match expected format, system uses fallback prompts:
- **Destination**: `"Let them know you still need to know where they want to go and offer a couple of popular examples."`
- **Date**: `"Kindly remind them you still need their travel dates and that a month is enough."`
- **Days**: `"Let them know the trip length helps shape the plan and ask again for number of days."`
- **Hotel**: `"Ask again about preferred stay style (Budget, Mid-Range, Luxury, Boutique) and explain why it matters."`
- **Travel Type**: `"Remind them you can personalize better if you know whether they are traveling solo, as a couple, with family, or friends."`

---

## Core Algorithms

### 1. Levenshtein Distance Algorithm

**Purpose**: Calculate edit distance between two strings (handles typos)

**Implementation**:
```javascript
const levenshteinDistance = (str1: string, str2: string): number => {
  // Creates a matrix to calculate minimum edit distance
  // Returns the number of character changes needed to transform str1 to str2
}
```

**How It Works**:
- Creates a matrix where `matrix[i][j]` represents the edit distance between first `i` characters of `str2` and first `j` characters of `str1`
- Calculates minimum of three operations:
  - Substitution: `matrix[i-1][j-1] + 1`
  - Insertion: `matrix[i][j-1] + 1`
  - Deletion: `matrix[i-1][j] + 1`
- Returns the final edit distance

**Example**:
- `levenshteinDistance("spa", "spaa")` = 1 (one character difference)
- `levenshteinDistance("yoga", "ygoa")` = 2 (two character swaps)

### 2. Fuzzy Matching Algorithm

**Purpose**: Check if a word matches text with typos (using Levenshtein distance)

**Implementation**:
```javascript
const fuzzyMatch = (word: string, text: string, threshold: number = 0.7): boolean => {
  // Checks exact match first
  // Then checks similarity using Levenshtein distance
  // Returns true if similarity >= threshold
}
```

**How It Works**:
1. Checks for exact match first
2. Splits text into words
3. For each word, calculates similarity: `1 - (distance / maxLength)`
4. Returns `true` if similarity >= threshold (default: 0.7)

**Example**:
- `fuzzyMatch("spa", "I want spa treatment")` = `true` (exact match)
- `fuzzyMatch("spa", "I want spaa treatment")` = `true` (fuzzy match, similarity = 0.75)
- `fuzzyMatch("yoga", "I want ygoa")` = `true` (fuzzy match, similarity = 0.75)

### 3. Package Scoring Algorithm

**Purpose**: Calculate how well a package matches user preferences

**Function**: `scorePackage(pkg: DestinationPackage, info: TripInfo)`

**Scoring Breakdown**:

#### Base Score (Required)
- **Destination Match**: +50 points (MUST match, otherwise score = 0)

#### Hotel Type Matching (HIGHEST PRIORITY)
- **Exact Match**: +50 points
- **Mismatch Penalties**:
  - User wants 5-star, gets 4-star: **-30 points**
  - User wants 5-star, gets 3-star: **-50 points**
  - User wants 4-star, gets 3-star: **-20 points**
  - User wants 4-star, gets 5-star: **-10 points** (upgrade - less ideal)
  - User wants 3-star, gets 5-star: **-30 points** (too expensive)
  - User wants 3-star, gets 4-star: **-15 points** (more expensive)

#### Duration Matching (HIGH PRIORITY - Second)
- **Exact Match** (0 days difference): +20 points
- **Very Close** (1 day difference): +10 points
- **Close** (2 days difference): +4 points
- **Somewhat Close** (3 days difference): +1 point
- **Too Far** (>3 days difference): 0 points

#### Travel Type Matching
- **Exact Match**: +12 points
- **Partial Match** (package supports multiple types): +10 points
- **No Match**: -8 points

#### Feedback/Activity Matching (THIRD PRIORITY)
- Uses `searchPackageByFeedback()` function
- **Score Multipliers**:
  - If feedback matches AND duration AND travel type match: `feedbackScore × 5.5`
  - If feedback matches AND (duration OR travel type) match: `feedbackScore × 2.0`
  - If feedback matches (even without other matches): `feedbackScore × 1.5`

**Total Score Calculation**:
```
Total Score = Base Score + Hotel Score + Duration Score + Travel Type Score + Feedback Score
```

### 4. Package Ranking Algorithm

**Purpose**: Sort packages by relevance to user preferences

**Function**: `rankedPackages` (useMemo hook)

**Sorting Priority Order**:

1. **FIRST**: Hotel/Star Rating Match
   - Packages with exact star rating match come first
   - If user wants 5-star, 5-star packages appear before 4-star or 3-star

2. **SECOND**: Duration/Days Match
   - Exact duration matches come first
   - If both are close (within 2 days), prefer the closer one

3. **THIRD**: Feedback/Activity Match
   - Packages matching user feedback come first
   - Higher feedback score = higher priority

4. **FOURTH**: Total Score
   - Sort by total score (includes all factors)

5. **FIFTH**: Travel Type Match
   - Prefer packages that match travel type exactly

**Implementation**:
```javascript
.sort((a, b) => {
  // 1. Check hotel star rating match
  // 2. Check duration match
  // 3. Check feedback match
  // 4. Sort by total score
  // 5. Prefer travel type match
})
```

---

## Package Scoring & Ranking System

### Score Calculation Example

**User Preferences**:
- Destination: "Bali"
- Days: 5
- Hotel Type: "5 Star"
- Travel Type: "Couple"
- Feedback: "I want spa and yoga"

**Package A** (5-star, 5 days, Couple, includes spa):
- Base (destination): +50
- Hotel (exact match): +50
- Duration (exact match): +20
- Travel Type (exact match): +12
- Feedback (spa + yoga match): +80 (feedbackScore 15 × 5.5 multiplier)
- **Total: 212 points**

**Package B** (4-star, 5 days, Couple, includes spa):
- Base (destination): +50
- Hotel (mismatch): -30
- Duration (exact match): +20
- Travel Type (exact match): +12
- Feedback (spa match): +30 (feedbackScore 15 × 2.0 multiplier)
- **Total: 82 points**

**Result**: Package A ranks higher (212 > 82)

### Ranking Logic Flow

```
1. Filter packages by destination (must match)
2. Score each package using scorePackage()
3. Filter out packages with score <= 0
4. Sort using multi-level priority:
   a. Hotel star rating match
   b. Duration match
   c. Feedback match
   d. Total score
   e. Travel type match
5. Return top 2 packages for display
```

---

## Feedback Processing & Fuzzy Matching

### Feedback Search Algorithm

**Function**: `searchPackageByFeedback(pkg: DestinationPackage, feedback: string)`

**How It Works**:

1. **Text Extraction**:
   - Searches across multiple package fields:
     - `Overview`
     - `Inclusions`
     - `Theme`
     - `Mood`
     - `Adventure_Level`
     - `Stay_Type`
     - `Day_Wise_Itinerary`
     - `Ideal_Traveler_Persona`
     - `Destination_Name`
     - `Description`

2. **Keyword Extraction**:
   - Splits feedback into keywords
   - Filters out common words ("the", "and", "or", "for", etc.)
   - Removes words shorter than 3 characters

3. **Matching Types**:

   **a. Exact Match**:
   - If keyword appears exactly in package text
   - Score: **+15 points per keyword**

   **b. Synonym Match**:
   - Uses synonym mapping for activities:
     ```javascript
     'spa': ['spa', 'massage', 'wellness', 'relaxation', 'therapy', 'treatment', 'rejuvenation', 'pampering', 'beauty','salon'],
      'yoga': ['yoga', 'meditation', 'mindfulness', 'zen', 'stretching', 'flexibility', 'asana'],
      'adventure': ['adventure', 'adventurous', 'thrilling', 'exciting', 'extreme', 'outdoor', 'sports', 'activity', 'activities'],
      'diving': ['diving', 'scuba', 'snorkeling', 'snorkel', 'underwater', 'marine', 'coral', 'reef'],
      'hiking': ['hiking', 'trekking', 'trek', 'walking', 'trail', 'mountain', 'climbing'],
      'beach': ['beach', 'beaches', 'coastal', 'seaside', 'shore', 'ocean', 'seawater', 'swimming'],
      'culture': ['culture', 'cultural', 'heritage', 'historical', 'history', 'temple', 'temples', 'monument', 'monuments', 'tradition', 'traditional'],
      'shopping': ['shopping', 'shop', 'market', 'markets', 'mall', 'boutique', 'souvenir'],
      'food': ['food', 'cuisine', 'culinary', 'restaurant', 'dining', 'eat', 'eating', 'local', 'delicacy'],
      'nightlife': ['nightlife', 'night', 'club', 'bars', 'bar', 'party', 'entertainment', 'music'],
      'wildlife': ['wildlife', 'safari', 'animals', 'nature', 'jungle', 'forest', 'bird', 'birds'],
      'romantic': ['romantic', 'romance', 'honeymoon', 'couple', 'intimate', 'private'],
      'family': ['family', 'kids', 'children', 'child', 'kid-friendly', 'family-friendly'],
     ```
   - Score: **+12 points per keyword**

   **c. Fuzzy Match**:
   - Uses Levenshtein distance for typos
   - Threshold: 0.65 (65% similarity)
   - Score: **+10 points per keyword**

4. **Bonus Scoring**:
   - If **all keywords** match: **+30 bonus points**
   - If **70%+ keywords** match: **+15 bonus points**

5. **Score Normalization**:
   - Maximum score: 100 points
   - Returns normalized score (0-100)

### Example: Feedback Processing

**User Feedback**: "I want spaa and ygoa" (typos: "spaa" instead of "spa", "ygoa" instead of "yoga")

**Processing**:
1. Keywords extracted: ["want", "spaa", "ygoa"] → ["spaa", "ygoa"] (filters "want")
2. For "spaa":
   - Exact match: No
   - Synonym match: Checks if "spa" synonyms exist → Found "spa", "massage", "wellness"
   - Fuzzy match: `levenshteinDistance("spaa", "spa")` = 1, similarity = 0.75 → Match!
   - Score: +10 (fuzzy match)
3. For "ygoa":
   - Exact match: No
   - Synonym match: Checks if "yoga" synonyms exist → Found "yoga", "meditation"
   - Fuzzy match: `levenshteinDistance("ygoa", "yoga")` = 2, similarity = 0.67 → Match!
   - Score: +10 (fuzzy match)
4. Total matches: 2/2 keywords
5. Bonus: +30 (all keywords matched)
6. **Final Score: 50 points**

**Result**: Package with spa and yoga activities gets high feedback score despite typos!

---

## Data Extraction Functions

### 1. `extractDestination(text: string)`
- Searches user input for destination names
- Case-insensitive matching
- Returns destination name if found, `null` otherwise

### 2. `extractDate(text: string)`
- Parses multiple date formats:
  - ISO: "2025-03-15"
  - Ordinal: "15th March 2025"
  - Month-first: "March 15, 2025"
  - Dashed: "15-03-2025"
- Uses `parseFlexibleDate()` helper function
- Returns ISO date string or `null`

### 3. `extractNumber(text: string)`
- Extracts first number from text
- Returns number as string or `null`
- Used for days and budget extraction

### 4. `extractHotelType(text: string)`
- Maps user input to star rating format
- Handles:
  - Star numbers: "3", "4", "5" → "3 Star", "4 Star", "5 Star"
  - Budget terms: "budget", "cheap" → "3 Star"
  - Luxury terms: "luxury", "premium" → "5 Star"
- Returns "X Star" format (matches database `Star_Category`)

### 5. `extractTravelType(text: string)`
- Maps user input to travel type
- Handles:
  - "solo", "alone", "myself" → "solo"
  - "family", "kids", "children" → "family"
  - "couple", "romantic", "honeymoon" → "couple"
  - "friends", "group" → "friends"
- Returns standard travel type or `null`

### 6. `extractBudget(text: string)`
- Extracts budget amount from text
- Handles:
  - Currency formats: "₹50,000", "50000"
  - Budget keywords: "budget" → 30000, "luxury" → 100000
- Returns budget amount as string or `null`

---

## Technical Implementation

### Component Structure

**File**: `components/ConversationAgent.tsx`

**Key State Variables**:
- `tripInfo`: Stores user preferences (destination, date, days, hotelType, travelType)
- `messages`: Conversation history
- `currentQuestion`: Tracks which question is being asked
- `userFeedback`: Stores user's activity preferences
- `rankedPackages`: Sorted list of matching packages
- `firestorePackages`: Packages loaded from Firestore

**Key Functions**:
- `askNextQuestion()`: Determines next question based on current state
- `handleSend()`: Processes user input and extracts data
- `scorePackage()`: Calculates package relevance score
- `searchPackageByFeedback()`: Matches feedback to packages
- `generateRecommendation()`: Creates AI summary of top package

### API Route

**File**: `app/api/ai-planner/chat/route.ts`

**Endpoint**: `POST /api/ai-planner/chat`

**Request Body**:
```json
{
  "prompt": "string",
  "conversation": [
    {
      "role": "user" | "assistant",
      "content": "string"
    }
  ]
}
```

**Response**:
```json
{
  "message": "AI generated response"
}
```

**Implementation**:
- Uses OpenAI SDK
- Maintains conversation history (last 6 messages)
- System prompt sets AI personality
- Error handling for API failures

### Data Flow

```
User Input
    ↓
handleSend() → Extract Data → Update tripInfo
    ↓
askNextQuestion() → Generate AI Prompt
    ↓
API Call → OpenAI GPT-4o-mini
    ↓
AI Response → Display to User
    ↓
(Repeat for each question)
    ↓
All Questions Answered
    ↓
scorePackage() → Rank Packages
    ↓
generateRecommendation() → Show Top 2 Packages
```

### Package Data Structure

**Firestore Collection**: `packages`

**Key Fields**:
- `Destination_ID`: Unique package identifier
- `Destination_Name`: Destination name
- `Duration`: Duration string (e.g., "5 Nights / 6 Days")
- `Duration_Days`: Number of days (numeric)
- `Star_Category`: Hotel star rating (e.g., "3 Star", "4 Star", "5 Star")
- `Travel_Type`: Travel type (e.g., "Couple", "Family", "Solo")
- `Overview`: Package description
- `Inclusions`: What's included
- `Theme`: Package theme
- `Mood`: Package mood
- `Adventure_Level`: Adventure level
- `Stay_Type`: Type of stay
- `Price_Range_INR`: Price range string

### Progress Tracking

**Progress Calculation**:
```javascript
progress = (completedSteps / TOTAL_STEPS) * 100
```

**Completed Steps**:
- Destination: +1
- Travel Date: +1
- Days: +1
- Hotel Type: +1
- Travel Type: +1

**Total Steps**: 5

---

