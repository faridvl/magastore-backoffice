const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(process.cwd(), 'public', 'logo', 'magastore-perfil-dark.png');
const OUTPUT = path.join(process.cwd(), 'public', 'logo', 'magastore-perfil-transparent.png');

async function run() {
  const image = sharp(INPUT).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 30; // qué tan "casi negro" debe ser un pixel para volverse transparente

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0; // alpha a 0
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT);

  console.log('Done:', OUTPUT);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
