#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Creating placeholder icons for The Cabinet...\n');

// Create icons directory if it doesn't exist
const iconsDir = 'icons';
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// SVG icon template - simple cabinet/folder icon
const createSVGIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Cabinet/Folder shape -->
  <rect x="${size * 0.1}" y="${size * 0.2}" width="${size * 0.8}" height="${size * 0.7}" 
        rx="${size * 0.05}" fill="url(#gradient)" stroke="#4a5568" stroke-width="${Math.max(1, size * 0.02)}"/>
  
  <!-- Cabinet handle/tab -->
  <rect x="${size * 0.15}" y="${size * 0.1}" width="${size * 0.3}" height="${size * 0.15}" 
        rx="${size * 0.02}" fill="url(#gradient)" stroke="#4a5568" stroke-width="${Math.max(1, size * 0.02)}"/>
  
  <!-- Hierarchy lines -->
  <line x1="${size * 0.25}" y1="${size * 0.4}" x2="${size * 0.75}" y2="${size * 0.4}" 
        stroke="white" stroke-width="${Math.max(1, size * 0.02)}" opacity="0.8"/>
  <line x1="${size * 0.3}" y1="${size * 0.55}" x2="${size * 0.75}" y2="${size * 0.55}" 
        stroke="white" stroke-width="${Math.max(1, size * 0.02)}" opacity="0.6"/>
  <line x1="${size * 0.35}" y1="${size * 0.7}" x2="${size * 0.75}" y2="${size * 0.7}" 
        stroke="white" stroke-width="${Math.max(1, size * 0.02)}" opacity="0.4"/>
</svg>`;

// Icon sizes required by Chrome Web Store
const iconSizes = [16, 32, 48, 128];

iconSizes.forEach(size => {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(iconsDir, `icon${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Created icon${size}.svg`);
});

console.log('\n📝 SVG icons created successfully!');
console.log('\n💡 For production, consider:');
console.log('  1. Converting SVG to PNG using online tools or design software');
console.log('  2. Creating custom icons that better represent your extension');
console.log('  3. Ensuring icons are crisp at all sizes');
console.log('\n🔗 Recommended tools:');
console.log('  - Figma (free): https://figma.com');
console.log('  - SVGOMG (SVG optimizer): https://jakearchibald.github.io/svgomg/');
console.log('  - CloudConvert (SVG to PNG): https://cloudconvert.com/svg-to-png');

console.log('\n🎨 Icon creation complete!');