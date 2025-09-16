/**
 * Core TypeScript interfaces for Tab Hierarchy Visualizer
 */

export interface TabNode {
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

export interface Cabinet {
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

export interface HierarchyState {
  rootTabs: TabNode[];
  tabMap: Map<number, TabNode>;
  activeTabId: number | null;
  windowId: number;
}

export interface TabEventData {
  tabId: number;
  changeInfo?: chrome.tabs.TabChangeInfo;
  tab?: chrome.tabs.Tab;
}

export interface CabinetMetadata {
  tabCount: number;
  windowId: number;
  originalWindowTitle?: string;
}