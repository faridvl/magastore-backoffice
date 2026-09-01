/**
 * Importa las fotografías del landing desde una carpeta de descargas.
 *
 *   node scripts/import-landing-images.js [carpeta]
 *
 * Toma cualquier archivo cuyo nombre (sin extensión) coincida con un slot de
 * `src/components/landing/brand-image.tsx`, lo recorta al encuadre exacto que
 * espera ese slot y lo guarda como WebP en `public/images/landing/`.
 *
 * El recorte usa `fit: cover` con `position: attention`, que centra el encuadre
 * en la zona de mayor detalle en lugar de cortar a ciegas por el centro.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2] || 'D:/Descargas/landing';
const OUT = path.join(__dirname, '..', 'public', 'images', 'landing');

/** Debe coincidir con LANDING_IMAGES en brand-image.tsx. */
const SLOTS = {
  'hero-plane': { width: 1920, height: 1080 },
  'woman-laptop': { width: 1400, height: 900 },
  'warehouse-shelves': { width: 900, height: 1200 },
  'box-on-scale': { width: 1200, height: 900 },
  'boxes-doorstep': { width: 1600, height: 1000 },
};

const KB = (p) => (fs.statSync(p).size / 1024).toFixed(1);

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error(`No existe la carpeta ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const files = fs
    .readdirSync(SRC)
    .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));

  if (!files.length) {
    console.log(`Sin imágenes en ${SRC}`);
    return;
  }

  let done = 0;
  for (const file of files) {
    const slot = path.basename(file, path.extname(file)).toLowerCase();
    const target = SLOTS[slot];

    if (!target) {
      console.log(`SALTA  ${file} — no coincide con ningún slot`);
      continue;
    }

    const from = path.join(SRC, file);
    const to = path.join(OUT, `${slot}.webp`);
    const meta = await sharp(from).metadata();

    await sharp(from)
      .resize(target.width, target.height, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toFile(to);

    console.log(
      `OK     ${slot}.webp  ${meta.width}x${meta.height} → ` +
        `${target.width}x${target.height}  ${KB(to)} KB`,
    );
    done += 1;
  }

  console.log(`\n${done} imagen(es) importada(s) en public/images/landing/`);
})();
