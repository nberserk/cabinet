# Chrome Web Store Submission Checklist

## Pre-Submission Requirements

### ✅ Technical Requirements
- [ ] Icons created (16px, 32px, 48px, 128px) ✓
- [ ] Manifest.json properly configured ✓
- [ ] Extension tested and working ✓
- [ ] All files included in ZIP package
- [ ] No development/test files in package
- [ ] Version number set (currently 1.0.0)

### ✅ Store Assets
- [ ] Store description written ✓
- [ ] Privacy policy created ✓
- [ ] Screenshots taken (1-5 required)
- [ ] Promotional images (optional but recommended)

### ✅ Account Setup
- [ ] Chrome Web Store developer account created ($5 fee)
- [ ] Google account verified
- [ ] Payment method added (for developer fee)

## Files to Include in ZIP

### Required Files
- [ ] manifest.json
- [ ] background.js
- [ ] All HTML files (sidepanel.html, cabinets.html, popup.html)
- [ ] All JS files (sidepanel.js, cabinets.js, popup.js)
- [ ] All TypeScript files (.ts files)
- [ ] dist/styles.css
- [ ] icons/ folder with all PNG files

### Files to EXCLUDE
- [ ] node_modules/
- [ ] .git/
- [ ] .kiro/
- [ ] tests/
- [ ] src/ (source CSS files)
- [ ] package.json and package-lock.json
- [ ] tsconfig.json
- [ ] tailwind.config.js
- [ ] vitest.config.ts
- [ ] jest.setup.js
- [ ] store-assets/
- [ ] scripts/
- [ ] README.md
- [ ] .gitignore

## Store Listing Information

### Basic Info
- [ ] Extension name: "The Cabinet"
- [ ] Category: Productivity
- [ ] Language: English (or your preferred language)

### Description
- [ ] Short description (132 characters max) ✓
- [ ] Detailed description ✓
- [ ] Key features highlighted ✓
- [ ] Target audience identified ✓

### Privacy & Permissions
- [ ] Privacy policy URL or text ✓
- [ ] Permissions justified in description
- [ ] Data usage clearly explained

### Assets
- [ ] Screenshots (1-5, recommended 1280x800px)
- [ ] Small promotional tile (440x280px) - optional
- [ ] Large promotional tile (920x680px) - optional
- [ ] Marquee promotional image (1400x560px) - optional

## Submission Process

1. **Create ZIP Package**
   ```bash
   # Create a clean build
   npm run build-css-prod
   
   # Create ZIP with only necessary files
   # (Use file manager or command line)
   ```

2. **Upload to Chrome Web Store**
   - Go to Chrome Web Store Developer Dashboard
   - Click "Add new item"
   - Upload ZIP file
   - Fill out store listing
   - Submit for review

3. **Review Process**
   - Initial review: Usually 1-3 days
   - May request changes or clarifications
   - Respond promptly to reviewer feedback

## Post-Submission

- [ ] Monitor review status
- [ ] Respond to any reviewer questions
- [ ] Plan for updates and maintenance
- [ ] Consider user feedback and reviews

## Common Rejection Reasons to Avoid

- [ ] Missing or inadequate privacy policy
- [ ] Permissions not properly justified
- [ ] Poor quality screenshots
- [ ] Misleading description
- [ ] Broken functionality
- [ ] Including unnecessary files in package

## Success Tips

- [ ] Test thoroughly before submission
- [ ] Write clear, honest descriptions
- [ ] Use high-quality screenshots
- [ ] Respond quickly to reviewer feedback
- [ ] Follow Chrome Web Store policies exactly