#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating ZIP package for Chrome Web Store...\n');

const buildDir = 'build';

// Read version from source manifest.json
let version = '1.0.0'; // fallback
try {
    const manifestPath = 'manifest.json'; // Source manifest
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        version = manifest.version || version;
        console.log(`📋 Using version ${version} from manifest.json`);
    }
} catch (error) {
    console.log('⚠️  Could not read version from manifest, using fallback');
}

const zipName = `the-cabinet-extension-v${version}.zip`;

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found. Run "npm run build-extension" first.');
    process.exit(1);
}

// Remove existing ZIP if it exists
if (fs.existsSync(zipName)) {
    fs.unlinkSync(zipName);
    console.log('🗑️  Removed existing ZIP file');
}

try {
    // Create ZIP file (cross-platform approach)
    if (process.platform === 'win32') {
        // Windows - use PowerShell
        execSync(`powershell Compress-Archive -Path "${buildDir}\\*" -DestinationPath "${zipName}"`, { stdio: 'inherit' });
    } else {
        // macOS/Linux - use zip command
        execSync(`cd ${buildDir} && zip -r ../${zipName} .`, { stdio: 'inherit' });
    }
    
    console.log(`\n✅ ZIP package created: ${zipName}`);
    
    // Get ZIP file size
    const stats = fs.statSync(zipName);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 Package size: ${fileSizeMB} MB`);
    
    if (stats.size > 128 * 1024 * 1024) { // 128MB limit
        console.log('⚠️  Warning: Package size exceeds Chrome Web Store limit (128MB)');
    } else {
        console.log('✅ Package size is within Chrome Web Store limits');
    }
    
    console.log('\n🎉 Ready for Chrome Web Store upload!');
    console.log(`📁 Upload file: ${zipName}`);
    
} catch (error) {
    console.error('❌ Failed to create ZIP package:', error.message);
    console.log('\n💡 Manual ZIP creation:');
    console.log(`  1. Navigate to the ${buildDir} directory`);
    console.log('  2. Select all files and folders');
    console.log('  3. Create a ZIP archive');
    console.log('  4. Upload the ZIP to Chrome Web Store');
    process.exit(1);
}