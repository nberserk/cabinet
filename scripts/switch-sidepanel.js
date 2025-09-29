#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../manifest.json');

function switchSidepanel(version) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (version === 'react') {
      manifest.side_panel.default_path = 'sidepanel-react.html';
      console.log('🔄 Switched to React sidepanel');
    } else if (version === 'vanilla') {
      manifest.side_panel.default_path = 'sidepanel.html';
      console.log('🔄 Switched to vanilla sidepanel');
    } else {
      console.error('❌ Invalid version. Use "react" or "vanilla"');
      process.exit(1);
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
    console.log('✅ Manifest updated. Reload the extension to see changes.');
    
  } catch (error) {
    console.error('❌ Error updating manifest:', error.message);
    process.exit(1);
  }
}

const version = process.argv[2];
if (!version) {
  console.log('Usage: npm run switch-sidepanel [react|vanilla]');
  console.log('Current sidepanel:', JSON.parse(fs.readFileSync(manifestPath, 'utf8')).side_panel.default_path);
} else {
  switchSidepanel(version);
}