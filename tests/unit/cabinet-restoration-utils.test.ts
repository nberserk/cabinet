/**
 * Tests for Cabinet restoration utilities
 */

import { CabinetRestorationUtils } from './cabinet-restoration-utils';
import { Cabinet, TabNode } from './types';

describe('CabinetRestorationUtils', () => {
  let mockCabinet: Cabinet;
  let complexHierarchy: TabNode[];

  beforeEach(() => {
    // Create a complex hierarchy for testing
    complexHierarchy = [
      {
        id: 1,
        title: 'Root Tab 1',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [
          {
            id: 2,
            title: 'Child 1.1',
            url: 'https://example.com/child1',
            favicon: '',
            parentId: 1,
            children: [
              {
                id: 3,
                title: 'Grandchild 1.1.1',
                url: 'https://example.com/grandchild1',
                favicon: '',
                parentId: 2,
                children: [],
                level: 2,
                isActive: false,
                isPinned: false,
                isLoading: false
              }
            ],
            level: 1,
            isActive: false,
            isPinned: true,
            isLoading: false
          },
          {
            id: 4,
            title: 'Child 1.2',
            url: 'chrome://settings',
            favicon: '',
            parentId: 1,
            children: [],
            level: 1,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ],
        level: 0,
        isActive: true,
        isPinned: false,
        isLoading: false
      },
      {
        id: 5,
        title: 'Root Tab 2',
        url: 'https://another-domain.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      }
    ];

    mockCabinet = {
      id: 'test_cabinet',
      name: 'Test Cabinet',
      createdAt: new Date(),
      updatedAt: new Date(),
      tabs: complexHierarchy,
      metadata: {
        tabCount: 5,
        windowId: 123
      }
    };
  });

  describe('createRestorationPlan', () => {
    it('should create a proper restoration plan', () => {
      const plan = CabinetRestorationUtils.createRestorationPlan(mockCabinet);

      expect(plan.totalTabs).toBe(5);
      expect(plan.tabsToRestore).toHaveLength(4); // Excluding chrome://settings
      expect(plan.restrictedTabs).toHaveLength(1);
      expect(plan.restrictedTabs[0].url).toBe('chrome://settings');
    });

    it('should maintain proper restoration order', () => {
      const plan = CabinetRestorationUtils.createRestorationPlan(mockCabinet);

      // Root tabs should come first
      const rootTabs = plan.tabsToRestore.filter(item => item.depth === 0);
      expect(rootTabs).toHaveLength(2);

      // Children should come after parents
      const childTabs = plan.tabsToRestore.filter(item => item.depth === 1);
      const grandchildTabs = plan.tabsToRestore.filter(item => item.depth === 2);

      expect(childTabs).toHaveLength(1); // chrome://settings is excluded
      expect(grandchildTabs).toHaveLength(1);

      // Verify order relationships
      const parentItem = plan.tabsToRestore.find(item => item.tab.id === 1);
      const childItem = plan.tabsToRestore.find(item => item.tab.id === 2);
      const grandchildItem = plan.tabsToRestore.find(item => item.tab.id === 3);

      expect(parentItem?.order).toBeLessThan(childItem?.order || Infinity);
      expect(childItem?.order).toBeLessThan(grandchildItem?.order || Infinity);
      expect(childItem?.parentOrder).toBe(parentItem?.order);
      expect(grandchildItem?.parentOrder).toBe(childItem?.order);
    });

    it('should generate appropriate warnings', () => {
      const plan = CabinetRestorationUtils.createRestorationPlan(mockCabinet);

      expect(plan.warnings).toContain('Restricted URL will be skipped: chrome://settings');
      expect(plan.warnings).toContain('1 tabs cannot be restored due to browser restrictions');
    });

    it('should estimate restoration time', () => {
      const plan = CabinetRestorationUtils.createRestorationPlan(mockCabinet);

      expect(plan.estimatedTime).toBe(800); // 4 tabs * 200ms
    });

    it('should warn about large restorations', () => {
      const largeCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 60 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://example${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      const plan = CabinetRestorationUtils.createRestorationPlan(largeCabinet);

      expect(plan.warnings.some(w => w.includes('Large restoration'))).toBe(true);
    });
  });

  describe('validateRestorationSafety', () => {
    const mockCurrentTabs: chrome.tabs.Tab[] = [
      { id: 100, url: 'https://current-tab.com', title: 'Current Tab', pinned: false } as chrome.tabs.Tab,
      { id: 101, url: 'https://pinned-tab.com', title: 'Pinned Tab', pinned: true } as chrome.tabs.Tab
    ];

    it('should validate safe restoration', () => {
      const result = CabinetRestorationUtils.validateRestorationSafety(mockCabinet, mockCurrentTabs);

      expect(result.isSafe).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toContain('1 pinned tabs will remain open');
    });

    it('should detect excessive tab count', () => {
      const manyTabs = Array.from({ length: 100 }, (_, i) => ({
        id: i + 200,
        url: `https://tab${i}.com`,
        title: `Tab ${i}`,
        pinned: false
      } as chrome.tabs.Tab));

      const result = CabinetRestorationUtils.validateRestorationSafety(mockCabinet, manyTabs);

      expect(result.isSafe).toBe(false);
      expect(result.issues.some(issue => issue.includes('total tabs'))).toBe(true);
      expect(result.recommendations).toContain('Consider closing some existing tabs before restoration');
    });

    it('should detect duplicate URLs', () => {
      const duplicateTabs: chrome.tabs.Tab[] = [
        { id: 100, url: 'https://example.com', title: 'Duplicate', pinned: false } as chrome.tabs.Tab
      ];

      const result = CabinetRestorationUtils.validateRestorationSafety(mockCabinet, duplicateTabs);

      expect(result.issues.some(issue => issue.includes('URLs that are already open'))).toBe(true);
      expect(result.recommendations).toContain('Consider closing duplicate tabs first');
    });

    it('should warn about performance impact', () => {
      const largeCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 35 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://example${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      const result = CabinetRestorationUtils.validateRestorationSafety(largeCabinet, []);

      expect(result.issues).toContain('Large number of tabs may impact browser performance');
      expect(result.recommendations).toContain('Consider restoring in smaller batches');
    });
  });

  describe('progress tracking', () => {
    it('should create progress tracker', () => {
      const progress = CabinetRestorationUtils.createProgressTracker(5);

      expect(progress.totalTabs).toBe(5);
      expect(progress.processedTabs).toBe(0);
      expect(progress.successfulTabs).toBe(0);
      expect(progress.failedTabs).toBe(0);
      expect(progress.errors).toHaveLength(0);
    });

    it('should update progress correctly', () => {
      let progress = CabinetRestorationUtils.createProgressTracker(3);

      progress = CabinetRestorationUtils.updateProgress(progress, true, 'Tab 1');
      expect(progress.processedTabs).toBe(1);
      expect(progress.successfulTabs).toBe(1);
      expect(progress.failedTabs).toBe(0);
      expect(progress.currentTab).toBe('Tab 1');

      progress = CabinetRestorationUtils.updateProgress(progress, false, 'Tab 2', 'Error message');
      expect(progress.processedTabs).toBe(2);
      expect(progress.successfulTabs).toBe(1);
      expect(progress.failedTabs).toBe(1);
      expect(progress.errors).toContain('Error message');
    });

    it('should generate restoration summary', () => {
      const progress = {
        totalTabs: 5,
        processedTabs: 5,
        successfulTabs: 4,
        failedTabs: 1,
        errors: ['One error'],
        warnings: []
      };

      const summary = CabinetRestorationUtils.generateRestorationSummary(progress, 1000, 3000);

      expect(summary.success).toBe(false); // Has failed tabs
      expect(summary.duration).toBe(2000);
      expect(summary.summary).toContain('Restored 4 of 5 tabs');
      expect(summary.summary).toContain('(1 failed)');
      expect(summary.details.successRate).toBe(80);
      expect(summary.details.averageTimePerTab).toBe(400);
    });
  });

  describe('estimateRestorationTime', () => {
    it('should estimate basic restoration time', () => {
      const estimate = CabinetRestorationUtils.estimateRestorationTime(mockCabinet);

      expect(estimate.estimatedSeconds).toBeGreaterThan(0);
      expect(estimate.factors).toBeDefined();
    });

    it('should account for complex hierarchy', () => {
      const deepHierarchy = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Root',
            url: 'https://example.com',
            favicon: '',
            parentId: null,
            children: [
              {
                id: 2,
                title: 'Level 1',
                url: 'https://example.com/1',
                favicon: '',
                parentId: 1,
                children: [
                  {
                    id: 3,
                    title: 'Level 2',
                    url: 'https://example.com/2',
                    favicon: '',
                    parentId: 2,
                    children: [
                      {
                        id: 4,
                        title: 'Level 3',
                        url: 'https://example.com/3',
                        favicon: '',
                        parentId: 3,
                        children: [],
                        level: 3,
                        isActive: false,
                        isPinned: false,
                        isLoading: false
                      }
                    ],
                    level: 2,
                    isActive: false,
                    isPinned: false,
                    isLoading: false
                  }
                ],
                level: 1,
                isActive: false,
                isPinned: false,
                isLoading: false
              }
            ],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ]
      };

      const estimate = CabinetRestorationUtils.estimateRestorationTime(deepHierarchy);

      expect(estimate.factors).toContain('Complex hierarchy structure');
    });

    it('should account for large number of tabs', () => {
      const largeCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://example${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      const estimate = CabinetRestorationUtils.estimateRestorationTime(largeCabinet);

      expect(estimate.factors).toContain('Large number of tabs');
    });

    it('should account for multiple domains', () => {
      const multiDomainCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://domain${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      const estimate = CabinetRestorationUtils.estimateRestorationTime(multiDomainCabinet);

      expect(estimate.factors).toContain('Multiple domains');
    });
  });

  describe('analyzeCabinetForRestoration', () => {
    it('should analyze normal Cabinet', () => {
      const analysis = CabinetRestorationUtils.analyzeCabinetForRestoration(mockCabinet);

      expect(analysis.canRestore).toBe(true);
      expect(analysis.statistics.totalTabs).toBe(5);
      expect(analysis.statistics.restorableTabs).toBe(4);
      expect(analysis.statistics.restrictedTabs).toBe(1);
      expect(analysis.statistics.maxDepth).toBe(2);
      expect(analysis.statistics.uniqueDomains).toBe(2);
      expect(analysis.statistics.pinnedTabs).toBe(1);
    });

    it('should detect empty Cabinet', () => {
      const emptyCabinet = { ...mockCabinet, tabs: [] };
      const analysis = CabinetRestorationUtils.analyzeCabinetForRestoration(emptyCabinet);

      expect(analysis.canRestore).toBe(false);
      expect(analysis.issues).toContain('Cabinet contains no tabs');
    });

    it('should detect all-restricted Cabinet', () => {
      const restrictedCabinet = {
        ...mockCabinet,
        tabs: [
          {
            id: 1,
            title: 'Chrome Settings',
            url: 'chrome://settings',
            favicon: '',
            parentId: null,
            children: [],
            level: 0,
            isActive: false,
            isPinned: false,
            isLoading: false
          }
        ]
      };

      const analysis = CabinetRestorationUtils.analyzeCabinetForRestoration(restrictedCabinet);

      expect(analysis.canRestore).toBe(false);
      expect(analysis.issues).toContain('No tabs can be restored (all are restricted)');
    });

    it('should warn about large Cabinets', () => {
      const largeCabinet = {
        ...mockCabinet,
        tabs: Array.from({ length: 60 }, (_, i) => ({
          id: i + 1,
          title: `Tab ${i}`,
          url: `https://example${i}.com`,
          favicon: '',
          parentId: null,
          children: [],
          level: 0,
          isActive: false,
          isPinned: false,
          isLoading: false
        }))
      };

      const analysis = CabinetRestorationUtils.analyzeCabinetForRestoration(largeCabinet);

      expect(analysis.warnings.some(w => w.includes('may impact browser performance'))).toBe(true);
      expect(analysis.recommendations).toContain('Consider closing unnecessary tabs before restoration');
    });
  });

  describe('createBatchRestorationPlan', () => {
    it('should create batches respecting hierarchy', () => {
      const batchPlan = CabinetRestorationUtils.createBatchRestorationPlan(mockCabinet, 2);

      expect(batchPlan.totalBatches).toBeGreaterThan(1);
      expect(batchPlan.estimatedTimePerBatch).toBe(400); // 2 tabs * 200ms

      // Verify that parents come before children across batches
      const allItems = batchPlan.batches.flat();
      const parentItem = allItems.find(item => item.tab.id === 1);
      const childItem = allItems.find(item => item.tab.id === 2);

      expect(parentItem?.order).toBeLessThan(childItem?.order || Infinity);
    });

    it('should handle small batch sizes', () => {
      const batchPlan = CabinetRestorationUtils.createBatchRestorationPlan(mockCabinet, 1);

      expect(batchPlan.totalBatches).toBe(4); // 4 restorable tabs
      expect(batchPlan.estimatedTimePerBatch).toBe(200); // 1 tab * 200ms
    });

    it('should handle large batch sizes', () => {
      const batchPlan = CabinetRestorationUtils.createBatchRestorationPlan(mockCabinet, 10);

      expect(batchPlan.totalBatches).toBeLessThanOrEqual(4);
      expect(batchPlan.batches.every(batch => batch.length <= 10)).toBe(true);
    });
  });
});