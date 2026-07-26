import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Inter, Poppins } from 'next/font/google';
import type { GetServerSideProps } from 'next';
import {
  Boxes,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  MapPin,
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

/** Todo el landing muestra dólares. Nunca se publican montos en colones. */
const usd = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Animaciones ──────────────────────────────────────────────────────────
 * Mismo efecto de reveal-on-scroll y curva de easing que usa landing-grupotnt
 * con framer-motion, reproducido con IntersectionObserver + transiciones CSS
 * para no agregar esa dependencia al backoffice por una sola página.
 */
const EASE_EDITORIAL = 'cubic-bezier(0.16, 0.8, 0.2, 1)';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  strong?: boolean;
}

const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, strong = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respetamos a quien pidió menos movimiento en el sistema operativo.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '-80px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(0) scale(1)'
          : `translateY(${strong ? 32 : 20}px) scale(${strong ? 0.97 : 1})`,
        transition: `opacity ${strong ? 0.8 : 0.6}s ${EASE_EDITORIAL} ${delay}s, transform ${
          strong ? 0.8 : 0.6
        }s ${EASE_EDITORIAL} ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.01 3C9.38 3 4 8.37 4 15c0 2.29.62 4.44 1.7 6.29L3 29l7.9-2.62A11.9 11.9 0 0 0 16.01 27C22.63 27 28 21.63 28 15S22.63 3 16.01 3Zm0 21.7c-1.94 0-3.75-.55-5.29-1.5l-.38-.23-4.7 1.56 1.53-4.58-.25-.4A9.63 9.63 0 0 1 5.5 15c0-5.8 4.71-10.5 10.51-10.5 5.8 0 10.5 4.7 10.5 10.5s-4.7 10.7-10.5 10.7Zm5.75-7.85c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.19.21-.37.24-.68.08-.31-.16-1.32-.49-2.51-1.56-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.19.21-.31.31-.52.1-.21.05-.4-.02-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.4-.29.31-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.38 4.76.75.32 1.34.51 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z"
    />
  </svg>
);

/**
 * FAB de WhatsApp anclado abajo a la derecha, en el mismo lugar donde el
 * backoffice muestra el devtools de React Query.
 */
const WhatsappFab: React.FC<{ href: string }> = ({ href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Escribinos por WhatsApp"
    className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform duration-300 hover:scale-110 active:scale-95"
    style={{
      backgroundColor: '#25D366',
      boxShadow: '0 8px 24px rgba(37,211,102,0.45)',
      transitionTimingFunction: EASE_EDITORIAL,
    }}
  >
    <WhatsappIcon className="w-7 h-7" />
  </a>
);

/**
 * Etapas del paquete tal como las ve el cliente. Se corresponden con el enum
 * `PackageStatus` (PANAMA / EN_TRAMITE / ENTREGADO) pero con la nomenclatura
 * pública: de cara al cliente el origen es Miami y la primera etapa es la
 * bodega Magastore. La operación interna no se menciona.
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
      'Coordinamos la entrega en Costa Rica según el método que elijás y recibís la factura por correo.',
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
    icon: Camera,
    title: 'Evidencia fotográfica',
    description:
      'Al recibir tu paquete le tomamos foto y registramos su peso real, para que sepás exactamente qué llegó.',
  },
  {
    icon: ClipboardList,
    title: 'Bitácora de cada paquete',
    description:
      'Registramos cada evento del paquete: recepción, novedades y entrega, con fecha y ubicación.',
  },
  {
    icon: FileText,
    title: 'Factura descargable',
    description:
      'Cada envío genera una factura con el peso cobrado y el detalle de las tarifas, descargable en PDF.',
  },
];

/** Qué información necesitamos y por qué. Se corresponde con el alta real de clientes. */
const REQUIREMENTS = [
  {
    icon: CreditCard,
    title: 'Identificación',
    description: 'Cédula física, jurídica, DIMEX o pasaporte. Es lo que identifica tus envíos.',
  },
  {
    icon: MapPin,
    title: 'Dirección en Costa Rica',
    description:
      'Provincia, cantón, distrito y señas exactas. Podés registrar más de una y marcar la principal.',
  },
  {
    icon: ShieldCheck,
    title: 'Correo y teléfono',
    description:
      'Ahí te avisamos cuando el paquete se entrega y te enviamos la factura del envío.',
  },
];

type DeliveryOption = {
  code: PublicDeliveryMethod;
  label: string;
  hint: string;
};

interface QuoteState {
  charged_weight_lb: number;
  shipping_usd: number;
  delivery_fee_usd: number;
  total_usd: number;
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
    { code: 'CORREOS', label: 'Correos de Costa Rica', hint: usd(rates.correos_fee_usd) },
  ];

  const fetchQuote = useCallback(
    async (weightValue: string, deliveryMethod: PublicDeliveryMethod) => {
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
    },
    [],
  );

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
    'Recibimos tus compras en nuestra bodega y las llevamos hasta Costa Rica. Tarifas claras por libra en dólares, seguimiento en línea y entrega a todo el país.';

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
        <nav className="fixed top-0 inset-x-0 z-40 bg-neutral-900/95 backdrop-blur border-b border-neutral-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2.5 flex-shrink-0">
              <Image
                src="/logo/magastore-logo-light.png"
                alt="Magastore"
                width={140}
                height={32}
                className="h-7 sm:h-8 w-auto"
                priority
              />
            </Link>

            <div className="hidden md:flex items-center gap-7 text-sm text-neutral-300">
              <a href="#como-funciona" className="hover:text-accent transition-colors">
                Cómo funciona
              </a>
              <a href="#tarifas" className="hover:text-accent transition-colors">
                Tarifas
              </a>
              <a href="#beneficios" className="hover:text-accent transition-colors">
                Beneficios
              </a>
              <a href="#faq" className="hover:text-accent transition-colors">
                Preguntas
              </a>
            </div>

            <a
              href={whatsappHref ?? '#contacto'}
              target={whatsappHref ? '_blank' : undefined}
              rel={whatsappHref ? 'noopener noreferrer' : undefined}
              className="bg-accent hover:bg-accent-dark text-neutral-900 text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              Abrir casillero
            </a>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="bg-neutral-900 pt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full mb-8">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Casillero en Miami para Costa Rica
              </div>
            </Reveal>

            <Reveal delay={0.08} strong>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                Comprá sin fronteras.
                <br />
                <span className="text-accent">Nosotros lo traemos.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-neutral-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10">
                Recibimos tus paquetes en nuestra bodega, los agrupamos en una sola orden de envío y
                los entregamos en Costa Rica.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={whatsappHref ?? '#contacto'}
                  target={whatsappHref ? '_blank' : undefined}
                  rel={whatsappHref ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-accent/20"
                >
                  <WhatsappIcon className="w-5 h-5" />
                  Abrir mi casillero
                </a>
                <a
                  href="#tarifas"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors border border-white/10"
                >
                  Calcular mi envío
                </a>
              </div>
            </Reveal>

            {/* Datos reales tomados de system_settings */}
            <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { value: usd(rates.price_per_lb_usd), label: 'Por libra' },
                { value: `${rates.min_weight} lb`, label: 'Peso mínimo por paquete' },
                { value: '3', label: 'Etapas con seguimiento' },
              ].map((stat, index) => (
                <Reveal key={stat.label} delay={0.32 + index * 0.08}>
                  <div className="text-center">
                    <div className="font-display text-3xl font-extrabold text-white">
                      {stat.value}
                    </div>
                    <div className="text-neutral-400 text-sm mt-1">{stat.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CÓMO FUNCIONA ─── */}
        <section id="como-funciona" className="py-16 sm:py-24 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                  ¿Cómo funciona?
                </h2>
                <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto">
                  Estas son las tres etapas por las que pasa tu paquete, las mismas que ves al
                  consultar su estado.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {LIFECYCLE.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.title} delay={index * 0.1}>
                    <div className="h-full bg-white rounded-2xl p-7 sm:p-8 border border-neutral-200 text-center transition-transform duration-300 hover:-translate-y-1">
                      <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent/25">
                        <Icon size={30} className="text-neutral-900" />
                      </div>
                      <div className="text-xs font-bold text-accent-dark uppercase tracking-widest mb-2">
                        Etapa {index + 1}
                      </div>
                      <h3 className="font-display font-bold text-neutral-900 text-lg mb-2">
                        {step.title}
                      </h3>
                      <p className="text-neutral-500 text-sm">{step.description}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── TARIFAS + CALCULADORA ─── */}
        <section id="tarifas" className="py-16 sm:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                  Tarifas claras, sin sorpresas
                </h2>
                <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto">
                  Pagás por el peso de tu paquete más el método de entrega que elijás. Sin membresía
                  mensual.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <Reveal>
                <div className="h-full bg-neutral-50 rounded-2xl p-8 border border-neutral-200 text-center">
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Scale size={24} className="text-accent-dark" />
                  </div>
                  <div className="font-display text-4xl font-extrabold text-neutral-900 mb-1">
                    {usd(rates.price_per_lb_usd)}
                  </div>
                  <div className="text-neutral-500 text-sm mb-4">por libra</div>
                  <p className="text-neutral-600 text-sm">
                    Se cobra el peso real o el mínimo de {rates.min_weight} lb, lo que sea mayor.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="h-full bg-accent rounded-2xl p-8 text-center relative overflow-hidden shadow-xl shadow-accent/25">
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
              </Reveal>

              <Reveal delay={0.2}>
                <div className="h-full bg-neutral-50 rounded-2xl p-8 border border-neutral-200 text-center">
                  <div className="w-12 h-12 bg-accent-soft rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Truck size={24} className="text-accent-dark" />
                  </div>
                  <div className="font-display text-4xl font-extrabold text-neutral-900 mb-1">
                    {usd(rates.correos_fee_usd)}
                  </div>
                  <div className="text-neutral-500 text-sm mb-4">envío por Correos</div>
                  <p className="text-neutral-600 text-sm">
                    Entrega por Correos de Costa Rica a cualquier provincia del país.
                  </p>
                </div>
              </Reveal>
            </div>

            {/* ─── CALCULADORA ─── */}
            <Reveal strong>
              <div className="mt-12 sm:mt-14 bg-neutral-900 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
                <h3 className="font-display text-white font-bold text-lg sm:text-xl mb-6 text-center">
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
                      inputMode="decimal"
                      min="1"
                      step="1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <span className="text-neutral-400 text-sm mb-2 block font-medium">
                      Método de entrega
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {deliveryOptions.map((option) => {
                        const active = method === option.code;
                        return (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => setMethod(option.code)}
                            className={`rounded-xl px-4 py-3 text-left border transition-all duration-200 ${
                              active
                                ? 'bg-accent border-accent text-neutral-900'
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

                  <div className="bg-neutral-800 rounded-xl px-4 sm:px-5 py-4 border border-neutral-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-neutral-400 text-sm">Total estimado</span>
                      <span className="font-display text-accent font-bold text-2xl sm:text-3xl transition-opacity duration-200">
                        {loadingQuote && !quote ? '…' : quote ? usd(quote.total_usd) : '—'}
                      </span>
                    </div>

                    {quote && (
                      <div className="mt-4 pt-4 border-t border-neutral-700 space-y-1.5 text-sm animate-in fade-in duration-300">
                        <div className="flex justify-between text-neutral-400">
                          <span>Peso cobrado</span>
                          <span className="text-neutral-200">{quote.charged_weight_lb} lb</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Envío</span>
                          <span className="text-neutral-200">{usd(quote.shipping_usd)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Entrega</span>
                          <span className="text-neutral-200">
                            {quote.delivery_fee_usd > 0 ? usd(quote.delivery_fee_usd) : 'Incluido'}
                          </span>
                        </div>
                      </div>
                    )}

                    {quoteError && <p className="text-danger text-sm mt-3">{quoteError}</p>}
                  </div>
                </div>

                <p className="text-neutral-500 text-xs mt-5 text-center">
                  Monto estimado en dólares. El total definitivo se calcula al registrar el paquete
                  en bodega con su peso real.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── BENEFICIOS ─── */}
        <section id="beneficios" className="py-16 sm:py-24 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                  ¿Por qué elegir Magastore?
                </h2>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {BENEFITS.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Reveal key={benefit.title} delay={index * 0.08}>
                    <div className="h-full flex gap-4 bg-white rounded-2xl p-6 border border-neutral-200 transition-transform duration-300 hover:-translate-y-1">
                      <div className="w-11 h-11 bg-accent-soft rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={22} className="text-accent-dark" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-neutral-900 mb-1">
                          {benefit.title}
                        </h4>
                        <p className="text-neutral-500 text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── QUÉ NECESITÁS ─── */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                  ¿Qué necesitás para abrir tu casillero?
                </h2>
                <p className="text-neutral-500 text-base sm:text-lg max-w-xl mx-auto">
                  Tres datos y quedás registrado. No hay costo de inscripción ni membresía.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {REQUIREMENTS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={index * 0.1}>
                    <div className="h-full bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                      <div className="w-11 h-11 bg-accent-soft rounded-lg flex items-center justify-center mb-4">
                        <Icon size={22} className="text-accent-dark" />
                      </div>
                      <h4 className="font-display font-bold text-neutral-900 mb-1.5">
                        {item.title}
                      </h4>
                      <p className="text-neutral-500 text-sm">{item.description}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="py-16 sm:py-24 bg-neutral-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Reveal>
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-4">
                  Preguntas frecuentes
                </h2>
              </div>
            </Reveal>

            <div className="space-y-4">
              {[
                {
                  q: '¿Dónde recibo mis compras?',
                  a: 'Te asignamos una dirección en Miami para que la usés al comprar. Cuando tu paquete llega a la bodega Magastore lo registramos y lo preparamos para su envío a Costa Rica.',
                },
                {
                  q: '¿Hay membresía o costo de inscripción?',
                  a: `No. Abrir tu casillero es gratis. Pagás únicamente cuando hacés un envío: ${usd(rates.price_per_lb_usd)} por libra más la tarifa del método de entrega que elijás.`,
                },
                {
                  q: '¿En qué moneda se cobran las tarifas?',
                  a: 'Todas las tarifas se manejan en dólares estadounidenses.',
                },
                {
                  q: '¿Puedo agrupar varios paquetes en un solo envío?',
                  a: 'Sí. Agrupamos tus paquetes en una orden de envío y se cobra una sola tarifa de entrega para todo el grupo, sin importar cuántos paquetes incluya.',
                },
                {
                  q: '¿Cómo se calcula el peso que me cobran?',
                  a: `Se cobra el peso real del paquete o el mínimo de ${rates.min_weight} lb, lo que resulte mayor. El peso se registra en bodega al recibir tu paquete.`,
                },
                {
                  q: '¿Cómo recibo mi paquete en Costa Rica?',
                  a: 'Podés retirarlo en nuestro punto de entrega sin costo adicional, o pedir el envío por Correos de Costa Rica a cualquier provincia.',
                },
                {
                  q: '¿Cómo sé que mi paquete llegó?',
                  a: 'Te avisamos por correo cuando se entrega, y ahí mismo recibís la factura del envío con el detalle de lo cobrado.',
                },
              ].map((item, index) => (
                <Reveal key={item.q} delay={index * 0.05}>
                  <details className="group bg-white rounded-xl border border-neutral-200 open:border-accent transition-colors">
                    <summary className="flex items-center justify-between gap-4 px-5 sm:px-6 py-5 cursor-pointer list-none font-semibold text-neutral-900 text-sm sm:text-base">
                      {item.q}
                      <ChevronDown
                        size={20}
                        className="text-neutral-400 group-open:rotate-180 transition-transform duration-300 flex-shrink-0"
                      />
                    </summary>
                    <p className="px-5 sm:px-6 pb-5 text-neutral-600 text-sm leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA CONTACTO ─── */}
        <section id="contacto" className="py-16 sm:py-24 bg-neutral-900">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <Reveal strong>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Empezá hoy
              </h2>
              <p className="text-neutral-300 text-base sm:text-lg mb-10">
                Escribinos por WhatsApp y te abrimos tu casillero. Es gratis y sin compromisos.
              </p>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-accent/20"
                >
                  <WhatsappIcon className="w-5 h-5" />
                  Escribinos por WhatsApp
                </a>
              ) : (
                <a
                  href="#tarifas"
                  className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-neutral-900 font-bold px-8 py-4 rounded-xl text-base transition-all hover:-translate-y-0.5 shadow-lg shadow-accent/20"
                >
                  <Search size={20} />
                  Calculá tu envío
                </a>
              )}

              <div className="mt-10 flex items-center justify-center gap-2 text-neutral-400 text-sm">
                <CheckCircle2 size={16} className="text-accent" />
                Abrir el casillero no tiene costo
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-neutral-900 py-10 sm:py-12 border-t border-neutral-800">
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
                <span className="text-neutral-500 text-sm">© {new Date().getFullYear()}</span>
              </div>

              <div className="flex items-center gap-5 sm:gap-6 text-sm text-neutral-400">
                <a href="#tarifas" className="hover:text-accent transition-colors">
                  Tarifas
                </a>
                <a href="#faq" className="hover:text-accent transition-colors">
                  Preguntas
                </a>
                <Link href={routesPublic.login} className="hover:text-accent transition-colors">
                  Iniciar sesión
                </Link>
              </div>
            </div>

            {/* Créditos */}
            <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-xs text-neutral-500 text-center">
              <span>
                Magastore por <span className="text-neutral-300">Fernando Gutiérrez</span>
              </span>
              <span className="hidden sm:inline text-neutral-700">·</span>
              <span>
                Desarrollado por <span className="text-neutral-300">Farid Villacís Leiva</span>
              </span>
            </div>
          </div>
        </footer>

        {whatsappHref && <WhatsappFab href={whatsappHref} />}
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const rates = await SettingsService.getPublicRates();

  return { props: { rates } };
};

export default LandingPage;
