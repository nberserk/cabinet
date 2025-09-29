# Design Document

## Overview

The React sidepanel will be a modern, component-based alternative to the existing vanilla JavaScript sidepanel implementation. It will maintain 100% functional parity while providing improved maintainability, better developer experience, and enhanced code organization through React's component architecture.

The design leverages React functional components with hooks for state management, TypeScript for type safety, and maintains the existing Tailwind CSS styling approach. The React implementation will integrate seamlessly with the existing Chrome extension architecture without requiring changes to the background script or other extension components.

## Architecture

### Component Hierarchy

```
SidepanelApp (Root Component)
├── Header
│   ├── WindowInfo
│   └── CabinetButton
├── TabTree
│   ├── LoadingState
│   ├── ErrorState
│   ├── EmptyState
│   └── TabNode (recursive)
│       ├── TabContent
│       │   ├── TabFavicon
│       │   ├── TabTitle
│       │   ├── DepthIndicator
│       │   ├── TabIndicators
│       │   └── CloseButton
│       └── TabNode[] (children)
└── ContextMenu
    └── ContextMenuItem[]
```

### State Management Architecture

The React sidepanel will use a combination of React hooks for state management:

- **useState**: For local component state (loading, error, context menu visibility)
- **useEffect**: For side effects (Chrome API calls, message listeners)
- **useContext**: For sharing global state across components (hierarchy state, current window ID)
- **useCallback**: For memoizing event handlers to prevent unnecessary re-renders
- **useMemo**: For expensive computations (tab tree processing)

### Build System Integration

The React components will be built using a lightweight build process that:
- Compiles TypeScript/JSX to vanilla JavaScript
- Maintains compatibility with Chrome extension Manifest V3
- Produces a single bundled file that can be loaded directly in the extension
- Preserves the existing Tailwind CSS workflow

## Components and Interfaces

### Core Interfaces

```typescript
// Extend existing types from types.ts
interface HierarchyState {
  rootTabs: TabNode[];
  tabCount: number;
  activeTabId: number | null;
  windowId: number;
}

interface SidepanelContextType {
  hierarchyState: HierarchyState | null;
  currentWindowId: number | null;
  isLoading: boolean;
  error: string | null;
  updateHierarchy: (state: HierarchyState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface TabNodeProps {
  tabNode: TabNode;
  depth: number;
  isLast: boolean;
  ancestorLines: boolean[];
}

interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedTab: TabNode | null;
  onClose: () => void;
}
```

### Component Specifications

#### SidepanelApp (Root Component)
- **Purpose**: Main application container and state provider
- **State**: Global hierarchy state, loading state, error state
- **Responsibilities**: 
  - Initialize Chrome extension communication
  - Manage global state through Context API
  - Handle Chrome runtime message listeners
  - Coordinate between child components

#### Header Component
- **Purpose**: Display window information and cabinet management access
- **Props**: None (uses context)
- **Responsibilities**:
  - Show current window tab count
  - Provide access to cabinet management
  - Display window-level status information

#### TabTree Component
- **Purpose**: Main tree visualization container
- **Props**: None (uses context)
- **State**: Context menu state, keyboard navigation state
- **Responsibilities**:
  - Render the complete tab hierarchy
  - Handle keyboard navigation setup
  - Manage context menu interactions
  - Coordinate state display (loading, error, empty)

#### TabNode Component (Recursive)
- **Purpose**: Individual tab representation with children
- **Props**: `TabNodeProps`
- **Responsibilities**:
  - Render individual tab with proper styling
  - Handle tab interaction events (click, context menu)
  - Recursively render child tabs
  - Manage visual hierarchy indicators

#### State Display Components
- **LoadingState**: Animated loading indicator
- **ErrorState**: Error message display with retry options
- **EmptyState**: No tabs found message

#### ContextMenu Component
- **Purpose**: Right-click context menu for tab actions
- **Props**: `ContextMenuProps`
- **Responsibilities**:
  - Display context-sensitive menu items
  - Handle menu item actions
  - Manage menu positioning and visibility

### Chrome Extension Integration

#### Message Handling
The React sidepanel will maintain the same message handling patterns as the vanilla version:

```typescript
// Message types remain the same
type MessageType = 
  | 'GET_HIERARCHY_STATE'
  | 'SWITCH_TO_TAB'
  | 'CLOSE_TAB'
  | 'CASCADING_DELETE'
  | 'SIDE_PANEL_OPENED'
  | 'SIDE_PANEL_CLOSED';

// React hook for Chrome runtime messages
function useChromeMessages() {
  useEffect(() => {
    const messageListener = (message: any) => {
      // Handle messages same as vanilla version
      switch (message.type) {
        case 'TAB_ADDED':
        case 'TAB_REMOVED':
        case 'TAB_UPDATED':
        case 'TAB_ACTIVATED':
        case 'HIERARCHY_UPDATED':
          // Update React state accordingly
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);
}
```

#### API Integration
All Chrome API calls will be wrapped in custom hooks:

```typescript
function useTabManagement() {
  const switchToTab = useCallback(async (tabId: number) => {
    // Same logic as vanilla version
  }, []);

  const closeTab = useCallback(async (tabId: number) => {
    // Same logic as vanilla version
  }, []);

  return { switchToTab, closeTab };
}
```

## Data Models

### State Management Models

The React implementation will use the same data models as the vanilla version but with enhanced TypeScript integration:

```typescript
// Enhanced TabNode with React-specific properties
interface ReactTabNode extends TabNode {
  // Add any React-specific properties if needed
  key?: string; // React key for efficient rendering
}

// Context state shape
interface SidepanelState {
  hierarchyState: HierarchyState | null;
  currentWindowId: number | null;
  isLoading: boolean;
  error: string | null;
  contextMenu: {
    isVisible: boolean;
    position: { x: number; y: number };
    selectedTab: TabNode | null;
  };
}
```

### Component State Models

Each component will have clearly defined state interfaces:

```typescript
// TabTree component state
interface TabTreeState {
  focusedTabId: number | null;
  expandedTabs: Set<number>;
}

// ContextMenu component state
interface ContextMenuState {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedTab: TabNode | null;
  menuItems: ContextMenuItem[];
}
```

## Error Handling

### Error Boundaries
Implement React Error Boundaries to catch and handle component errors gracefully:

```typescript
class SidepanelErrorBoundary extends React.Component {
  // Catch React component errors
  // Display fallback UI
  // Log errors for debugging
}
```

### Chrome API Error Handling
Maintain the same error handling patterns as the vanilla version:

- Retry logic for failed Chrome API calls
- Graceful degradation when APIs are unavailable
- User-friendly error messages
- Fallback to legacy message formats when needed

### State Recovery
Implement state recovery mechanisms:

- Automatic retry for failed hierarchy state requests
- Fallback to cached state when real-time updates fail
- Error state reset mechanisms

## Testing Strategy

### Unit Testing
- **Component Testing**: Test individual React components in isolation
- **Hook Testing**: Test custom hooks with React Testing Library
- **State Management Testing**: Test context providers and state updates
- **Chrome API Mocking**: Mock Chrome extension APIs for testing

### Integration Testing
- **Message Flow Testing**: Test Chrome runtime message handling
- **State Synchronization**: Test state updates from background script
- **User Interaction Testing**: Test click, keyboard, and context menu interactions

### Component Testing Framework
```typescript
// Example test structure
describe('TabNode Component', () => {
  it('renders tab information correctly', () => {
    // Test tab title, favicon, indicators
  });

  it('handles click events', () => {
    // Test tab switching functionality
  });

  it('renders children recursively', () => {
    // Test nested tab rendering
  });
});
```

### Testing Tools
- **React Testing Library**: For component testing
- **Vitest**: Maintain existing test runner
- **Chrome Extension Testing**: Mock Chrome APIs
- **JSDOM**: For DOM testing environment

## Build and Development Workflow

### Development Setup
1. **React Development Environment**:
   - Add React and ReactDOM dependencies
   - Configure TypeScript for JSX compilation
   - Set up development build process

2. **Build Process**:
   - Compile TypeScript/JSX to vanilla JavaScript
   - Bundle React components into single file
   - Maintain compatibility with Chrome extension loading

3. **Development Workflow**:
   - Hot reloading for React components
   - Integrated with existing Tailwind CSS build
   - Chrome extension development tools integration

### Build Configuration
```json
// Additional package.json scripts
{
  "scripts": {
    "build-react": "tsc && webpack --mode=production",
    "dev-react": "webpack --mode=development --watch",
    "build-react-sidepanel": "webpack --config webpack.sidepanel.js"
  }
}
```

### File Structure
```
src/
├── react-sidepanel/
│   ├── components/
│   │   ├── SidepanelApp.tsx
│   │   ├── Header.tsx
│   │   ├── TabTree.tsx
│   │   ├── TabNode.tsx
│   │   ├── ContextMenu.tsx
│   │   └── StateDisplays.tsx
│   ├── hooks/
│   │   ├── useChromeMessages.ts
│   │   ├── useTabManagement.ts
│   │   └── useKeyboardNavigation.ts
│   ├── context/
│   │   └── SidepanelContext.tsx
│   ├── types/
│   │   └── react-types.ts
│   └── index.tsx
├── sidepanel-react.html
└── sidepanel-react.js (compiled output)
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Set up React build environment
- Create basic component structure
- Implement context provider for state management
- Set up Chrome extension integration hooks

### Phase 2: Component Implementation
- Implement TabNode component with full functionality
- Create state display components (loading, error, empty)
- Implement context menu functionality
- Add keyboard navigation support

### Phase 3: Integration and Testing
- Integrate with existing Chrome extension architecture
- Implement comprehensive testing suite
- Performance optimization and bundle size optimization
- Documentation and developer experience improvements

### Phase 4: Feature Parity and Enhancement
- Ensure 100% feature parity with vanilla version
- Add React-specific enhancements (better error boundaries, performance optimizations)
- Implement configuration system for choosing between implementations
- Final testing and quality assurance