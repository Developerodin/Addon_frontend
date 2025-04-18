import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('accessToken');
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth/');
    const baseUrl = request.nextUrl.origin;

    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/auth/login', baseUrl));
    }

    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/catalog/items', baseUrl));
    }

    if (request.nextUrl.pathname === '/auth/logout') {
        const response = NextResponse.redirect(new URL('/auth/login', baseUrl));
        response.cookies.delete('accessToken');
        response.cookies.delete('refreshToken');
        return response;
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