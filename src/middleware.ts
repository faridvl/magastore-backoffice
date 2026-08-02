import { NextRequest, NextResponse } from 'next/server';

const LANDING_HOSTS = ['magastorecr.com', 'www.magastorecr.com'];

export function middleware(request: NextRequest) {
    const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();

    if (LANDING_HOSTS.includes(host)) {
        // Sin extensión: la página vive en pages/landing.tsx y Next la sirve como
        // /landing. Apuntar a /landing.html devuelve 404 — esa ruta no existe.
        return NextResponse.rewrite(new URL('/landing', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/'],
};
