// Base TabNode interface (copied from main types.ts for React build)
export interface TabNode {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  isPinned: boolean;
  isLoading: boolean;
  children: TabNode[];
  parentId?: number;
  openerTabId?: number;
  windowId: number;
}

// React-specific type extensions
export interface HierarchyState {
  rootTabs: TabNode[];
  tabCount: number;
  activeTabId: number | null;
  windowId: number;
}

export interface SidepanelContextType {
  hierarchyState: HierarchyState | null;
  currentWindowId: number | null;
  isLoading: boolean;
  error: string | null;
  updateHierarchy: (state: HierarchyState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export interface TabNodeProps {
  tabNode: TabNode;
  depth: number;
  isLast: boolean;
  ancestorLines: boolean[];
}

export interface ContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedTab: TabNode | null;
  onClose: () => void;
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled: boolean;
}

// Chrome extension message types
export type ChromeMessageType = 
  | 'GET_HIERARCHY_STATE'
  | 'SWITCH_TO_TAB'
  | 'CLOSE_TAB'
  | 'CASCADING_DELETE'
  | 'SIDE_PANEL_OPENED'
  | 'SIDE_PANEL_CLOSED'
  | 'TAB_ADDED'
  | 'TAB_REMOVED'
  | 'TAB_UPDATED'
  | 'TAB_ACTIVATED'
  | 'HIERARCHY_UPDATED';

export interface ChromeMessage {
  type: ChromeMessageType;
  windowId?: number;
  tabId?: number;
  tab?: TabNode;
  parentId?: number;
  hierarchyState?: HierarchyState;
  success?: boolean;
  error?: string;
}