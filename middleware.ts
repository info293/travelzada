import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to handle SEO for query parameter URLs
 * - Adds noindex header for URLs with ?t= parameter to prevent duplicate indexing
 */
export function middleware(request: NextRequest) {
    // SEO URL Redirects (301 Permanent) - Old URLs → New SEO-optimized URLs
    const seoRedirects: Record<string, string> = {
        '/about-us': '/about',
        '/story': '/our-story',
    }

    if (seoRedirects[request.nextUrl.pathname]) {
        const url = request.nextUrl.clone()
        url.pathname = seoRedirects[request.nextUrl.pathname]
        return NextResponse.redirect(url, 301)
    }

    // Redirect old AI Planner URL to new URL
    if (request.nextUrl.pathname === '/ai-planner') {
        return NextResponse.redirect(new URL('/ai-trip-planner', request.url), 301)
    }

    // Check if URL has ?t= parameter (tracking/campaign parameter)
    if (request.nextUrl.searchParams.has('t')) {
        const response = NextResponse.next()
        // Tell search engines not to index this URL variant, but follow links
        response.headers.set('X-Robots-Tag', 'noindex, follow')
        return response
    }

    return NextResponse.next()
}

// Apply middleware to all routes except static files and API
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes (already excluded from robots.txt)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, images, etc.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'
    ],
}
