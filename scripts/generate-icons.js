import { writeFile } from 'fs/promises';
import sharp from 'sharp';

async function generateIcon(size, text, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#006600"/>
      <text
        x="50%" y="50%"
        text-anchor="middle"
        dy="0.35em"
        font-family="Arial, sans-serif"
        font-size="${size * 0.4}"
        font-weight="bold"
        fill="#ffffff"
      >${text}</text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(outputPath, buffer);
  console.log(`Generated ${outputPath} (${size}x${size})`);
}

async function generateFavicon() {
  // Generate a 32x32 favicon with "PW"
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#006600"/>
      <text
        x="50%" y="50%"
        text-anchor="middle"
        dy="0.35em"
        font-family="Arial, sans-serif"
        font-size="12"
        font-weight="bold"
        fill="#ffffff"
      >PW</text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile('./public/favicon.ico', buffer);
  console.log('Generated ./public/favicon.ico (32x32)');
}

async function main() {
  await generateIcon(192, 'PW', './public/icon-192.png');
  await generateIcon(512, 'PW', './public/icon-512.png');
  await generateFavicon();
}

main().catch(console.error);