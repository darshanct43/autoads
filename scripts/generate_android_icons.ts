import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Define target output path matching native android structure
const ROOT_DIR = path.resolve('android/app/src/main/res');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Master SVG format with solid #EAB308 yellow background and black centered auto rickshaw
const masterSvgCode = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Yellow background -->
  <rect width="512" height="512" rx="112" fill="#EAB308" />
  
  <!-- Centered Auto Rickshaw icon scaled up -->
  <g transform="translate(96, 96) scale(13.333)">
    <path d="M19 12h-2V7h1.5A1.5 1.5 0 0 1 20 8.5v2.5a1 1 0 0 1-1 1M5 12H3a1 1 0 0 1-1-1V8.5A1.5 1.5 0 0 1 3.5 7H5v5m7-5v5h-2V7h2m5-3v2H7V4h10M6 13h12a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 1-5 0V15H10v1.5a2.5 2.5 0 0 1-5 0V14a1 1 0 0 1 1-1m-1 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m14 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="#000000" />
  </g>
</svg>`;

// Master SVG format for Android adaptive foreground (transparent background with black rickshaw)
const masterForegroundSvgCode = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" fill="none" />
  <g transform="translate(96, 96) scale(13.333)">
    <path d="M19 12h-2V7h1.5A1.5 1.5 0 0 1 20 8.5v2.5a1 1 0 0 1-1 1M5 12H3a1 1 0 0 1-1-1V8.5A1.5 1.5 0 0 1 3.5 7H5v5m7-5v5h-2V7h2m5-3v2H7V4h10M6 13h12a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 1-5 0V15H10v1.5a2.5 2.5 0 0 1-5 0V14a1 1 0 0 1 1-1m-1 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m14 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill="#000000" />
  </g>
</svg>`;

async function generate() {
  const sourceBuffer = Buffer.from(masterSvgCode);
  const foregroundBuffer = Buffer.from(masterForegroundSvgCode);

  const publicPng = path.resolve('public/ic_launcher.png');
  const public192 = path.resolve('public/ic_launcher_192.png');
  const public512 = path.resolve('public/ic_launcher_512.png');

  console.log(`[IconGen] Rendering master SVG for iconic AutoAds rickshaw`);
  console.log(`[IconGen] Output Root Directory: ${ROOT_DIR}`);

  // Ensure public directory exists
  ensureDir(path.resolve('public'));

  // 1. Export static launcher vector/svg files to public folder
  fs.writeFileSync(path.resolve('public/ic_launcher.svg'), masterSvgCode);
  fs.writeFileSync(path.resolve('public/ic_launcher_foreground.svg'), masterForegroundSvgCode);
  fs.writeFileSync(path.resolve('public/ic_launcher_foreground_v2.svg'), masterForegroundSvgCode);
  console.log(`[IconGen] Saved AutoAds Rickshaw SVGs to /public`);

  // 2. Compile web resized PNG icons
  await sharp(sourceBuffer)
    .png()
    .toFile(publicPng);
  console.log(`[IconGen] Created public/ic_launcher.png`);

  await sharp(sourceBuffer)
    .resize(192, 192)
    .png()
    .toFile(public192);
  console.log(`[IconGen] Created 192x192 web icon`);

  await sharp(sourceBuffer)
    .resize(512, 512)
    .png()
    .toFile(public512);
  console.log(`[IconGen] Created 512x512 web icon`);

  // Base legacy launcher icon dimensions (mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192)
  const legacySizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  // Adaptive launcher foreground icon dimensions (mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432)
  const adaptiveSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  };

  // Ensure directories exist and generate square & circular launcher assets
  for (const [folder, size] of Object.entries(legacySizes)) {
    const dirPath = path.join(ROOT_DIR, folder);
    ensureDir(dirPath);

    const legacyPath = path.join(dirPath, 'ic_launcher.png');
    const legacyRoundPath = path.join(dirPath, 'ic_launcher_round.png');

    // 1. Legacy Square/Squircle Launcher (uses standard sourceBuffer with its round-rect border)
    await sharp(sourceBuffer)
      .resize(size, size)
      .png()
      .toFile(legacyPath);
    console.log(`[IconGen] Created legacy square icon in ${folder} (${size}x${size} px)`);

    // 2. Legacy Circle Launcher (crops standard yellow background to perfect circle)
    const r = size / 2;
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${r}" cy="${r}" r="${r}" fill="black" />
      </svg>`
    );

    await sharp(sourceBuffer)
      .resize(size, size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(legacyRoundPath);
    console.log(`[IconGen] Created legacy circular icon in ${folder} (${size}x${size} px)`);
  }

  // 3. Adaptive Foreground Launcher Assets (uses our transparent foregroundBuffer)
  for (const [folder, size] of Object.entries(adaptiveSizes)) {
    const dirPath = path.join(ROOT_DIR, folder);
    ensureDir(dirPath);

    const adaptivePath = path.join(dirPath, 'ic_launcher_foreground.png');
    
    await sharp(foregroundBuffer)
      .resize(size, size)
      .png()
      .toFile(adaptivePath);
    console.log(`[IconGen] Created adaptive foreground icon in ${folder} (${size}x${size} px)`);
  }

  // 4. AnyDPI XML configurations for Adaptive Icon
  const anyDpiDir = path.join(ROOT_DIR, 'mipmap-anydpi-v26');
  ensureDir(anyDpiDir);

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;

  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);
  console.log(`[IconGen] Generated adaptive icon XML descriptors in mipmap-anydpi-v26`);

  // 5. Build/Values colors.xml for standard background mapping (set background to trademark yellow #EAB308)
  const valuesDir = path.join(ROOT_DIR, 'values');
  ensureDir(valuesDir);

  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#EAB308</color>
</resources>`;

  fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml);
  console.log(`[IconGen] Generated colors.xml with background mapping to #EAB308`);

  console.log('[IconGen] SUCCESS: All mobile launcher assets compiled perfectly!');
}

generate().catch(err => {
  console.error('[IconGen] FAILURE:', err);
  process.exit(1);
});
