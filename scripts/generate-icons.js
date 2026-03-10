/* eslint-disable */
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

import sharp from 'sharp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SOURCE_IMAGE = join(__dirname, '..', 'public', 'icon-original.png');

async function resizeIcon(size, outputPath) {
  try {
    const buffer = await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    await writeFile(outputPath, buffer);
    console.log(`Generated ${outputPath} (${size}x${size})`);
  } catch (err) {
    console.error(`Failed to generate ${outputPath}:`, err.message);
    throw err;
  }
}

async function generateFavicon() {
  // Generate a 32x32 favicon from the source image
  try {
    const buffer = await sharp(SOURCE_IMAGE)
      .resize(32, 32, { fit: 'cover' })
      .png()
      .toBuffer();
    await writeFile('./public/favicon.ico', buffer);
    console.log('Generated ./public/favicon.ico (32x32)');
  } catch (err) {
    console.error('Failed to generate favicon:', err.message);
    throw err;
  }
}

async function main() {
  console.log('Generating PWA icons from', SOURCE_IMAGE);
  await resizeIcon(192, './public/icon-192.png');
  await resizeIcon(512, './public/icon-512.png');
  await generateFavicon();
  console.log('All icons generated successfully.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});