#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building The Cabinet Extension for Chrome Web Store...\n');

// 1. Build CSS
console.log('📦 Building production CSS...');
try {
    execSync('npm run build-css-prod', { stdio: 'inherit' });
    console.log('✅ CSS built successfully\n');
} catch (error) {
    console.error('❌ CSS build failed:', error.message);
    process.exit(1);
}

// 2. Create build directory
const buildDir = 'build';
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);
console.log('📁 Created build directory\n');

// 3. Copy essential files for extension
const filesToCopy = [
    'manifest.json',
    'sidepanel.html',
    'sidepanel.js',
    'cabinets.html',
    'cabinets.js',
    'background.js',
    'types.ts',
    'constants.ts',
    'utils.ts',
    'tab-hierarchy-engine.ts',
    'cabinet-system.ts',
    'tab-manager.ts',
    'error-handler.ts',
    'ui-renderer.ts',
    'interactive-tree-renderer.ts',
    'tab-converter.ts',
    'cabinet-restoration-utils.ts'
];

const directoriesToCopy = [
    'dist',
    'icons'
];

console.log('📋 Copying extension files...');

// Copy individual files
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(buildDir, file));
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ⚠️  ${file} (not found, skipping)`);
    }
});

// Copy directories
directoriesToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
        fs.cpSync(dir, path.join(buildDir, dir), { recursive: true });
        console.log(`  ✅ ${dir}/`);
    } else {
        console.log(`  ⚠️  ${dir}/ (not found, skipping)`);
    }
});

// 4. Update manifest for production
console.log('\n🔧 Updating manifest for production...');
const manifestPath = path.join(buildDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update version to 1.0.0 for store release
manifest.version = '1.0.0';

// Update description for store (must be under 132 characters)
manifest.description = 'Professional tab management with hierarchical organization. Save and restore browsing sessions as Cabinets.';

// Remove development-specific fields
delete manifest.homepage_url; // Remove placeholder URL

// Ensure all required fields are present
if (!manifest.icons) {
    console.log('⚠️  No icons found - you\'ll need to add icons before store submission');
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Manifest updated for production\n');

// 5. Create icons directory if it doesn't exist
const iconsDir = path.join(buildDir, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
    console.log('📁 Created icons directory');
    console.log('⚠️  You need to add icon files (16x16, 32x32, 48x48, 128x128) before store submission\n');
}

// 6. Remove development files from build
const devFilesToRemove = [
    'screenshot-demo.html',
    'cabinet-demo.html',
    'sidepanel-test.html',
    'demo-640x480-hero.html',
    'demo-640x480-before-after.html',
    'demo-640x480-cabinet-management.html',
    'demo-640x480-features.html',
    'tree-test.html',
    'SCREENSHOT_GUIDE.md',
    'CHROME_STORE_DESCRIPTION.md'
];

devFilesToRemove.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed ${file}`);
    }
});

// 7. Validate build
console.log('\n🔍 Validating build...');
const requiredFiles = [
    'manifest.json',
    'sidepanel.html',
    'sidepanel.js',
    'dist/styles.css'
];

let buildValid = true;
requiredFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} (MISSING)`);
        buildValid = false;
    }
});

// 8. Calculate build size
const getBuildSize = (dir) => {
    let size = 0;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
            size += getBuildSize(filePath);
        } else {
            size += stats.size;
        }
    });
    
    return size;
};

const buildSize = getBuildSize(buildDir);
const buildSizeMB = (buildSize / (1024 * 1024)).toFixed(2);

console.log(`\n📊 Build Statistics:`);
console.log(`  Size: ${buildSizeMB} MB`);
console.log(`  Files: ${fs.readdirSync(buildDir).length}`);

// 9. Final instructions
console.log('\n🎉 Build Complete!');
console.log(`\n📦 Your extension is ready in the '${buildDir}' directory`);

if (buildValid) {
    console.log('\n✅ Build validation passed');
    console.log('\n📋 Next Steps:');
    console.log('  1. Add icon files to build/icons/ (16x16, 32x32, 48x48, 128x128)');
    console.log('  2. Test the extension by loading build/ folder in Chrome');
    console.log('  3. Create a ZIP file of the build/ directory');
    console.log('  4. Upload to Chrome Web Store Developer Dashboard');
    console.log('\n🔗 Chrome Web Store: https://chrome.google.com/webstore/devconsole');
} else {
    console.log('\n❌ Build validation failed - please fix missing files');
    process.exit(1);
}

console.log('\n🚀 Ready for Chrome Web Store submission!');