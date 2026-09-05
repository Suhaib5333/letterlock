// Renders every icon / splash master from the one source of truth, public/favicon.svg.
//
//   node scripts/genicons.mjs
//
// Writes:
//   resources/icon.png                 1024x1024  store icon (dark studio ground + logo)
//   resources/icon-foreground.png      1024x1024  Android adaptive foreground (transparent)
//   resources/icon-background.png      1024x1024  Android adaptive background (solid)
//   resources/splash.png               2732x2732  splash (dark ground, centered logo)
//   resources/splash-dark.png          2732x2732  same (we are dark in both modes)
//   public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
//   android/app/src/main/res/drawable-xhdpi/tv_banner.png   320x180 Android TV banner
//
// Then `npx capacitor-assets generate --android --ios` fans the resources/ masters
// out into every density the two native projects need (see docs/MOBILE_BUILD.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#0a0e1f';
const logoSvg = readFileSync(resolve(root, 'public/favicon.svg'));

/** Background: studio-dark ground with a soft violet glow behind the logo. */
function groundSvg(size, glow = true) {
  const r = Math.round(size * 0.42);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="50%">
      <stop offset="0%" stop-color="#7c5aff" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="#7c5aff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#7c5aff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  ${glow ? `<circle cx="${size / 2}" cy="${size * 0.46}" r="${r}" fill="url(#glow)"/>` : ''}
</svg>`);
}

async function logoPng(height) {
  // favicon.svg is 48x54 (hex is taller than wide); scale by height.
  const density = (72 * height) / 54;
  return sharp(logoSvg, { density }).resize({ height, fit: 'inside' }).png().toBuffer();
}

async function composed(size, logoHeight, { transparent = false, glow = true, out }) {
  const logo = await logoPng(logoHeight);
  const base = transparent
    ? sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    : sharp(groundSvg(size, glow));
  const buf = await base
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out.replace(root, '.'), `${size}x${size}`);
}

async function solid(size, out) {
  const buf = await sharp({ create: { width: size, height: size, channels: 4, background: BG } }).png().toBuffer();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out.replace(root, '.'), `${size}x${size}`);
}

async function tvBanner(out) {
  // Android TV banner is exactly 320x180 (xhdpi). Logo left, wordmark right.
  const W = 320;
  const H = 180;
  const logo = await logoPng(112);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#121a3a"/>
      <stop offset="100%" stop-color="${BG}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <text x="118" y="100" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="25" letter-spacing="1" fill="#ffffff">LETTERLOCK</text>
</svg>`);
  const buf = await sharp(svg).composite([{ input: logo, left: 16, top: 34 }]).png().toBuffer();
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  console.log('wrote', out.replace(root, '.'), `${W}x${H}`);
}

const R = (p) => resolve(root, p);

await composed(1024, 640, { out: R('resources/icon.png') });
// Adaptive icon safe zone is the central 66%; keep the logo inside ~56%.
await composed(1024, 560, { transparent: true, out: R('resources/icon-foreground.png') });
await solid(1024, R('resources/icon-background.png'));
await composed(2732, 640, { out: R('resources/splash.png') });
await composed(2732, 640, { out: R('resources/splash-dark.png') });

// PWA / Apple touch icons (public/, served as-is).
await composed(192, 124, { out: R('public/icons/icon-192.png') });
await composed(512, 330, { out: R('public/icons/icon-512.png') });
// Maskable: the platform crops to a shape, so the logo sits inside the 80% safe circle.
await composed(512, 280, { out: R('public/icons/maskable-512.png') });
await composed(180, 116, { out: R('public/icons/apple-touch-icon.png') });

await tvBanner(R('android/app/src/main/res/drawable-xhdpi/tv_banner.png'));
