/**
 * Genera todos los derivados de marca a partir del logo original.
 *
 *   node scripts/generate-brand-assets.js [ruta-al-original]
 *
 * El original es un JPEG con fondo negro y arte dorado. De ahí salen tres
 * recortes base:
 *
 *   - isotipo  (globo + cajas + flechas)  -> iconos, favicons, PWA
 *   - completo (isotipo + MAGASTORE + COMPRAS POR INTERNET) -> nav, splash, OG
 *
 * La franja inferior "RÁPIDO · SEGURO" se descarta a propósito: el claim se
 * escribe como texto en el landing para poder cambiarlo sin volver a exportar
 * el arte.
 *
 * Las bandas se midieron sobre el original de 1254x1147. Si se reemplaza el
 * arte por otro con proporciones distintas hay que volver a medirlas.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2] || 'D:/Descargas/nuevo logo magastore/logo.jpeg';
const PUBLIC = path.join(__dirname, '..', 'public');
const LOGO_DIR = path.join(PUBLIC, 'logo');
const SPLASH_DIR = path.join(PUBLIC, 'splash');

/**
 * Regiones del original, en píxeles. Los extremos medidos del contenido son
 * x 94..1172 e y 200..870; se agrega un margen para que la M y la E de
 * "MAGASTORE" no queden pegadas al borde del recorte.
 */
const MARGIN = 24;
const CROP_ISOTIPO = { left: 281 - MARGIN, top: 200 - MARGIN, width: 974 - 281 + MARGIN * 2, height: 637 - 200 + MARGIN * 2 };
const CROP_FULL = { left: 94 - MARGIN, top: 200 - MARGIN, width: 1172 - 94 + MARGIN * 2, height: 870 - 200 + MARGIN * 2 };

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const DEV_GREEN = { r: 16, g: 185, b: 129, alpha: 1 };

/** Tamaños de splash de iOS que declara `_document.tsx`. */
const SPLASH_SIZES = [
  [1170, 2532], [1179, 2556], [1284, 2778], [1290, 2796], [1125, 2436],
  [828, 1792], [750, 1334], [1668, 2388], [2048, 2732], [1620, 2160], [1640, 2360],
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

/** Recorta una región y la deja con fondo transparente. */
const region = (crop) => sharp(SRC).extract(crop).png();

/**
 * Convierte el negro de fondo en transparencia. El arte es dorado/blanco sobre
 * negro puro, así que un umbral bajo sobre la luminancia separa bien.
 */
async function toTransparent(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;

  for (let i = 0; i < px; i++) {
    const o = i * 4;
    const [r, g, b] = [data[o], data[o + 1], data[o + 2]];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Por debajo del umbral es fondo; en la franja de transición se atenúa el
    // alfa en vez de cortar en seco, para no dejar bordes dentados.
    if (lum < 24) data[o + 3] = 0;
    else if (lum < 72) data[o + 3] = Math.round(((lum - 24) / 48) * 255);
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Cuadra una imagen sobre un lienzo con padding proporcional. */
async function square(buffer, size, { background = BLACK, pad = 0.1 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const resized = await sharp(buffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No se encontró el original: ${SRC}`);
    process.exit(1);
  }

  ensureDir(LOGO_DIR);
  ensureDir(SPLASH_DIR);

  const isotipoRaw = await region(CROP_ISOTIPO).toBuffer();
  const fullRaw = await region(CROP_FULL).toBuffer();

  const isotipo = await toTransparent(isotipoRaw);
  const full = await toTransparent(fullRaw);

  // ── Logos base ────────────────────────────────────────────────────────
  await sharp(full).toFile(path.join(LOGO_DIR, 'magastore-logo-2026.png'));
  await sharp(isotipo).toFile(path.join(LOGO_DIR, 'magastore-isotipo-2026.png'));
  // Sobre negro, para donde haga falta fondo opaco.
  await sharp({
    create: {
      width: CROP_FULL.width, height: CROP_FULL.height, channels: 4, background: BLACK,
    },
  })
    .composite([{ input: full }])
    .png()
    .toFile(path.join(LOGO_DIR, 'magastore-logo-2026-black.png'));
  console.log('logos      ✓');

  // ── Iconos PWA y favicons (isotipo, que es lo que se lee en chico) ────
  // `-dev` es fondo verde para distinguir dev-portal del ícono de producción
  // (fondo negro) en la pantalla de inicio del celular.
  for (const size of [192, 512]) {
    await sharp(await square(isotipo, size)).toFile(path.join(PUBLIC, `icon-${size}.png`));
    await sharp(await square(isotipo, size, { background: DEV_GREEN })).toFile(path.join(PUBLIC, `icon-${size}-dev.png`));
  }
  await sharp(await square(isotipo, 180)).toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  await sharp(await square(isotipo, 180, { background: DEV_GREEN })).toFile(path.join(PUBLIC, 'apple-touch-icon-dev.png'));

  // Los favicons salen de `public/favicon.svg`, no del raster: a 16-48px el
  // isotipo completo se empasta y el SVG es una versión simplificada legible.
  const faviconSvg = path.join(PUBLIC, 'favicon.svg');
  for (const size of [16, 32, 48]) {
    await sharp(faviconSvg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC, `favicon-${size}.png`));
  }
  console.log('iconos     ✓');

  // ── OG image: logo completo centrado sobre negro ──────────────────────
  const ogInner = await sharp(full).resize(760, 380, { fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: BLACK } })
    .composite([{ input: ogInner, gravity: 'center' }])
    .png()
    .toFile(path.join(PUBLIC, 'og-image.png'));
  console.log('og-image   ✓');

  // ── Splash de iOS ─────────────────────────────────────────────────────
  // `black` es producción. `green` marca dev-portal: mismo fondo sólido que el
  // ícono de home screen (`icon-*-dev.png`), para que ícono y splash coincidan
  // exactamente y no se perciba un "salto" de color al abrir en iOS.
  for (const [w, h] of SPLASH_SIZES) {
    const logoWidth = Math.round(w * 0.62);
    const logo = await sharp(full).resize(logoWidth, null, { fit: 'inside' }).toBuffer();

    await sharp({ create: { width: w, height: h, channels: 4, background: BLACK } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(path.join(SPLASH_DIR, `black-${w}x${h}.png`));

    await sharp({ create: { width: w, height: h, channels: 4, background: DEV_GREEN } })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(path.join(SPLASH_DIR, `green-${w}x${h}.png`));
  }
  console.log(`splash     ✓ (${SPLASH_SIZES.length} x2)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
