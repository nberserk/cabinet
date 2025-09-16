/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import { 
  getDescendantIdsInDeletionOrder,
  findOrphanedTabs,
  validateCascadingDeleteSafety,
  buildHierarchy,
  createTabNode
} from './utils';
import { HierarchyState } from './types';

// Mock Chrome tabs for testing
const createMockTab = (
  id: number, 
  title: string = `Tab ${id}`, 
  url: string = `https://example.com/${id}`,
  openerTabId?: number,
  active: boolean = false,
  pinned: boolean = false,
  index: number = id - 1
): chrome.tabs.Tab => ({
  id,
  title,
  url,
  openerTabId,
  active,
  pinned,
  index,
  windowId: 1,
  status: 'complete',
  favIconUrl: `https://example.com/favicon${id}.ico`
});

describe('Cascading Delete Utilities', () => {
  let hierarchy: HierarchyState;

  beforeEach(() => {
    const tabs = [
      createMockTab(1, 'Root'),
      createMockTab(2, 'Child 1', 'https://example.com/2', 1),
      createMockTab(3, 'Child 2', 'https://example.com/3', 1),
      createMockTab(4, 'Grandchild 1', 'https://example.com/4', 2),
      createMockTab(5, 'Grandchild 2', 'https://example.com/5', 2),
      createMockTab(6, 'Great-grandchild', 'https://example.com/6', 4)
    ];
    hierarchy = buildHierarchy(tabs);
  });

  describe('getDescendantIdsInDeletionOrder', () => {
    it('should return descendants in deletion order (deepest first)', () => {
      const deleteOrder = getDescendantIdsInDeletionOrder(1, hierarchy.tabMap);
      
      // Should be ordered by level (deepest first)
      expect(deleteOrder).toEqual([6, 4, 5, 2, 3]);
      
      // Verify levels are in correct order
      const levels = deleteOrder.map(id => hierarchy.tabMap.get(id)?.level || 0);
      for (let i = 0; i < levels.length - 1; i++) {
        expect(levels[i]).toBeGreaterThanOrEqual(levels[i + 1]);
      }
    });

    it('should return empty array for leaf node', () => {
      const deleteOrder = getDescendantIdsInDeletionOrder(6, hierarchy.tabMap);
      expect(deleteOrder).toEqual([]);
    });

    it('should return empty array for non-existent tab', () => {
      const deleteOrder = getDescendantIdsInDeletionOrder(999, hierarchy.tabMap);
      expect(deleteOrder).toEqual([]);
    });

    it('should handle middle-level tabs correctly', () => {
      const deleteOrder = getDescendantIdsInDeletionOrder(2, hierarchy.tabMap);
      expect(deleteOrder).toEqual([6, 4, 5]);
    });
  });

  describe('findOrphanedTabs', () => {
    it('should find direct children that would be orphaned', () => {
      const orphaned = findOrphanedTabs(1, hierarchy);
      expect(orphaned).toEqual([2, 3]);
    });

    it('should return empty array for leaf node', () => {
      const orphaned = findOrphanedTabs(6, hierarchy);
      expect(orphaned).toEqual([]);
    });

    it('should return empty array for non-existent tab', () => {
      const orphaned = findOrphanedTabs(999, hierarchy);
      expect(orphaned).toEqual([]);
    });

    it('should find children for middle-level tabs', () => {
      const orphaned = findOrphanedTabs(2, hierarchy);
      expect(orphaned).toEqual([4, 5]);
    });
  });

  describe('validateCascadingDeleteSafety', () => {
    it('should validate safe deletion for small hierarchy', () => {
      const validation = validateCascadingDeleteSafety(6, hierarchy);
      expect(validation.isSafe).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect excessive deletions', () => {
      const validation = validateCascadingDeleteSafety(1, hierarchy, 3);
      expect(validation.isSafe).toBe(false);
      expect(validation.issues).toContain('Would delete 6 tabs, exceeding safety limit of 3');
    });

    it('should handle non-existent tab', () => {
      const validation = validateCascadingDeleteSafety(999, hierarchy);
      expect(validation.isSafe).toBe(false);
      expect(validation.issues).toContain('Tab not found in hierarchy');
    });

    it('should detect circular references', () => {
      // Create a circular reference for testing
      const tab1 = hierarchy.tabMap.get(1)!;
      const tab2 = hierarchy.tabMap.get(2)!;
      
      // Manually create circular reference
      tab1.parentId = 2;
      tab2.children.push(tab1);
      
      const validation = validateCascadingDeleteSafety(1, hierarchy);
      expect(validation.isSafe).toBe(false);
      expect(validation.issues).toContain('Circular reference detected in hierarchy - deletion would cause infinite loop');
    });

    it('should allow deletion within safety limits', () => {
      const validation = validateCascadingDeleteSafety(2, hierarchy, 10);
      expect(validation.isSafe).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });
});