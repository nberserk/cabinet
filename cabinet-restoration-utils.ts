/**
 * Utility functions for Cabinet restoration operations
 */

import { TabNode, Cabinet } from './types';

export interface RestorationProgress {
  totalTabs: number;
  processedTabs: number;
  successfulTabs: number;
  failedTabs: number;
  currentTab?: string;
  errors: string[];
  warnings: string[];
}

export interface RestorationPlan {
  tabsToRestore: TabRestorationItem[];
  restrictedTabs: TabNode[];
  totalTabs: number;
  estimatedTime: number;
  warnings: string[];
}

export interface TabRestorationItem {
  tab: TabNode;
  order: number;
  parentOrder?: number;
  depth: number;
}

export class CabinetRestorationUtils {
  /**
   * Creates a restoration plan from Cabinet data
   */
  public static createRestorationPlan(cabinet: Cabinet): RestorationPlan {
    const plan: RestorationPlan = {
      tabsToRestore: [],
      restrictedTabs: [],
      totalTabs: 0,
      estimatedTime: 0,
      warnings: []
    };

    let order = 0;
    const orderMap = new Map<number, number>();

    // Recursively process tabs to create restoration order
    const processTabs = (tabs: TabNode[], parentOrder?: number, depth: number = 0) => {
      tabs.forEach(tab => {
        plan.totalTabs++;

        if (this.isRestrictedUrl(tab.url)) {
          plan.restrictedTabs.push(tab);
          plan.warnings.push(`Restricted URL will be skipped: ${tab.url}`);
        } else {
          const currentOrder = order++;
          orderMap.set(tab.id, currentOrder);

          plan.tabsToRestore.push({
            tab,
            order: currentOrder,
            parentOrder,
            depth
          });
        }

        // Process children
        if (tab.children.length > 0) {
          const tabOrder = orderMap.get(tab.id);
          processTabs(tab.children, tabOrder, depth + 1);
        }
      });
    };

    processTabs(cabinet.tabs);

    // Estimate restoration time (rough calculation)
    plan.estimatedTime = plan.tabsToRestore.length * 200; // 200ms per tab

    // Add warnings for large restorations
    if (plan.tabsToRestore.length > 50) {
      plan.warnings.push(`Large restoration: ${plan.tabsToRestore.length} tabs will be restored`);
    }

    if (plan.restrictedTabs.length > 0) {
      plan.warnings.push(`${plan.restrictedTabs.length} tabs cannot be restored due to browser restrictions`);
    }

    return plan;
  }

  /**
   * Validates restoration safety
   */
  public static validateRestorationSafety(
    cabinet: Cabinet,
    currentTabs: chrome.tabs.Tab[]
  ): {
    isSafe: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for excessive tab count
    const plan = this.createRestorationPlan(cabinet);
    const totalTabsAfterRestoration = currentTabs.length + plan.tabsToRestore.length;

    if (totalTabsAfterRestoration > 100) {
      issues.push(`Restoration would result in ${totalTabsAfterRestoration} total tabs`);
      recommendations.push('Consider closing some existing tabs before restoration');
    }

    // Check for memory concerns
    if (plan.tabsToRestore.length > 30) {
      issues.push('Large number of tabs may impact browser performance');
      recommendations.push('Consider restoring in smaller batches');
    }

    // Check for duplicate URLs
    const currentUrls = new Set(currentTabs.map(tab => tab.url));
    const duplicateUrls = plan.tabsToRestore.filter(item => 
      currentUrls.has(item.tab.url)
    );

    if (duplicateUrls.length > 0) {
      issues.push(`${duplicateUrls.length} tabs have URLs that are already open`);
      recommendations.push('Consider closing duplicate tabs first');
    }

    // Check for pinned tabs that will be closed
    const pinnedTabs = currentTabs.filter(tab => tab.pinned);
    if (pinnedTabs.length > 0) {
      recommendations.push(`${pinnedTabs.length} pinned tabs will remain open`);
    }

    return {
      isSafe: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Creates a progress tracker for restoration
   */
  public static createProgressTracker(totalTabs: number): RestorationProgress {
    return {
      totalTabs,
      processedTabs: 0,
      successfulTabs: 0,
      failedTabs: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Updates progress tracker
   */
  public static updateProgress(
    progress: RestorationProgress,
    success: boolean,
    tabTitle?: string,
    error?: string
  ): RestorationProgress {
    const updated = { ...progress };
    
    updated.processedTabs++;
    
    if (success) {
      updated.successfulTabs++;
    } else {
      updated.failedTabs++;
      if (error) {
        updated.errors.push(error);
      }
    }

    if (tabTitle) {
      updated.currentTab = tabTitle;
    }

    return updated;
  }

  /**
   * Generates restoration summary
   */
  public static generateRestorationSummary(
    progress: RestorationProgress,
    startTime: number,
    endTime: number
  ): {
    success: boolean;
    duration: number;
    summary: string;
    details: {
      totalTabs: number;
      successfulTabs: number;
      failedTabs: number;
      successRate: number;
      averageTimePerTab: number;
    };
  } {
    const duration = endTime - startTime;
    const successRate = progress.totalTabs > 0 
      ? (progress.successfulTabs / progress.totalTabs) * 100 
      : 0;
    const averageTimePerTab = progress.processedTabs > 0 
      ? duration / progress.processedTabs 
      : 0;

    let summary = `Restored ${progress.successfulTabs} of ${progress.totalTabs} tabs`;
    
    if (progress.failedTabs > 0) {
      summary += ` (${progress.failedTabs} failed)`;
    }
    
    summary += ` in ${Math.round(duration / 1000)}s`;

    return {
      success: progress.failedTabs === 0,
      duration,
      summary,
      details: {
        totalTabs: progress.totalTabs,
        successfulTabs: progress.successfulTabs,
        failedTabs: progress.failedTabs,
        successRate: Math.round(successRate),
        averageTimePerTab: Math.round(averageTimePerTab)
      }
    };
  }

  /**
   * Checks if URL is restricted
   */
  private static isRestrictedUrl(url: string): boolean {
    const restrictedProtocols = [
      'chrome://',
      'chrome-extension://',
      'chrome-devtools://',
      'edge://',
      'about:',
      'moz-extension://',
      'safari-extension://'
    ];
    
    return restrictedProtocols.some(protocol => url.startsWith(protocol));
  }

  /**
   * Estimates restoration time based on tab count and complexity
   */
  public static estimateRestorationTime(cabinet: Cabinet): {
    estimatedSeconds: number;
    factors: string[];
  } {
    const plan = this.createRestorationPlan(cabinet);
    const factors: string[] = [];
    
    let baseTime = plan.tabsToRestore.length * 0.2; // 200ms per tab
    
    // Add time for hierarchy complexity
    const maxDepth = Math.max(...plan.tabsToRestore.map(item => item.depth));
    if (maxDepth > 2) {
      baseTime *= 1.2;
      factors.push('Complex hierarchy structure');
    }

    // Add time for large number of tabs
    if (plan.tabsToRestore.length > 20) {
      baseTime *= 1.3;
      factors.push('Large number of tabs');
    }

    // Add time for potential network delays
    const uniqueDomains = new Set(
      plan.tabsToRestore.map(item => {
        try {
          return new URL(item.tab.url).hostname;
        } catch {
          return 'unknown';
        }
      })
    );

    if (uniqueDomains.size > 10) {
      baseTime *= 1.1;
      factors.push('Multiple domains');
    }

    return {
      estimatedSeconds: Math.round(baseTime),
      factors
    };
  }

  /**
   * Analyzes Cabinet for potential restoration issues
   */
  public static analyzeCabinetForRestoration(cabinet: Cabinet): {
    canRestore: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
    statistics: {
      totalTabs: number;
      restorableTabs: number;
      restrictedTabs: number;
      maxDepth: number;
      uniqueDomains: number;
      pinnedTabs: number;
    };
  } {
    const plan = this.createRestorationPlan(cabinet);
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (plan.totalTabs === 0) {
      issues.push('Cabinet contains no tabs');
      return {
        canRestore: false,
        issues,
        warnings,
        recommendations,
        statistics: {
          totalTabs: 0,
          restorableTabs: 0,
          restrictedTabs: 0,
          maxDepth: 0,
          uniqueDomains: 0,
          pinnedTabs: 0
        }
      };
    }

    if (plan.tabsToRestore.length === 0) {
      issues.push('No tabs can be restored (all are restricted)');
    }

    // Analyze statistics
    const maxDepth = Math.max(...plan.tabsToRestore.map(item => item.depth), 0);
    const uniqueDomains = new Set(
      plan.tabsToRestore.map(item => {
        try {
          return new URL(item.tab.url).hostname;
        } catch {
          return 'unknown';
        }
      })
    ).size;

    const pinnedTabs = plan.tabsToRestore.filter(item => item.tab.isPinned).length;

    // Generate warnings and recommendations
    if (plan.tabsToRestore.length > 50) {
      warnings.push('Large number of tabs may impact browser performance');
      recommendations.push('Consider closing unnecessary tabs before restoration');
    }

    if (maxDepth > 5) {
      warnings.push('Very deep hierarchy may be difficult to navigate');
    }

    if (plan.restrictedTabs.length > 0) {
      warnings.push(`${plan.restrictedTabs.length} tabs cannot be restored due to browser restrictions`);
    }

    if (pinnedTabs > 10) {
      warnings.push('Many pinned tabs may clutter the tab bar');
      recommendations.push('Consider unpinning some tabs after restoration');
    }

    return {
      canRestore: issues.length === 0,
      issues,
      warnings: [...warnings, ...plan.warnings],
      recommendations,
      statistics: {
        totalTabs: plan.totalTabs,
        restorableTabs: plan.tabsToRestore.length,
        restrictedTabs: plan.restrictedTabs.length,
        maxDepth,
        uniqueDomains,
        pinnedTabs
      }
    };
  }

  /**
   * Creates a restoration batch plan for large Cabinets
   */
  public static createBatchRestorationPlan(
    cabinet: Cabinet,
    batchSize: number = 10
  ): {
    batches: TabRestorationItem[][];
    totalBatches: number;
    estimatedTimePerBatch: number;
  } {
    const plan = this.createRestorationPlan(cabinet);
    const batches: TabRestorationItem[][] = [];
    
    // Group tabs by depth first, then by batch size
    const tabsByDepth = new Map<number, TabRestorationItem[]>();
    
    plan.tabsToRestore.forEach(item => {
      if (!tabsByDepth.has(item.depth)) {
        tabsByDepth.set(item.depth, []);
      }
      tabsByDepth.get(item.depth)!.push(item);
    });

    // Create batches respecting hierarchy (parents before children)
    const sortedDepths = Array.from(tabsByDepth.keys()).sort((a, b) => a - b);
    
    sortedDepths.forEach(depth => {
      const tabsAtDepth = tabsByDepth.get(depth)!;
      
      for (let i = 0; i < tabsAtDepth.length; i += batchSize) {
        const batch = tabsAtDepth.slice(i, i + batchSize);
        batches.push(batch);
      }
    });

    return {
      batches,
      totalBatches: batches.length,
      estimatedTimePerBatch: batchSize * 200 // 200ms per tab
    };
  }
}