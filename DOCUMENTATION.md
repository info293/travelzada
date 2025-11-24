# Travelzada - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Features](#features)
6. [Key Components](#key-components)
7. [API Routes](#api-routes)
8. [Database Schema](#database-schema)
9. [Authentication](#authentication)
10. [AI Planner System](#ai-planner-system)
11. [Setup Instructions](#setup-instructions)
12. [Environment Variables](#environment-variables)
13. [Deployment](#deployment)
14. [Development Guidelines](#development-guidelines)

---

## Project Overview

**Travelzada** is a modern, AI-powered travel planning platform built with Next.js 14. The platform allows users to discover travel packages, plan trips using an AI assistant, read travel blogs, and manage bookings. It features a comprehensive admin dashboard for content management.

### Key Highlights
- **AI-Powered Trip Planning**: Interactive conversation-based trip planner using OpenAI GPT-4o-mini
- **Dynamic Content Management**: Firestore-based CMS for packages, blogs, and user management
- **Real-time Package Matching**: Intelligent scoring algorithm for package recommendations
- **Responsive Design**: Modern UI with Tailwind CSS and gradient animations
- **Admin Dashboard**: Full CRUD operations for packages, blogs, and user management

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14.2.0 (App Router)
- **Language**: TypeScript 5.2.2
- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS 3.3.5
- **Fonts**: Inter, Playfair Display (Google Fonts)

### Backend & Services
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Email/Password, Google OAuth)
- **AI Integration**: OpenAI API (GPT-4o-mini)
- **Analytics**: Firebase Analytics

### Development Tools
- **Build Tool**: Next.js built-in Webpack
- **CSS Processing**: PostCSS, Autoprefixer
- **Type Checking**: TypeScript

---

## Project Structure

```
travelingproject/
├── app/                          # Next.js App Router pages
│   ├── admin/                    # Admin dashboard
│   │   └── page.tsx             # Admin panel with CRUD operations
│   ├── ai-planner/              # AI trip planner page
│   │   └── page.tsx             # Main planner interface
│   ├── api/                     # API routes
│   │   └── ai-planner/
│   │       └── chat/
│   │           └── route.ts     # OpenAI chat API endpoint
│   ├── blog/                    # Blog pages
│   │   ├── [id]/
│   │   │   └── page.tsx         # Individual blog post
│   │   └── page.tsx             # Blog listing page
│   ├── destinations/            # Destination pages
│   │   ├── [slug]/
│   │   │   ├── [packageId]/
│   │   │   │   └── page.tsx     # Package detail page
│   │   │   └── page.tsx         # Destination packages listing
│   │   └── page.tsx             # All destinations page
│   ├── contact/                 # Contact page
│   ├── careers/                 # Careers page
│   ├── press/                   # Press page
│   ├── story/                   # Company story page
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   ├── layout.tsx                # Root layout with AuthProvider
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── admin/
│   │   └── PackageForm.tsx      # Package form component
│   ├── ConversationAgent.tsx    # AI conversation interface
│   ├── Header.tsx               # Navigation header
│   ├── Footer.tsx               # Footer component
│   ├── Hero.tsx                 # Homepage hero section
│   ├── Packages.tsx             # Package cards component
│   ├── HowItWorks.tsx           # How it works section
│   ├── WhyTravelzada.tsx        # Why choose us section
│   ├── Testimonials.tsx         # Testimonials section
│   ├── TripForm.tsx             # Trip details form
│   └── [Other components]       # Additional UI components
│
├── contexts/                     # React contexts
│   └── AuthContext.tsx          # Authentication context
│
├── lib/                          # Utility libraries
│   └── firebase.ts              # Firebase configuration
│
├── data/                         # Static data files
│   ├── destination_package.json # Package data (fallback)
│   ├── travel-database.json     # Destination database
│   └── package-data.ts          # TypeScript package data
│
├── scripts/                      # Utility scripts
│   └── init-firestore.ts        # Firestore initialization script
│
├── public/                       # Static assets
│   └── favicon.ico              # Site favicon
│
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

---

## Architecture

### Application Flow

1. **User Authentication**
   - Firebase Auth handles user authentication
   - AuthContext provides global auth state
   - Role-based access control (Admin/User)

2. **Data Management**
   - Primary: Firestore (real-time database)
   - Fallback: Static JSON files for initial load
   - Client-side filtering and sorting

3. **AI Integration**
   - OpenAI API via Next.js API route (`/api/ai-planner/chat`)
   - Conversation state managed in `ConversationAgent` component
   - Package matching algorithm scores packages based on user preferences

4. **Routing**
   - Next.js App Router with dynamic routes
   - Server-side and client-side rendering
   - URL-based package and destination navigation

---

## Features

### 1. AI Trip Planner
- **Location**: `/ai-planner`
- **Features**:
  - Interactive conversation interface
  - Multi-step questionnaire (destination, date, duration, hotel type, travel type, feedback)
  - Real-time package scoring and ranking
  - Feedback-based package search
  - Quick suggestion buttons
  - Progress tracking (5 steps)

### 2. Destination Packages
- **Location**: `/destinations/[slug]`
- **Features**:
  - Dynamic package listing from Firestore
  - Filtering by destination name/ID
  - Package cards with images, pricing, and details
  - Link to individual package pages

### 3. Package Details
- **Location**: `/destinations/[slug]/[packageId]`
- **Features**:
  - Full package information display
  - Day-wise itinerary with expandable sections
  - Inclusions/Exclusions lists
  - Guest reviews section
  - Social sharing (Facebook, Twitter, LinkedIn, WhatsApp)
  - Booking information and policies

### 4. Blog System
- **Location**: `/blog`
- **Features**:
  - Blog post listing with newsletter subscription
  - Individual blog post pages
  - Related posts suggestions
  - Category filtering
  - Admin-managed content

### 5. Admin Dashboard
- **Location**: `/admin` (Admin-only)
- **Features**:
  - Package management (Create, Read, Update, Delete)
  - Blog management (Create, Read, Update, Delete)
  - User management
  - Bulk import functionality
  - Dashboard statistics

### 6. Authentication
- **Features**:
  - Email/Password authentication
  - Google OAuth login
  - Password reset functionality
  - Role-based access (Admin/User)
  - User profile management in Firestore

---

## Key Components

### ConversationAgent.tsx
**Purpose**: Main AI conversation interface for trip planning

**Key Features**:
- Manages conversation state and user inputs
- Fetches packages from Firestore
- Implements package scoring algorithm
- Handles multi-step questionnaire flow
- Displays recommended packages

**Key Functions**:
- `scorePackage()`: Scores packages based on user preferences
- `searchPackageByFeedback()`: Searches packages by user feedback keywords
- `generateRecommendation()`: Generates AI response and package recommendations
- `askNextQuestion()`: Manages question flow

**State Management**:
- `tripInfo`: User's trip preferences
- `conversation`: Chat history
- `currentQuestion`: Current step in questionnaire
- `recommendedPackages`: Scored and sorted packages
- `userFeedback`: Optional user feedback input

### Header.tsx
**Purpose**: Navigation header with authentication

**Features**:
- Responsive navigation menu
- Mobile menu with overlay
- Authentication status display
- Admin link (for admin users)
- Scroll-based styling changes

### Packages.tsx
**Purpose**: Displays "Premium capsules" on homepage

**Features**:
- Fetches latest 4 Bali packages from Firestore
- Filters packages by destination (Bali)
- Displays package cards with images and pricing
- Links to package detail pages

### AuthContext.tsx
**Purpose**: Global authentication context

**Features**:
- User authentication state
- Signup/Login/Logout functions
- Google OAuth integration
- Admin role checking
- User document management in Firestore

---

## API Routes

### `/api/ai-planner/chat` (POST)
**Purpose**: Handles AI chat requests

**Request Body**:
```typescript
{
  prompt: string
  conversation?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}
```

**Response**:
```typescript
{
  message: string
}
```

**Implementation**:
- Uses OpenAI GPT-4o-mini model
- Maintains conversation history
- Returns concise, travel-focused responses
- Error handling for API failures

---

## Database Schema

### Firestore Collections

#### `packages`
**Document Structure**:
```typescript
{
  Destination_ID: string              // Unique package identifier (e.g., "DEST_BALI_015")
  Destination_Name: string           // Destination name (e.g., "Bali, Indonesia")
  Overview: string                    // Package overview/description
  Duration: string                    // Duration string (e.g., "5 Nights / 6 Days")
  Duration_Nights: number             // Number of nights
  Duration_Days: number                // Number of days
  Mood: string                        // Mood (e.g., "Relax", "Explore")
  Occasion: string                    // Occasion type
  Travel_Type: string                 // Travel type (e.g., "Couple", "Family", "Solo")
  Budget_Category: string             // Budget category
  Price_Range_INR: string             // Price range string
  Price_Min_INR: number               // Minimum price
  Price_Max_INR: number                // Maximum price
  Theme: string                       // Theme (e.g., "Beach / Culture")
  Adventure_Level: string             // Adventure level
  Stay_Type: string                   // Stay type (e.g., "Resort", "Villa")
  Star_Category: string               // Hotel star rating (e.g., "3-Star", "4-Star", "5-Star")
  Meal_Plan: string                   // Meal plan details
  Group_Size: string                  // Group size
  Child_Friendly: string              // Child-friendly indicator
  Elderly_Friendly: string           // Elderly-friendly indicator
  Language_Preference: string         // Language preferences
  Seasonality: string                 // Best season to visit
  Hotel_Examples: string              // Hotel examples
  Inclusions: string                  // Comma-separated inclusions
  Exclusions: string                   // Comma-separated exclusions
  Day_Wise_Itinerary: string          // Day-wise itinerary (pipe-separated)
  Rating: string                      // Package rating
  Location_Breakup: string            // Location breakdown
  Airport_Code: string                // Airport code
  Transfer_Type: string               // Transfer type
  Currency: string                    // Currency
  Climate_Type: string                // Climate type
  Safety_Score: string                // Safety score
  Sustainability_Score: string         // Sustainability score
  Ideal_Traveler_Persona: string      // Ideal traveler persona
  Created_By: string                  // Creator name
  Last_Updated: string                // Last update timestamp
  Slug: string                        // URL slug
  Primary_Image_URL: string            // Main image URL
  Booking_URL: string                 // Booking URL
  SEO_Title: string                   // SEO title
  SEO_Description: string             // SEO description
  SEO_Keywords: string                 // SEO keywords
  Meta_Image_URL: string               // Meta image URL
  createdAt?: Timestamp               // Firestore timestamp
}
```

#### `blogs`
**Document Structure**:
```typescript
{
  title: string                       // Blog post title
  subtitle?: string                   // Optional subtitle
  description: string                 // Short description
  content: string                     // Full blog content (markdown/HTML)
  image: string                       // Featured image URL
  author: string                      // Author name
  authorImage?: string                // Author image URL (optional)
  date: string                       // Publication date
  category: string                   // Blog category
  readTime?: string                  // Estimated read time
  likes?: number                     // Like count
  comments?: number                  // Comment count
  shares?: number                   // Share count
  featured?: boolean                 // Featured flag
  published?: boolean                // Published status
  createdAt?: Timestamp              // Firestore timestamp
  updatedAt?: Timestamp              // Update timestamp
}
```

#### `users`
**Document Structure**:
```typescript
{
  email: string                      // User email
  displayName?: string               // Display name
  photoURL?: string                  // Profile photo URL
  role: 'user' | 'admin'            // User role
  createdAt: Timestamp               // Account creation timestamp
  lastLogin?: Timestamp              // Last login timestamp
  isActive: boolean                  // Active status
}
```

---

## Authentication

### Authentication Flow

1. **Signup**:
   - User provides email and password
   - Firebase Auth creates user account
   - User document created in Firestore `users` collection
   - Default role: `'user'`

2. **Login**:
   - Email/Password or Google OAuth
   - Firebase Auth authenticates user
   - User document updated with `lastLogin` timestamp
   - AuthContext updates global state

3. **Admin Check**:
   - Checks Firestore `users` collection for `role: 'admin'`
   - Fallback: Checks email pattern (contains 'admin')
   - Admin users see admin dashboard link

4. **Logout**:
   - Firebase Auth signs out user
   - AuthContext clears user state

### Protected Routes
- `/admin`: Requires `isAdmin === true`
- Redirects to home if unauthorized

---

## AI Planner System

### Package Scoring Algorithm

The AI planner uses a sophisticated scoring algorithm to rank packages:

**Scoring Factors**:

1. **Destination Match** (Base: 10 points)
   - Exact match: 10 points
   - Partial match: 5 points

2. **Duration Match** (Max: 20 points)
   - Exact match: 20 points
   - 1 day off: 10 points
   - 2 days off: 4 points
   - 3 days off: 1 point
   - 4+ days off: 0 points

3. **Travel Type Match** (Max: 12 points)
   - Exact match: 12 points
   - Partial match (package includes user type): 10 points
   - No match: -8 points penalty

4. **Hotel Type Match** (Max: 10 points)
   - Exact match: 10 points
   - Upgrade (4-star to 5-star): 5 points
   - Downgrade (4-star to 3-star): -5 points
   - Downgrade (5-star to 4-star): -3 points

5. **Feedback Match** (Max: 15 points, conditional)
   - Only applied if basic criteria match (duration ≤ 2 days off, travel type matches)
   - Searches package fields (Overview, Inclusions, Day_Wise_Itinerary, Theme) for keywords
   - Full keyword match: 15 points
   - Partial match: Proportional score

**Sorting Logic**:
1. Exact duration matches first
2. Total score (descending)
3. Duration closeness
4. Hotel type match
5. Travel type match
6. Feedback score (tie-breaker)

### Question Flow

1. **Destination** → User selects destination
2. **Travel Date** → User selects date
3. **Duration** → User selects number of days
4. **Hotel Type** → User selects hotel category
5. **Travel Type** → User selects travel companion type
6. **Feedback** (Optional) → User provides additional preferences
7. **Recommendations** → AI generates response and shows top packages

---

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Firebase project created
- OpenAI API key

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travelingproject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Update `lib/firebase.ts` with your Firebase config
   - Or set environment variables

4. **Set environment variables**
   Create `.env.local`:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

5. **Initialize Firestore**
   - Run the initialization script (if available)
   - Or manually create collections in Firebase Console

6. **Run development server**
   ```bash
   npm run dev
   ```

7. **Build for production**
   ```bash
   npm run build
   npm start
   ```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for AI planner | `sk-...` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `travelzada` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics ID | `G-XXXXXXXXXX` |

---

## Deployment

### Vercel Deployment (Recommended)

1. **Connect repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy** automatically on push to main branch

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase init
   ```

3. **Build and deploy**
   ```bash
   npm run build
   firebase deploy
   ```

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices (hooks, functional components)
- Use Tailwind CSS for styling
- Maintain consistent component structure

### Component Structure
```typescript
'use client' // If client component

import { useState, useEffect } from 'react'
// Other imports

interface Props {
  // Props interface
}

export default function ComponentName({ prop1, prop2 }: Props) {
  // State
  // Effects
  // Handlers
  // Render
}
```

### File Naming
- Components: `PascalCase.tsx`
- Pages: `page.tsx` (Next.js convention)
- Utilities: `camelCase.ts`
- Types: `PascalCase.ts`

### State Management
- Use React hooks (`useState`, `useEffect`, `useContext`)
- AuthContext for global authentication
- Local state for component-specific data

### Error Handling
- Try-catch blocks for async operations
- Fallback UI for loading/error states
- Console logging for debugging
- User-friendly error messages

### Performance Optimization
- `useMemo` for expensive calculations
- `useCallback` for function memoization
- Lazy loading for images
- Code splitting with Next.js dynamic imports

---

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check if `window` is defined (client-side only)
   - Verify Firebase config in `lib/firebase.ts`

2. **OpenAI API errors**
   - Verify `OPENAI_API_KEY` is set
   - Check API quota and billing

3. **Package not found**
   - Check Firestore collection name (`packages`)
   - Verify `Destination_ID` or `Destination_Name` matches

4. **Admin access denied**
   - Check user role in Firestore `users` collection
   - Verify `isAdmin` state in AuthContext

5. **Build errors**
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

---

## Future Enhancements

### Potential Features
- Payment integration
- Booking system
- User reviews and ratings
- Email notifications
- Advanced search filters
- Multi-language support
- Mobile app (React Native)
- Real-time chat support
- Travel itinerary export (PDF)
- Calendar integration

---

## Support & Contact

For issues, questions, or contributions, please refer to the project repository or contact the development team.

---

**Last Updated**: Based on codebase analysis
**Version**: 0.1.0
**Maintained By**: Travelzada Development Team





