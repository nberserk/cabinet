/**
 * Constants for storage keys and configuration
 */

// Storage keys for Chrome storage API
export const STORAGE_KEYS = {
  CABINETS: 'tab_hierarchy_cabinets',
  SETTINGS: 'tab_hierarchy_settings',
  LAST_HIERARCHY: 'tab_hierarchy_last_state'
} as const;

// Configuration constants
export const CONFIG = {
  // Maximum number of tabs to display in hierarchy
  MAX_TABS: 500,
  
  // Maximum hierarchy depth to prevent infinite nesting
  MAX_HIERARCHY_DEPTH: 10,
  
  // Debounce delay for tab updates (ms)
  UPDATE_DEBOUNCE_DELAY: 100,
  
  // Maximum length for tab titles before truncation
  MAX_TITLE_LENGTH: 50,
  
  // Maximum number of Cabinets to store
  MAX_CABINETS: 100,
  
  // Storage quota warning threshold (bytes)
  STORAGE_WARNING_THRESHOLD: 5 * 1024 * 1024, // 5MB
  
  // Default popup dimensions
  POPUP_WIDTH: 350,
  POPUP_HEIGHT: 500,
  
  // Animation durations (ms)
  ANIMATION_DURATION: 200,
  
  // Keyboard shortcuts
  SHORTCUTS: {
    TOGGLE_EXTENSION: 'Ctrl+Shift+T',
    CLOSE_TAB: 'Delete',
    SWITCH_TAB: 'Enter'
  }
} as const;

// CSS class names for consistent styling
export const CSS_CLASSES = {
  TAB_NODE: 'tab-node',
  TAB_ACTIVE: 'tab-active',
  TAB_PINNED: 'tab-pinned',
  TAB_LOADING: 'tab-loading',
  TAB_RESTRICTED: 'tab-restricted',
  TREE_LINE: 'tree-line',
  TREE_CONNECTOR: 'tree-connector',
  HIERARCHY_CONTAINER: 'hierarchy-container'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  TAB_ACCESS_DENIED: 'Cannot access this tab due to browser restrictions',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please delete some Cabinets.',
  CABINET_NOT_FOUND: 'Cabinet not found',
  INVALID_CABINET_DATA: 'Invalid Cabinet data format',
  RESTORATION_FAILED: 'Failed to restore some tabs from Cabinet',
  PERMISSION_DENIED: 'Extension permissions required for this operation'
} as const;