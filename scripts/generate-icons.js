// Icon generation script for The Cabinet extension
// Run with: npm install sharp && node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '../icons/cabinet-icon.svg');
const iconsDir = path.join(__dirname, '../icons');

async function generateIcons() {
    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    if (!fs.existsSync(svgPath)) {
        console.error('SVG file not found:', svgPath);
        console.log('Make sure cabinet-icon.svg exists in the icons/ directory');
        return;
    }

    console.log('Generating PNG icons from cabinet-icon.svg...\n');

    for (const size of sizes) {
        const outputPath = path.join(iconsDir, `icon${size}.png`);
        
        try {
            await sharp(svgPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
                })
                .png({
                    quality: 100,
                    compressionLevel: 9
                })
                .toFile(outputPath);
            
            console.log(`✓ Generated: icon${size}.png (${size}x${size}px)`);
        } catch (error) {
            console.error(`✗ Error generating icon${size}.png:`, error.message);
        }
    }

    console.log('\nIcon generation complete!');
    console.log('Files created in icons/ directory:');
    console.log('- icon16.png');
    console.log('- icon32.png'); 
    console.log('- icon48.png');
    console.log('- icon128.png');
}

generateIcons().catch(console.error);