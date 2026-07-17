import { NextRequest, NextResponse } from 'next/server';

const LANDING_HOSTS = ['magastorecr.com', 'www.magastorecr.com'];

export function middleware(request: NextRequest) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

    if (LANDING_HOSTS.includes(host)) {
        return NextResponse.rewrite(new URL('/landing.html', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/'],
};
