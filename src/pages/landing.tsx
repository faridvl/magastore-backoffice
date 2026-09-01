import React from 'react';
import Head from 'next/head';
import { Montserrat } from 'next/font/google';
import type { GetServerSideProps } from 'next';
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Headphones,
  MapPin,
  PackageCheck,
  PackageOpen,
  PlaneTakeoff,
  ScanBarcode,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Timer,
  Warehouse,
} from 'lucide-react';
import * as SettingsService from '@/shared/api/services/settings.service';
import type { PublicRates } from '@/types/settings/settings.types';
import {
  BrandButton,
  BrandImage,
  CalculatorPanel,
  Container,
  Eyebrow,
  Footer,
  Heading,
  IconCard,
  Lead,
  Navbar,
  Reveal,
  Section,
  ServiceCard,
  StepCard,
  WhatsappFab,
  WhatsappIcon,
  brandCssVars,
} from '@/components/landing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://magastorecr.com';
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

const WHATSAPP_MESSAGE =
  'Hola, quiero abrir mi casillero en Magastore para traer mis compras desde Miami.';

/**
 * Montserrat es la tipografía de la marca. Se carga con next/font únicamente
 * en esta página: `_document.tsx` y `tailwind.config.js` sirven al backoffice
 * entero y no deben cambiar por el landing.
 */
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

/** Todo el landing muestra dólares. Nunca se publican montos en colones. */
const usd = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Barra de confianza bajo el hero. */
const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Compras protegidas',
    description: 'Registramos y fotografiamos cada paquete',
  },
  {
    icon: Timer,
    title: 'Seguimiento en línea',
    description: 'Consultá el estado cuando querás',
  },
  {
    icon: Boxes,
    title: 'Agrupá y ahorrá',
    description: 'Varios paquetes, una sola entrega',
  },
  {
    icon: Headphones,
    title: 'Te acompañamos',
    description: 'Asistencia por WhatsApp',
  },
];

/**
 * Los seis pasos del proceso tal como los ve el cliente. Se corresponden con
 * el enum `PackageStatus` (PANAMA / EN_TRAMITE / ENTREGADO) desglosado en las
 * acciones que el cliente reconoce; de cara al público el origen es Miami.
 */
const PROCESS_STEPS = [
  {
    icon: Warehouse,
    title: 'Creás tu casillero',
    description: 'Te damos una dirección en Estados Unidos para tus compras.',
  },
  {
    icon: ShoppingCart,
    title: 'Comprás en línea',
    description: 'Comprás en tus tiendas favoritas y enviás a tu casillero.',
  },
  {
    icon: ScanBarcode,
    title: 'Registramos tu paquete',
    description: 'Lo pesamos, lo fotografiamos y te avisamos que llegó.',
  },
  {
    icon: PackageOpen,
    title: 'Consolidamos',
    description: 'Si tenés varios paquetes, los agrupamos en un solo envío.',
  },
  {
    icon: PlaneTakeoff,
    title: 'Enviamos a Costa Rica',
    description: 'Tu paquete viaja hasta nuestro punto de entrega.',
  },
  {
    icon: PackageCheck,
    title: 'Recibís tu compra',
    description: 'Coordinamos la entrega y te enviamos la factura.',
  },
];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Seguridad total',
    description: 'Registramos tu paquete con foto y peso real apenas llega a bodega.',
  },
  {
    icon: DollarSign,
    title: 'Tarifas claras',
    description: 'Pagás por libra, sin membresía mensual ni costos ocultos.',
  },
  {
    icon: ClipboardList,
    title: 'Bitácora completa',
    description: 'Cada evento del paquete queda registrado con fecha y ubicación.',
  },
  {
    icon: FileText,
    title: 'Factura descargable',
    description: 'Cada envío genera su factura en PDF con el detalle de lo cobrado.',
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
    description: 'Provincia, cantón, distrito y señas exactas. Podés registrar más de una.',
  },
  {
    icon: ShieldCheck,
    title: 'Correo y teléfono',
    description: 'Ahí te avisamos cuando el paquete se entrega y te enviamos la factura.',
  },
];

const BRIDGE_ITEMS = [
  { icon: ShoppingCart, label: 'Comprás sin límites' },
  { icon: Boxes, label: 'Consolidamos por vos' },
  { icon: MapPin, label: 'Entregamos en Costa Rica' },
];

interface LandingPageProps {
  rates: PublicRates;
}

const LandingPage: React.FC<LandingPageProps> = ({ rates }) => {
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
    : null;

  const ctaHref = whatsappHref ?? '#contacto';
  const ctaExternal = Boolean(whatsappHref);

  const pageTitle = 'Magastore — Tu casillero en Miami para Costa Rica';
  const pageDescription =
    'Recibimos tus compras en nuestra bodega y las llevamos hasta Costa Rica. Tarifas claras por libra en dólares, seguimiento en línea y entrega a todo el país.';

  const faqItems = [
    {
      q: '¿Dónde recibo mis compras?',
      a: 'Te asignamos una dirección en Miami para que la usés al comprar. Cuando tu paquete llega a la bodega Magastore lo registramos y lo preparamos para su envío a Costa Rica.',
    },
    {
      q: '¿Hay membresía o costo de inscripción?',
      a: `No. Abrir tu casillero es gratis. Pagás únicamente cuando hacés un envío: ${usd(
        rates.price_per_lb_usd,
      )} por libra más la tarifa del método de entrega que elijás.`,
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
  ];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="theme-color" content="#000000" />
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
        style={brandCssVars}
        className={`${montserrat.className} scroll-smooth bg-black antialiased`}
      >
        <Navbar ctaHref={ctaHref} ctaExternal={ctaExternal} />

        <main>
          {/* ─── HERO ─── */}
          <section id="inicio" className="relative isolate flex min-h-[88vh] items-center pt-20">
            {/* La imagen ocupa todo el ancho y el degradado la oscurece por la
                izquierda: en desktop el texto queda sobre negro sólido y la
                escena se ve limpia a la derecha, como en el arte de marca. */}
            <div className="absolute inset-0 -z-10">
              <BrandImage name="hero" priority sizes="100vw" overlay={false} />
            </div>
            {/* En mobile la foto queda detrás del texto: el velo vertical
                garantiza el contraste. Desde lg el degradado es horizontal y
                deja la escena despejada a la derecha. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 lg:hidden"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.75) 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 hidden lg:block"
              style={{
                background:
                  'linear-gradient(to right, #000 0%, rgba(0,0,0,0.92) 32%, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0.25) 100%)',
              }}
            />

            <Container size="wide" className="py-20">
              <div className="max-w-xl">
                <Reveal strong>
                  <Heading as="h1" size="hero" className="uppercase">
                    Conectamos
                    <br />
                    tus compras
                    <br />
                    <span className="text-[var(--mg-gold)]">con Costa Rica</span>
                  </Heading>
                </Reveal>

                <Reveal delay={0.12}>
                  <Lead className="mt-7 max-w-lg">
                    Te damos un casillero en Estados Unidos y nos encargamos de llevar tus compras
                    hasta la puerta de tu casa.
                  </Lead>
                </Reveal>

                <Reveal delay={0.2}>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <BrandButton href={ctaHref} external={ctaExternal} size="lg">
                      Crea tu casillero
                    </BrandButton>
                    <BrandButton href="#tarifas" variant="secondary" size="lg">
                      Cotiza ahora
                    </BrandButton>
                  </div>
                </Reveal>
              </div>
            </Container>
          </section>

          {/* ─── BARRA DE CONFIANZA ─── */}
          <Section tone="raised" spacing="tight" className="border-y border-white/10">
            <Container size="wide">
              <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {TRUST_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Reveal key={item.title} delay={index * 0.06}>
                      <li className="flex items-start gap-3.5">
                        <Icon
                          size={22}
                          strokeWidth={1.5}
                          className="mt-0.5 flex-shrink-0 text-[var(--mg-gold)]"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[var(--mg-gold)]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-white/50">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    </Reveal>
                  );
                })}
              </ul>
            </Container>
          </Section>

          {/* ─── POR QUÉ ELEGIRNOS ─── */}
          <Section id="nosotros">
            <Container size="wide">
              <Reveal>
                <Eyebrow>¿Por qué elegir Magastore?</Eyebrow>
                <Heading className="mt-4 max-w-xl">
                  Hacemos que importar sea simple, seguro y accesible
                </Heading>
              </Reveal>

              <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {BENEFITS.map((benefit, index) => (
                  <Reveal key={benefit.title} delay={index * 0.08}>
                    <IconCard {...benefit} />
                  </Reveal>
                ))}
              </div>
            </Container>
          </Section>

          {/* ─── PUENTE A ESTADOS UNIDOS ─── */}
          <section className="relative isolate overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[var(--mg-brown-gold)]" />
            <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 lg:block">
              <BrandImage name="bridge" overlay={false} sizes="50vw" />
            </div>
            {/* Difumina el borde izquierdo de la foto contra la banda dorada. */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 lg:block"
              style={{
                background:
                  'linear-gradient(to right, var(--mg-brown-gold) 0%, rgba(111,79,13,0.5) 30%, rgba(111,79,13,0) 65%)',
              }}
            />

            <Container size="wide" className="py-16 sm:py-20">
              <div className="max-w-lg">
                <Reveal>
                  <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--mg-gold)]">
                    Más que un casillero,
                  </p>
                  <Heading className="mt-2">somos tu puente a Estados Unidos</Heading>
                </Reveal>

                <Reveal delay={0.1}>
                  <ul className="mt-9 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-8">
                    {BRIDGE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label} className="flex items-center gap-2.5">
                          <Icon
                            size={20}
                            strokeWidth={1.5}
                            className="flex-shrink-0 text-[var(--mg-gold)]"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-[var(--mg-white)]">
                            {item.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Reveal>
              </div>
            </Container>
          </section>

          {/* ─── CÓMO FUNCIONA ─── */}
          <Section id="como-funciona">
            <Container size="wide">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,300px)_1fr] lg:gap-14">
                <Reveal>
                  <Eyebrow>¿Cómo funciona?</Eyebrow>
                  <Heading className="mt-4 text-balance">
                    Así de fácil es comprar con{' '}
                    <span className="text-[var(--mg-gold)]">Magastore</span>
                  </Heading>
                </Reveal>

                <div className="relative">
                  {/* Línea que une los seis pasos. Solo en desktop, donde
                      están en fila; en mobile los pasos van apilados. */}
                  <div
                    aria-hidden="true"
                    className="absolute left-0 right-0 top-[62px] hidden border-t border-dashed border-[rgba(241,212,91,0.3)] lg:block"
                  />
                  <ol className="relative grid grid-cols-1 gap-x-6 gap-y-10 xs:grid-cols-2 sm:grid-cols-3 sm:gap-y-12 lg:grid-cols-6 lg:gap-x-4">
                    {PROCESS_STEPS.map((step, index) => (
                      <Reveal key={step.title} delay={index * 0.07}>
                        <li>
                          <StepCard
                            icon={step.icon}
                            step={index + 1}
                            title={step.title}
                            description={step.description}
                          />
                        </li>
                      </Reveal>
                    ))}
                  </ol>
                </div>
              </div>
            </Container>
          </Section>

          {/* ─── SERVICIOS ─── */}
          <Section id="servicios" tone="raised" spacing="none">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr]">
              <div className="relative h-48 sm:h-64 lg:h-auto lg:min-h-full">
                <BrandImage
                  name="warehouse"
                  overlay={false}
                  sizes="(max-width: 1024px) 100vw, 380px"
                />
              </div>

              <div className="px-5 py-20 sm:px-8 lg:py-24 lg:pl-16 lg:pr-8">
                <div className="mx-auto max-w-3xl lg:mx-0">
                  <Reveal>
                    <Eyebrow>Nuestros servicios</Eyebrow>
                    <Heading className="mt-4">Soluciones diseñadas para vos</Heading>
                  </Reveal>

                  <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Reveal delay={0.08}>
                      <ServiceCard
                        icon={Warehouse}
                        title="Casillero en Estados Unidos"
                        description="Te damos una dirección física para que compres en tus tiendas favoritas de Estados Unidos y recibas todo en un solo lugar."
                        href="#como-funciona"
                        ctaLabel="Cómo funciona"
                      />
                    </Reveal>
                    <Reveal delay={0.16}>
                      <ServiceCard
                        icon={ShoppingBag}
                        title="Compras asistidas"
                        description="Asistencia para realizar compras internacionales. Te ayudamos durante el proceso de compra."
                        href={ctaHref}
                        ctaLabel="Consultanos"
                      />
                    </Reveal>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ─── TARIFAS + CALCULADORA ─── */}
          <Section id="tarifas">
            <Container size="wide">
              <Reveal>
                <Eyebrow>Tarifas claras</Eyebrow>
                <Heading className="mt-4 max-w-lg">Sin sorpresas, sin costos ocultos</Heading>
              </Reveal>

              <div className="mt-14 grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <Reveal>
                  <div className="overflow-hidden rounded-lg border border-[rgba(241,212,91,0.2)]">
                    <div className="relative h-56 sm:h-72">
                      <BrandImage
                        name="scale"
                        overlay={false}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>

                    <div className="bg-[var(--mg-gold)] px-7 py-8 sm:px-9">
                      <p className="text-5xl font-extrabold leading-none text-black sm:text-6xl">
                        {usd(rates.price_per_lb_usd)}
                      </p>
                      <p className="mt-2 text-sm font-bold uppercase tracking-wider text-black/70">
                        Por libra
                      </p>
                      <p className="mt-5 text-sm leading-relaxed text-black/75">
                        Se cobra el peso real del paquete o el mínimo de {rates.min_weight} lb, lo
                        que resulte mayor. Sin membresía mensual.
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.12}>
                  <CalculatorPanel rates={rates} formatUsd={usd} />
                </Reveal>
              </div>
            </Container>
          </Section>

          {/* ─── QUÉ NECESITÁS ─── */}
          <Section tone="raised">
            <Container size="wide">
              <Reveal>
                <Eyebrow>Abrí tu casillero</Eyebrow>
                <Heading className="mt-4 max-w-xl">¿Qué necesitás para empezar?</Heading>
                <Lead className="mt-5 max-w-xl">
                  Tres datos y quedás registrado. No hay costo de inscripción ni membresía.
                </Lead>
              </Reveal>

              <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
                {REQUIREMENTS.map((item, index) => (
                  <Reveal key={item.title} delay={index * 0.08}>
                    <IconCard {...item} />
                  </Reveal>
                ))}
              </div>
            </Container>
          </Section>

          {/* ─── FAQ ─── */}
          <Section id="faq">
            <Container size="narrow">
              <Reveal>
                <Eyebrow className="text-center">Preguntas frecuentes</Eyebrow>
                <Heading className="mt-4 text-center">Resolvemos tus dudas</Heading>
              </Reveal>

              <div className="mt-14 space-y-3">
                {faqItems.map((item, index) => (
                  <Reveal key={item.q} delay={index * 0.04}>
                    <details className="group rounded-lg border border-white/10 bg-[var(--mg-surface-card)] transition-colors open:border-[rgba(241,212,91,0.35)]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-[var(--mg-white)]">
                        {item.q}
                        <ChevronDown
                          size={18}
                          strokeWidth={1.5}
                          className="flex-shrink-0 text-[var(--mg-gold)] transition-transform duration-300 group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>
                      <p className="px-6 pb-6 text-sm leading-relaxed text-white/55">{item.a}</p>
                    </details>
                  </Reveal>
                ))}
              </div>
            </Container>
          </Section>

          {/* ─── CONVERSIÓN ─── */}
          <Section tone="raised">
            <Container size="wide">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <Reveal>
                  <Eyebrow>¿Listo para comprar?</Eyebrow>
                  <Heading className="mt-4">Crea tu casillero y empezá a traer tus compras</Heading>
                  <Lead className="mt-5">
                    Abrir tu casillero no tiene costo. Escribinos y te acompañamos en el proceso.
                  </Lead>
                  <div className="mt-9">
                    <BrandButton href={ctaHref} external={ctaExternal} size="lg">
                      Crea tu casillero
                    </BrandButton>
                  </div>
                </Reveal>

                <Reveal delay={0.12}>
                  <div className="relative h-64 overflow-hidden rounded-lg sm:h-80">
                    <BrandImage
                      name="bridge"
                      overlay={false}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </Reveal>
              </div>
            </Container>
          </Section>

          {/* ─── CTA FINAL ─── */}
          <section id="contacto" className="relative isolate scroll-mt-20 overflow-hidden">
            <div className="absolute inset-0 -z-10">
              <BrandImage name="doorstep" overlay={false} sizes="100vw" />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10"
              style={{
                background:
                  'linear-gradient(to left, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.35) 100%)',
              }}
            />

            <Container size="wide" className="py-24 sm:py-28">
              <div className="ml-auto max-w-xl lg:text-right">
                <Reveal strong>
                  <Heading className="uppercase">
                    Tus compras,
                    <br />
                    <span className="text-[var(--mg-gold)]">nuestro compromiso</span>
                  </Heading>
                  <Lead className="mt-6">
                    Conectamos lo que comprás con lo que importa. Abrir tu casillero no tiene costo.
                  </Lead>

                  <div className="mt-10 flex lg:justify-end">
                    <BrandButton href={ctaHref} external={ctaExternal} size="lg">
                      Escribinos por WhatsApp
                      <WhatsappIcon className="h-4 w-4" />
                    </BrandButton>
                  </div>
                </Reveal>
              </div>
            </Container>
          </section>
        </main>

        <Footer whatsappHref={whatsappHref} />

        <WhatsappFab href={whatsappHref} />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const rates = await SettingsService.getPublicRates();

  return { props: { rates } };
};

export default LandingPage;
