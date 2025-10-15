import type { Tab } from './tab.js';

export interface Cabinet {
  id: string; // Unique identifier for the cabinet
  name: string; // User-defined or auto-generated name
  createdAt: number; // Timestamp when cabinet was created
  updatedAt: number; // Timestamp when cabinet was last modified
  tabs: Tab[]; // All tabs in their original order
  activeTabId: number; // ID of the tab that was active when saved
  description?: string; // Optional user description
  tags?: string[]; // Optional tags for organization
}
