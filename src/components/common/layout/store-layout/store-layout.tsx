import React from 'react';
import Head from 'next/head';
import { ShoppingBagIcon } from '@heroicons/react/24/outline'; // O cualquier librería de iconos
import { Typography, TypographyVariant } from '../../typography/typography';

interface StoreLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children, title }) => {
    return (
        <>
            <Head>
                <title>{title ? `${title} | ScentStack` : 'ScentStack | Fragancias Exclusivas'}</title>
            </Head>

            <div className="min-h-screen bg-white flex flex-col font-sans">

                {/* Navbar superior: Limpio y sin distracciones */}
                <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-100">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

                        {/* Logo con tu tipografía de display */}
                        <Typography variant={TypographyVariant.SUBTITLE} className="font-display tracking-tighter text-2xl">
                            SCENT<span className="text-accent">STACK</span>
                        </Typography>

                        {/* Menú de navegación central (opcional) */}
                        <nav className="hidden md:flex gap-8">
                            <Typography variant={TypographyVariant.LINK_TEXT} className="text-neutral-500">Hombre</Typography>
                            <Typography variant={TypographyVariant.LINK_TEXT} className="text-neutral-500">Mujer</Typography>
                            <Typography variant={TypographyVariant.LINK_TEXT} className="text-neutral-500">Nicho</Typography>
                        </nav>

                        {/* Carrito y Perfil */}
                        <div className="flex items-center gap-4">
                            <div className="relative cursor-pointer hover:scale-105 transition-transform">
                                <ShoppingBagIcon className="w-7 h-7 text-neutral-800" />
                                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    2
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido principal: Centrado y con aire */}
                <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
                    {children}
                </main>

                {/* Footer elegante */}
                <footer className="bg-neutral-900 py-12 text-white">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <Typography variant={TypographyVariant.BODY} className="text-neutral-400">
                            © 2026 ScentStack. Todos los derechos reservados.
                        </Typography>
                        <div className="flex gap-6">
                            <Typography variant={TypographyVariant.LINK_TEXT} className="text-white">Contacto</Typography>
                            <Typography variant={TypographyVariant.LINK_TEXT} className="text-white">Envíos</Typography>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};