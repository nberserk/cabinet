/**
 * Development helper script for The Cabinet extension
 * Provides quick reload instructions and checks
 */

console.log('🔧 The Cabinet - Development Reload Guide');
console.log('==========================================\n');

console.log('📝 For UI Changes (HTML/CSS/JS):');
console.log('   1. Make your changes');
console.log('   2. Run: npm run build-css (if CSS changed)');
console.log('   3. Refresh extension interface:');
console.log('      - Side panel: Close and reopen');
console.log('      - Popup: Close and reopen');
console.log('      - Cabinets page: Refresh (F5)');

console.log('\n🔄 For Background/Manifest Changes:');
console.log('   1. Go to chrome://extensions/');
console.log('   2. Find "The Cabinet"');
console.log('   3. Click the reload button (↻)');

console.log('\n⚡ Quick Test Commands:');
console.log('   npm run build-css      - Build CSS for development');
console.log('   npm run build-css-prod - Build CSS for production');
console.log('   npm run test           - Run tests');

console.log('\n🎯 Development Tips:');
console.log('   - Keep Chrome DevTools open for debugging');
console.log('   - Use console.log() for debugging extension scripts');
console.log('   - Check chrome://extensions/ for error messages');
console.log('   - Use "Inspect views" links for debugging specific parts');

console.log('\n📱 Testing Your Extension:');
console.log('   1. Load unpacked extension from project folder');
console.log('   2. Open side panel to test hierarchy view');
console.log('   3. Try saving/restoring cabinets');
console.log('   4. Test with different tab structures');