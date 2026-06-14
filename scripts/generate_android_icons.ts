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

async function generate() {
  const sourceImage = path.resolve('src/modules/rbac/ChatGPT Image Jun 10, 2026, 08_19_26 PM.png');
  const publicPng = path.resolve('public/ic_launcher.png');
  const public192 = path.resolve('public/ic_launcher_192.png');
  const public512 = path.resolve('public/ic_launcher_512.png');

  if (!fs.existsSync(sourceImage)) {
    throw new Error(`Uploaded source image not found at ${sourceImage}`);
  }

  console.log(`[IconGen] Input Master Icon: ${sourceImage}`);
  console.log(`[IconGen] Output Root Directory: ${ROOT_DIR}`);

  // Ensure public directory exists and save web copies
  ensureDir(path.resolve('public'));

  // 1. Copy original source to public
  fs.copyFileSync(sourceImage, publicPng);
  console.log(`[IconGen] Copied master PNG to public/ic_launcher.png`);

  // 1b. Convert PNG to JPEG for the mayaan_logo.jpeg
  const publicJpeg = path.resolve('public/mayaan_logo.jpeg');
  await sharp(sourceImage)
    .jpeg({ quality: 95 })
    .toFile(publicJpeg);
  console.log(`[IconGen] Converted master PNG to public/mayaan_logo.jpeg`);

  // 1c. Embedded Base64 PNG inside SVG files to completely eliminate old default SVGs
  const pngBuffer = fs.readFileSync(sourceImage);
  const base64Png = pngBuffer.toString('base64');
  const embeddedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" href="data:image/png;base64,${base64Png}" />
</svg>`;

  fs.writeFileSync(path.resolve('public/ic_launcher.svg'), embeddedSvg);
  fs.writeFileSync(path.resolve('public/mayaan_logo.svg'), embeddedSvg);
  fs.writeFileSync(path.resolve('public/ic_launcher_foreground.svg'), embeddedSvg);
  fs.writeFileSync(path.resolve('public/ic_launcher_foreground_v2.svg'), embeddedSvg);
  console.log(`[IconGen] Generated embedded SVGs for backward compatible files in /public`);

  // 2. Compile web resized icons
  await sharp(sourceImage)
    .resize(192, 192)
    .png()
    .toFile(public192);
  console.log(`[IconGen] Created 192x192 web icon`);

  await sharp(sourceImage)
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

    // 1. Legacy Square/Squircle Launcher
    await sharp(sourceImage)
      .resize(size, size)
      .png()
      .toFile(legacyPath);
    console.log(`[IconGen] Created legacy square icon in ${folder} (${size}x${size} px)`);

    // 2. Legacy Circle Launcher
    const r = size / 2;
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${r}" cy="${r}" r="${r}" fill="black" />
      </svg>`
    );

    await sharp(sourceImage)
      .resize(size, size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(legacyRoundPath);
    console.log(`[IconGen] Created legacy circular icon in ${folder} (${size}x${size} px)`);
  }

  // 3. Adaptive Foreground Launcher Assets
  for (const [folder, size] of Object.entries(adaptiveSizes)) {
    const dirPath = path.join(ROOT_DIR, folder);
    ensureDir(dirPath);

    const adaptivePath = path.join(dirPath, 'ic_launcher_foreground.png');
    
    await sharp(sourceImage)
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

  // 5. Build/Values colors.xml for standard background mapping
  const valuesDir = path.join(ROOT_DIR, 'values');
  ensureDir(valuesDir);

  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>`;

  fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml);
  console.log(`[IconGen] Generated colors.xml with background mapping`);

  console.log('[IconGen] SUCCESS: All mobile launcher assets compiled perfectly!');
}

generate().catch(err => {
  console.error('[IconGen] FAILURE:', err);
  process.exit(1);
});
