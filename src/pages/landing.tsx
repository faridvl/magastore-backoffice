import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Inter, Poppins } from 'next/font/google';
import type { GetServerSideProps } from 'next';
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Globe,
  MapPin,
  MessageCircle,
  Package,
  Scale,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import * as SettingsService from '@/shared/api/services/settings.service';
import { routesPublic } from '@/shared/navigation/routes';
import type { PublicDeliveryMethod, PublicRates } from '@/types/settings/settings.types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://magastorecr.com';
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

/**
 * Las fuentes de la marca (Inter + Poppins) ya están declaradas en
 * `tailwind.config.js` pero `_document.tsx` nunca las carga. Se cargan aquí con
 * next/font para no tocar el documento global, que afecta a todo el backoffice.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

const WHATSAPP_MESSAGE =
  'Hola, quiero abrir mi casillero en Magastore para traer mis compras desde Miami.';

const currency = (value: number) => `₡${Math.round(value).toLocaleString('es-CR')}`;

/**
 * Etapas del paquete tal como las ve el cliente. Se corresponden con el enum
 * `PackageStatus` (PANAMA / EN_TRAMITE / ENTREGADO) pero con la nomenclatura
 * pública: de cara al cliente el origen es Miami y la primera etapa es la
 * bodega Magastore. La operación en Panamá es interna y no se menciona.
 */
const LIFECYCLE = [
  {
    icon: Package,
    title: 'Bodega Magastore',
    description:
      'Registramos tu paquete apenas llega a nuestra bodega: tracking, peso y evidencia fotográfica.',
  },
  {
    icon: Truck,
    title: 'En trámite de envío',
    description:
      'Agrupamos tus paquetes en una orden de envío, gestionamos el traslado y te mantenemos al tanto del avance.',
  },
  {
    icon: MapPin,
    title: 'Entregado',
    description:
      'Coordinamos la entrega en Costa Rica según el método que elijas y recibís la factura por correo.',
  },
];

const BENEFITS = [
  {
    icon: Boxes,
    title: 'Agrupá varios paquetes',
    description:
      'Consolidamos todas tus compras en una sola orden de envío y pagás una única tarifa de entrega.',
  },
  {
    icon: Search,
    title: 'Seguimiento en línea',
    description:
      'Consultá el estado de tu paquete cuando querás con tu número de tracking, sin necesidad de cuenta.',
  },
  {
    icon: ClipboardList,
    title: 'Factura clara',
    description:
      'Cada envío genera una factura con el peso cobrado y el detalle de las tarifas aplicadas, descargable en PDF.',
  },
  {
    icon: ShieldCheck,
    title: 'Bitácora de cada paquete',
    description:
      'Registramos cada evento del paquete: recepción, novedades y entrega, con fecha y ubicación.',
  },
];

type DeliveryOption = {
  code: PublicDeliveryMethod;
  label: string;
  hint: string;
};

interface QuoteState {
  charged_weight_lb: number;
  shipping_crc: number;
  delivery_fee_crc: number;
  total_crc: number;
}

interface LandingPageProps {
  rates: PublicRates;
}

const LandingPage: React.FC<LandingPageProps> = ({ rates }) => {
  const [weight, setWeight] = useState('2');
  const [method, setMethod] = useState<PublicDeliveryMethod>('RETIRO');
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const requestId = useRef(0);

  const deliveryOptions: DeliveryOption[] = [
    { code: 'RETIRO', label: 'Retiro en punto', hint: 'Sin costo adicional' },
    { code: 'CORREOS', label: 'Correos de Costa Rica', hint: currency(rates.correos_fee_crc) },
    { code: 'TRACOPA', label: 'Tracopa', hint: currency(rates.tracopa_fee_crc) },
  ];

  const fetchQuote = useCallback(async (weightValue: string, deliveryMethod: PublicDeliveryMethod) => {
    const parsed = Number(weightValue);
    if (!weightValue || Number.isNaN(parsed) || parsed <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoadingQuote(true);

    try {
      const res = await fetch(
        `/api/public/quote?weight_lb=${encodeURIComponent(parsed)}&delivery_method=${deliveryMethod}`,
      );
      const body = await res.json();

      // Descartamos respuestas viejas que llegaron fuera de orden.
      if (currentRequest !== requestId.current) return;

      if (!res.ok) {
        setQuote(null);
        setQuoteError(body.message || 'No pudimos calcular el estimado.');
        return;
      }

      setQuote(body.data);
      setQuoteError(null);
    } catch {
      if (currentRequest !== requestId.current) return;
      setQuote(null);
      setQuoteError('Error al conectar con el servidor. Intentá de nuevo.');
    } finally {
      if (currentRequest === requestId.current) setLoadingQuote(false);
    }
  }, []);

  // Debounce de 400ms, igual que los buscadores del backoffice.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote(weight, method);
    }, 400);

    return () => clearTimeout(timer);
  }, [weight, method, fetchQuote]);

  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;

  const pageTitle = 'Magastore — Tu casillero en Miami para Costa Rica';
  const pageDescription =
    'Recibimos tus compras en nuestra bodega y las llevamos hasta Costa Rica. Tarifas claras por libra, seguimiento en línea y entrega a todo el país.';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="theme-color" content="#111111" />
        <link rel="canonical" href={`${SITE_URL}/landing`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Magastore" />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={`${SITE_URL}/landing`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Head>

      <div
        className={`${inter.className} ${poppins.variable} font-sans text-neutral-700 antialiased scroll-smooth`}
      >
        {/* ─── NAVBAR ─── */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2.5">
              <Image
                src="/logo/magastore-logo-light.png"
                alt="Magastore"
                width={140}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <div className="hidden md:flex items-center gap-7 text-sm text-neutral-300">
              <a href="#como-funciona" className="hover:text-primary transition-colors">
                Cómo funciona
              </a>
              <a href="#tarifas" className="hover:text-primary transition-colors">
                Tarifas
              </a>
              <a href="#beneficios" className="hover:text-primary transition-colors">
                Beneficios
              </a>
              <a href="#faq" className="hover:text-primary transition-colors">
                Preguntas
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={routesPublic.tracking}
                className="text-sm text-neutral-300 hover:text-white transition-colors hidden sm:block"
              >
                Rastrear paquete
              </Link>
              <a
                href={whatsappHref ?? '#contacto'}
                target={whatsappHref ? '_blank' : undefined}
                rel={whatsappHref ? 'noopener noreferrer' : undefined}
                className="bg-primary hover:bg-primary-dark text-neutral-900 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Abrir casillero
              </a>
            </div>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="bg-neutral-900 pt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Casillero en Miami para Costa Rica
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              Comprá sin fronteras.
              <br />
              <span className="text-primary">Nosotros lo traemos.</span>
            </h1>

            <p className="text-neutral-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
              Recibimos tus paquetes en nuestra bodega, los agrupamos en una sola orden de envío y
              los entregamos en Costa Rica.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={whatsappHref ?? '#contacto'}
                target={whatsappHref ? '_blank' : undefined}
                rel={whatsappHref ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-primary/20"
              >
                <MessageCircle size={20} />
                Abrir mi casillero
              </a>
              <a
                href="#como-funciona"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors border border-white/10"
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Datos reales tomados de system_settings */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">
                  {currency(rates.price_per_lb_crc)}
                </div>
                <div className="text-neutral-400 text-sm mt-1">Por libra</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">
                  {rates.min_weight} lb
                </div>
                <div className="text-neutral-400 text-sm mt-1">Peso mínimo por paquete</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">3</div>
                <div className="text-neutral-400 text-sm mt-1">Etapas con seguimiento</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CÓMO FUNCIONA ─── */}
        <section id="como-funciona" className="py-24 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                ¿Cómo funciona?
              </h2>
              <p className="text-neutral-500 text-lg max-w-xl mx-auto">
                Estas son las tres etapas por las que pasa tu paquete, las mismas que ves al
                rastrearlo en línea.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {LIFECYCLE.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative bg-white rounded-2xl p-8 border border-neutral-200 text-center"
                  >
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
                      <Icon size={30} className="text-neutral-900" />
                    </div>
                    <div className="text-xs font-bold text-primary-dark uppercase tracking-widest mb-2">
                      Etapa {index + 1}
                    </div>
                    <h3 className="font-display font-bold text-neutral-900 text-lg mb-2">
                      {step.title}
                    </h3>
                    <p className="text-neutral-500 text-sm">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── TARIFAS + CALCULADORA ─── */}
        <section id="tarifas" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                Tarifas claras, sin sorpresas
              </h2>
              <p className="text-neutral-500 text-lg max-w-xl mx-auto">
                Pagás por el peso de tu paquete más el método de entrega que elijás. Sin membresía
                mensual.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200 text-center">
                <div className="w-12 h-12 bg-primary-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Scale size={24} className="text-primary-dark" />
                </div>
                <div className="font-display text-4xl font-extrabold text-neutral-900 mb-1">
                  {currency(rates.price_per_lb_crc)}
                </div>
                <div className="text-neutral-500 text-sm mb-4">por libra</div>
                <p className="text-neutral-600 text-sm">
                  Se cobra el peso real o el mínimo de {rates.min_weight} lb, lo que sea mayor.
                </p>
              </div>

              <div className="bg-primary rounded-2xl p-8 text-center relative overflow-hidden shadow-xl shadow-primary/25">
                <div className="absolute top-4 right-4 bg-neutral-900/15 text-neutral-900 text-xs font-bold px-2 py-1 rounded-full">
                  Más elegido
                </div>
                <div className="w-12 h-12 bg-neutral-900/15 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Boxes size={24} className="text-neutral-900" />
                </div>
                <div className="font-display text-4xl font-extrabold text-neutral-900 mb-1">
                  Retiro
                </div>
                <div className="text-neutral-900/70 text-sm mb-4">sin costo de entrega</div>
                <p className="text-neutral-900/80 text-sm">
                  Agrupá varios paquetes en una orden de envío y retiralos en nuestro punto de
                  entrega.
                </p>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200 text-center">
                <div className="w-12 h-12 bg-primary-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-primary-dark" />
                </div>
                <div className="font-display text-4xl font-extrabold text-neutral-900 mb-1">
                  {currency(Math.min(rates.correos_fee_crc, rates.tracopa_fee_crc))}
                </div>
                <div className="text-neutral-500 text-sm mb-4">desde, envío a todo el país</div>
                <p className="text-neutral-600 text-sm">
                  Correos de Costa Rica {currency(rates.correos_fee_crc)} · Tracopa{' '}
                  {currency(rates.tracopa_fee_crc)}.
                </p>
              </div>
            </div>

            {/* ─── CALCULADORA ─── */}
            <div className="mt-14 bg-neutral-900 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="font-display text-white font-bold text-xl mb-6 text-center">
                Calculá el costo de tu envío
              </h3>

              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="peso-input"
                    className="text-neutral-400 text-sm mb-2 block font-medium"
                  >
                    Peso del paquete (libras)
                  </label>
                  <input
                    id="peso-input"
                    type="number"
                    min="1"
                    step="1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <span className="text-neutral-400 text-sm mb-2 block font-medium">
                    Método de entrega
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {deliveryOptions.map((option) => {
                      const active = method === option.code;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          onClick={() => setMethod(option.code)}
                          className={`rounded-xl px-3 py-3 text-left border transition-colors ${
                            active
                              ? 'bg-primary border-primary text-neutral-900'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500'
                          }`}
                        >
                          <span className="block text-sm font-bold">{option.label}</span>
                          <span
                            className={`block text-xs mt-0.5 ${
                              active ? 'text-neutral-900/70' : 'text-neutral-500'
                            }`}
                          >
                            {option.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-neutral-800 rounded-xl px-5 py-4 border border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-sm">Total estimado</span>
                    <span className="font-display text-primary font-bold text-3xl">
                      {loadingQuote && !quote ? '…' : quote ? currency(quote.total_crc) : '—'}
                    </span>
                  </div>

                  {quote && (
                    <div className="mt-4 pt-4 border-t border-neutral-700 space-y-1.5 text-sm">
                      <div className="flex justify-between text-neutral-400">
                        <span>Peso cobrado</span>
                        <span className="text-neutral-200">{quote.charged_weight_lb} lb</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Envío</span>
                        <span className="text-neutral-200">{currency(quote.shipping_crc)}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Entrega</span>
                        <span className="text-neutral-200">
                          {quote.delivery_fee_crc > 0 ? currency(quote.delivery_fee_crc) : 'Incluido'}
                        </span>
                      </div>
                    </div>
                  )}

                  {quoteError && <p className="text-danger text-sm mt-3">{quoteError}</p>}
                </div>
              </div>

              <p className="text-neutral-500 text-xs mt-5 text-center">
                Monto estimado. El total definitivo se calcula al registrar el paquete en bodega con
                su peso real.
              </p>
            </div>
          </div>
        </section>

        {/* ─── BENEFICIOS ─── */}
        <section id="beneficios" className="py-24 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                ¿Por qué elegir Magastore?
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="flex gap-4 bg-white rounded-2xl p-6 border border-neutral-200"
                  >
                    <div className="w-11 h-11 bg-primary-soft rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={22} className="text-primary-dark" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-neutral-900 mb-1">
                        {benefit.title}
                      </h4>
                      <p className="text-neutral-500 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                Preguntas frecuentes
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: '¿Dónde recibo mis compras?',
                  a: 'Te asignamos una dirección en Miami para que la usés al comprar. Cuando tu paquete llega a la bodega Magastore lo registramos y lo preparamos para su envío a Costa Rica.',
                },
                {
                  q: '¿Hay membresía o costo de inscripción?',
                  a: `No. Abrir tu casillero es gratis. Pagás únicamente cuando hacés un envío: ${currency(rates.price_per_lb_crc)} por libra más la tarifa del método de entrega que elijas.`,
                },
                {
                  q: '¿Puedo agrupar varios paquetes en un solo envío?',
                  a: 'Sí. Agrupamos tus paquetes en una orden de envío y se cobra una sola tarifa de entrega para todo el grupo.',
                },
                {
                  q: '¿Cómo se calcula el peso que me cobran?',
                  a: `Se cobra el peso real del paquete o el mínimo de ${rates.min_weight} lb, lo que resulte mayor.`,
                },
                {
                  q: '¿Qué necesito para registrarme?',
                  a: 'Tu número de identificación (cédula física, jurídica, DIMEX o pasaporte), correo electrónico, teléfono y una dirección de entrega en Costa Rica.',
                },
                {
                  q: '¿Cómo rastreo mi paquete?',
                  a: 'Con tu número de tracking en nuestra página de seguimiento. No necesitás iniciar sesión para consultarlo.',
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group bg-neutral-50 rounded-xl border border-neutral-200 open:border-primary open:bg-primary-soft/40 transition-colors"
                >
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-neutral-900">
                    {item.q}
                    <ChevronDown
                      size={20}
                      className="text-neutral-400 group-open:rotate-180 transition-transform flex-shrink-0"
                    />
                  </summary>
                  <p className="px-6 pb-5 text-neutral-600 text-sm leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA CONTACTO ─── */}
        <section id="contacto" className="py-24 bg-neutral-900">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Empezá hoy
            </h2>
            <p className="text-neutral-300 text-lg mb-10">
              Escribinos por WhatsApp y te abrimos tu casillero. Es gratis y sin compromisos.
            </p>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-primary/20"
              >
                <MessageCircle size={20} />
                Escribinos por WhatsApp
              </a>
            ) : (
              <Link
                href={routesPublic.tracking}
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-primary/20"
              >
                <Search size={20} />
                Rastreá tu paquete
              </Link>
            )}

            <div className="mt-10 flex items-center justify-center gap-2 text-neutral-400 text-sm">
              <CheckCircle2 size={16} className="text-primary" />
              Abrir el casillero no tiene costo
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-neutral-900 py-12 border-t border-neutral-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo/magastore-logo-light.png"
                  alt="Magastore"
                  width={120}
                  height={28}
                  className="h-7 w-auto"
                />
                <span className="text-neutral-500 text-sm">
                  © {new Date().getFullYear()}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm text-neutral-400">
                <Link href={routesPublic.tracking} className="hover:text-primary transition-colors">
                  Rastrear paquete
                </Link>
                <Link href={routesPublic.login} className="hover:text-primary transition-colors">
                  Iniciar sesión
                </Link>
                <span className="flex items-center gap-1.5">
                  <Globe size={14} />
                  Costa Rica
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const rates = await SettingsService.getPublicRates();

  return { props: { rates } };
};

export default LandingPage;
