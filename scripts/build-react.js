#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building React Sidepanel...');

try {
  // Build TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync('tsc --project tsconfig.react.json', { stdio: 'inherit' });
  
  // Copy the main index.js to a more convenient location
  const sourcePath = path.join(__dirname, '../dist/react-build/src/react-sidepanel/index.js');
  const targetPath = path.join(__dirname, '../dist/sidepanel-react-bundle.js');
  
  console.log('📁 Looking for compiled file at:', sourcePath);
  
  if (fs.existsSync(sourcePath)) {
    console.log('📄 Found compiled file, copying...');
    fs.copyFileSync(sourcePath, targetPath);
    console.log('✅ React bundle created at dist/sidepanel-react-bundle.js');
    
    // Verify the copy worked
    const stats = fs.statSync(targetPath);
    console.log(`📊 Bundle size: ${Math.round(stats.size / 1024)}KB`);
  } else {
    console.error('❌ Compiled file not found at:', sourcePath);
    console.log('📂 Available files in react-build:');
    const buildDir = path.join(__dirname, '../dist/react-build');
    if (fs.existsSync(buildDir)) {
      execSync(`find ${buildDir} -name "*.js" -type f`, { stdio: 'inherit' });
    }
    process.exit(1);
  }
  
  console.log('✅ React Sidepanel build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}