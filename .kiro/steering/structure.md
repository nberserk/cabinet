# Project Structure

## Core Architecture

The project follows a modular Chrome extension architecture with clear separation of concerns:

### Root Level Files

- **manifest.json**: Chrome extension configuration and permissions
- **background.js**: Service worker for Chrome API interactions and persistence
- **types.ts**: Central TypeScript interface definitions for all data structures
- **constants.ts**: Configuration values, storage keys, and error messages

### Core Modules

- **cabinet-system.ts**: Singleton class managing Cabinet CRUD operations and storage
- **tab-hierarchy-engine.ts**: Core logic for building and managing tab hierarchies
- **tab-manager.ts**: Chrome tabs API interactions and event handling
- **utils.ts**: Shared utility functions and helper methods
- **error-handler.ts**: Centralized error handling and logging

### UI Components

- **sidepanel.html/js**: Main side panel interface for hierarchy navigation
- **popup.html/js**: Extension popup interface
- **cabinets.html/js**: Cabinet management interface
- **ui-renderer.ts**: DOM manipulation and rendering logic
- **interactive-tree-renderer.ts**: Specialized tree visualization component

### Specialized Modules

- **tab-converter.ts**: Converts Chrome tab objects to internal TabNode format
- **cabinet-restoration-utils.ts**: Utilities for restoring saved Cabinets

### Styling

- **src/input.css**: Tailwind CSS source file
- **src/styles.css**: Additional custom styles
- **dist/styles.css**: Compiled CSS output

### Testing Structure

- **tests/unit/**: Unit tests for individual modules
- **tests/integration/**: Integration tests for component interactions
- **tests/e2e/**: End-to-end workflow tests
- **jest.setup.js**: Test environment configuration

## Naming Conventions

- **Files**: kebab-case (e.g., `cabinet-system.ts`)
- **Classes**: PascalCase (e.g., `CabinetSystem`, `TabHierarchyEngine`)
- **Interfaces**: PascalCase (e.g., `TabNode`, `Cabinet`)
- **Functions**: camelCase (e.g., `buildHierarchy`, `saveCabinet`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEYS`, `MAX_HIERARCHY_DEPTH`)

## Data Flow

1. **Chrome APIs** → **background.js** → **Core Modules**
2. **Core Modules** → **UI Components** → **User Interface**
3. **User Actions** → **Event Handlers** → **Core Modules** → **Chrome Storage**

## Module Dependencies

- Core modules are self-contained with minimal cross-dependencies
- UI components depend on core modules but not each other
- All modules import from `types.ts` for shared interfaces
- Utility functions in `utils.ts` are used across modules