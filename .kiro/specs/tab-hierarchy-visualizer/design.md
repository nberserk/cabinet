# Design Document

## Overview

The Tab Hierarchy Visualizer (The Cabinet) is a Chrome extension that displays browser tabs in a hierarchical tree structure within the current window. The extension provides visual representation of parent-child relationships between tabs, allows direct tab management through the interface, and enables saving/restoring tab hierarchies as named "Cabinets" for later use.

The extension utilizes Chrome's Manifest V3 architecture with a side panel interface for tab hierarchy visualization and a separate dedicated page for Cabinet management. The UI is styled using Tailwind CSS for consistent, responsive design.

## Architecture

### Extension Structure
```
├── manifest.json          # Extension configuration and permissions
├── background.js          # Service worker for tab event handling
├── sidepanel.html/js      # Primary interface for tab hierarchy visualization
├── cabinets.html/js       # Dedicated Cabinet management page
├── tests/                 # All test files organized separately
│   ├── unit/             # Unit test files
│   ├── integration/      # Integration test files
│   └── e2e/              # End-to-end test files
└── (uses chrome.storage)  # Browser storage API for saved Cabinets
```

### Core Components

1. **Tab Hierarchy Engine**: Tracks tab relationships and builds tree structure
2. **UI Renderer**: Displays hierarchical tree with visual indicators in side panel
3. **Tab Manager**: Handles tab operations (switch, close, reorder)
4. **Cabinet System**: Saves/restores tab hierarchies directly to Chrome storage
5. **Cabinet Management UI**: Dedicated page for managing saved Cabinets
6. **Event Handler**: Responds to tab changes and user interactions

### Data Flow

```mermaid
graph TD
    A[Chrome Tabs API] --> B[Background Service Worker]
    B --> C[Tab Hierarchy Engine]
    C --> D[UI Renderer]
    D --> E[Side Panel]
    D --> J[Cabinet Management Page]
    E --> F[User Interactions]
    J --> K[Cabinet Interactions]
    F --> G[Tab Manager]
    K --> H[Cabinet System]
    G --> A
    H --> I[Chrome Storage API]
```

### Terminology Clarification

- **Cabinet**: A named collection of tabs with their hierarchical relationships that can be saved and restored later
- **Tab Hierarchy**: The tree structure showing parent-child relationships between tabs in the current window (displayed in side panel)
- **Cabinet Management Page**: Dedicated full-screen interface for managing saved Cabinets (opened in new tab)
- **Side Panel**: Primary interface showing current window's tab hierarchy with quick access to Cabinet management
- **Chrome Storage API**: Browser's built-in storage mechanism (`chrome.storage.local`) used directly by Cabinet System

## Components and Interfaces

### Tab Hierarchy Engine

**Purpose**: Builds and maintains the hierarchical relationship between tabs

**Parent-Child Relationship Logic**:
- **Primary: Opener Tab ID**: Chrome automatically populates `openerTabId` when:
  - User clicks links to open in new tab (Ctrl+click, middle-click, context menu)
  - JavaScript calls `window.open()` from a webpage
  - Webpage programmatically creates new tabs
- **Secondary: Tab Creation Order**: When `openerTabId` is null (manual new tab, bookmarks, direct URL entry), new tab becomes child of currently active tab
- **Manual Grouping**: Users can drag tabs to reorganize parent-child relationships in the UI
- **Fallback Logic**: If no clear parent is identified, new tabs become root-level tabs

**Key Methods**:
- `buildHierarchy(tabs)`: Creates tree structure from tab array using opener relationships and creation order
- `addTab(tab, parentId)`: Adds new tab to hierarchy with specified or inferred parent
- `removeTab(tabId)`: Removes tab and cascades to children (children become orphaned or promoted)
- `updateTab(tabId, changes)`: Updates tab information while preserving relationships
- `getChildren(tabId)`: Returns child tabs for given parent
- `inferParentRelationship(newTab, existingTabs)`: Determines parent based on opener, URL, and timing

**Data Structure**:
```javascript
{
  id: number,
  title: string,
  url: string,
  favicon: string,
  parentId: number | null,
  children: TabNode[],
  level: number,
  isActive: boolean,
  isPinned: boolean
}
```

### UI Renderer

**Purpose**: Renders the hierarchical tree structure with visual indicators

**Key Methods**:
- `renderTree(hierarchy)`: Renders complete tree structure
- `renderTabNode(tab, level, isLast)`: Renders individual tab with tree lines
- `updateTabState(tabId, state)`: Updates visual state of specific tab
- `highlightTab(tabId)`: Highlights tab on hover

**Visual Elements**:
- Tree lines (vertical/horizontal connectors)
- Favicons and tab titles
- Active tab highlighting
- Pinned tab indicators
- Loading states
- Tailwind CSS classes for consistent styling and responsive design

### Tab Manager

**Purpose**: Handles all tab operations and Chrome API interactions

**Key Methods**:
- `switchToTab(tabId)`: Activates specified tab
- `closeTab(tabId)`: Closes tab and children (cascading delete)
- `moveTab(tabId, newIndex)`: Reorders tabs
- `createContextMenu(tabId)`: Shows tab management options

**Chrome API Integration**:
- `chrome.tabs.query()`: Get current window tabs
- `chrome.tabs.update()`: Switch to tab
- `chrome.tabs.remove()`: Close tabs
- `chrome.tabs.move()`: Reorder tabs

### Cabinet System

**Purpose**: Manages saving and restoring of tab hierarchies

**Key Methods**:
- `saveCabinet(name, hierarchy)`: Saves current hierarchy as Cabinet
- `loadCabinet(cabinetId)`: Retrieves saved Cabinet
- `restoreCabinet(cabinetId)`: Opens all tabs from Cabinet
- `deleteCabinet(cabinetId)`: Removes saved Cabinet
- `listCabinets()`: Returns all saved Cabinets

**Cabinet Data Format** (stored in Chrome Storage):
```javascript
{
  id: string,
  name: string,
  createdAt: Date,
  tabs: TabNode[],
  metadata: {
    tabCount: number,
    windowId: number
  }
}
```

### Cabinet Management UI

**Purpose**: Provides dedicated interface for managing saved Cabinets

**Key Features**:
- Cabinet list display with metadata (name, creation date, tab count)
- Cabinet preview showing contained tabs and hierarchy structure
- Cabinet operations (save, restore, rename, delete)
- Search and filtering capabilities
- Bulk operations (export, import, cleanup)
- Storage usage monitoring and management

**Navigation**:
- Accessible from side panel via "Cabinets" button
- Opens in new tab for full-screen Cabinet management
- Breadcrumb navigation back to tab hierarchy

**Key Methods**:
- `renderCabinetList()`: Displays all saved Cabinets with metadata
- `showCabinetPreview(cabinetId)`: Shows detailed Cabinet contents
- `handleCabinetRestore(cabinetId)`: Restores Cabinet with confirmation
- `handleCabinetDelete(cabinetId)`: Deletes Cabinet with confirmation
- `handleCabinetRename(cabinetId, newName)`: Renames Cabinet
- `showSaveCabinetDialog()`: Opens dialog to save current hierarchy

### Event Handler

**Purpose**: Responds to Chrome tab events and user interactions

**Event Listeners**:
- `chrome.tabs.onCreated`: Add new tab to hierarchy
- `chrome.tabs.onRemoved`: Remove tab from hierarchy
- `chrome.tabs.onUpdated`: Update tab information
- `chrome.tabs.onActivated`: Update active tab state
- `chrome.tabs.onMoved`: Update tab positions

## Data Models

### TabNode
```javascript
interface TabNode {
  id: number;
  title: string;
  url: string;
  favicon: string;
  parentId: number | null;
  children: TabNode[];
  level: number;
  isActive: boolean;
  isPinned: boolean;
  isLoading: boolean;
}
```

### Cabinet
```javascript
interface Cabinet {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  tabs: TabNode[];
  metadata: {
    tabCount: number;
    windowId: number;
    originalWindowTitle?: string;
  };
}
```

### HierarchyState
```javascript
interface HierarchyState {
  rootTabs: TabNode[];
  tabMap: Map<number, TabNode>;
  activeTabId: number | null;
  windowId: number;
}
```

## Error Handling

### Tab Access Errors
- **Issue**: Restricted tabs (chrome://, extension pages)
- **Solution**: Display with disabled styling, show tooltip explaining restriction
- **Fallback**: Skip restricted tabs in hierarchy operations

### Storage Errors
- **Issue**: Browser storage quota exceeded
- **Solution**: Implement storage cleanup, warn user about limits
- **Fallback**: Temporary in-memory storage with session persistence

### API Permission Errors
- **Issue**: Missing tab permissions
- **Solution**: Request permissions dynamically, show permission prompt
- **Fallback**: Limited functionality mode with available permissions

### Cabinet Restoration Errors
- **Issue**: Saved URLs no longer accessible
- **Solution**: Skip broken URLs, log errors, show restoration summary
- **Fallback**: Restore available tabs, report failed URLs to user

## Testing Strategy

### Test Organization
All test files should be organized in a dedicated `tests/` directory structure to separate test code from production code:

- `tests/unit/` - Unit test files (*.test.ts, *.test.js)
- `tests/integration/` - Integration test files
- `tests/e2e/` - End-to-end test files
- Test files should mirror the source file structure for easy navigation
- Each source file should have a corresponding test file in the appropriate test directory

### Unit Tests
- Tab hierarchy building logic
- Cabinet save/restore operations
- Tree rendering functions
- Event handling methods

### Integration Tests
- Chrome API interactions
- Storage operations
- UI component interactions
- Cross-component data flow

### End-to-End Tests
- Complete tab management workflows
- Cabinet creation and restoration
- Multi-tab scenarios
- Error recovery scenarios

### Performance Tests
- Large tab count handling (100+ tabs)
- Frequent tab change scenarios
- Memory usage monitoring
- Storage operation timing

### Browser Compatibility Tests
- Chrome stable/beta/dev channels
- Different operating systems
- Various screen sizes and resolutions
- Extension update scenarios