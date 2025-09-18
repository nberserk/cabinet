# Technology Stack

## Core Technologies

- **TypeScript**: Primary language for all logic and type definitions
- **Chrome Extension Manifest V3**: Modern extension architecture with service workers
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vitest**: Testing framework for unit and integration tests
- **JSDOM**: DOM testing environment

## Architecture Patterns

- **Singleton Pattern**: Used in `CabinetSystem` for centralized state management
- **Observer Pattern**: Callback-based hierarchy change notifications in `TabHierarchyEngine`
- **Service Worker**: Background script handles Chrome API interactions and persistence
- **Side Panel API**: Modern Chrome extension UI pattern for persistent interface

## Key Libraries & APIs

- **Chrome APIs**: `chrome.tabs`, `chrome.storage.local`, `chrome.sidePanel`, `chrome.windows`
- **Autoprefixer**: CSS vendor prefix handling
- **@types/chrome**: TypeScript definitions for Chrome extension APIs

## Build System

### Development Commands
```bash
# Build CSS with watch mode for development
npm run build-css

# Build production CSS (minified)
npm run build-css-prod

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

### Build Process
- Tailwind CSS processes `src/input.css` → `dist/styles.css`
- TypeScript compilation handled by `tsconfig.json` (ES2022 target)
- No bundler - uses native ES modules for Chrome extension compatibility

## File Organization

- **Root level**: Core TypeScript modules and HTML files
- **src/**: CSS source files
- **dist/**: Compiled CSS output
- **tests/**: Comprehensive test suite (unit, integration, e2e)
- **types.ts**: Central type definitions
- **constants.ts**: Configuration and constants