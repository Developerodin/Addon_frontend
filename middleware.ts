import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('accessToken');
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth/');

    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/catalog/items', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/catalog/:path*',
        '/auth/:path*',
        '/sales/:path*',
        '/analytics/:path*',
        '/replenishment/:path*',
    ],
}; 