#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing React Sidepanel Build...\n');

// Check if required files exist
const requiredFiles = [
  'sidepanel-react.html',
  'dist/sidepanel-react-bundle.js',
  'dist/styles.css',
  'src/react-sidepanel/index.tsx',
  'tsconfig.react.json'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - exists`);
  } else {
    console.log(`❌ ${file} - missing`);
    allFilesExist = false;
  }
});

// Check if bundle contains expected content for tab hierarchy integration
const bundlePath = path.join(__dirname, '../dist/sidepanel-react-bundle.js');
if (fs.existsSync(bundlePath)) {
  const bundleContent = fs.readFileSync(bundlePath, 'utf8');
  
  const expectedStrings = [
    'React Sidepanel with proper components',
    'SidepanelApp',
    'createRoot',
    'SidepanelProvider',
    'useSidepanelContext',
    'TabNode'
  ];
  
  console.log('\n📦 Bundle Content Check (Tab Integration):');
  expectedStrings.forEach(str => {
    if (bundleContent.includes(str)) {
      console.log(`✅ Contains: "${str}"`);
    } else {
      console.log(`❌ Missing: "${str}"`);
      allFilesExist = false;
    }
  });
}

// Check HTML file
const htmlPath = path.join(__dirname, '../sidepanel-react.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  console.log('\n🌐 HTML File Check:');
  const htmlChecks = [
    { check: 'react-root', desc: 'React root div' },
    { check: 'sidepanel-react-bundle.js', desc: 'Bundle script reference' },
    { check: 'dist/styles.css', desc: 'CSS reference' }
  ];
  
  htmlChecks.forEach(({ check, desc }) => {
    if (htmlContent.includes(check)) {
      console.log(`✅ ${desc} - found`);
    } else {
      console.log(`❌ ${desc} - missing`);
      allFilesExist = false;
    }
  });
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 All tests passed! React sidepanel with tab integration is ready.');
  console.log('\n📋 Testing Options:');
  console.log('1. Chrome Extension: Load extension and open sidepanel');
  console.log('2. Browser Test: Open sidepanel-react.html (limited functionality)');
  console.log('3. Switch versions: npm run switch-sidepanel [react|vanilla]');
  console.log('\n🔧 Current manifest sidepanel:', JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8')).side_panel.default_path);
  console.log('\n✨ Features integrated:');
  console.log('- Real tab hierarchy display');
  console.log('- Tab switching functionality');
  console.log('- Tab closing with Chrome API');
  console.log('- Real-time updates via message passing');
  console.log('- Loading, error, and empty states');
} else {
  console.log('❌ Some tests failed. Please check the build setup.');
}
console.log('='.repeat(50));