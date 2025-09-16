/**
 * Tab Manager - Handles interactive tab management operations
 * Provides click handlers, context menus, hover effects, and drag-and-drop
 */

import { TabNode } from './types';

export interface TabManagerOptions {
  enableContextMenu?: boolean;
  enableDragDrop?: boolean;
  enableHoverEffects?: boolean;
  autoClosePopup?: boolean;
}

export interface TabAction {
  type: 'switch' | 'close' | 'closeChildren' | 'duplicate' | 'reorder' | 'pin' | 'unpin';
  tabId: number;
  targetTabId?: number;
  data?: any;
}

export class TabManager {
  private options: TabManagerOptions;
  private contextMenu: HTMLElement | null = null;
  private draggedTabId: number | null = null;
  private hoverTimeout: number | null = null;

  constructor(options: TabManagerOptions = {}) {
    this.options = {
      enableContextMenu: true,
      enableDragDrop: true,
      enableHoverEffects: true,
      autoClosePopup: false,
      ...options
    };

    this.setupGlobalEventListeners();
  }

  /**
   * Sets up global event listeners for tab management
   */
  private setupGlobalEventListeners(): void {
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    });

    // Handle escape key to hide context menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.contextMenu) {
        this.hideContextMenu();
      }
    });
  }

  /**
   * Attaches interactive event listeners to a tab element
   */
  attachTabEventListeners(
    tabElement: HTMLElement, 
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    const tabContent = tabElement.querySelector('.tree-content') as HTMLElement;
    if (!tabContent) return;

    // Click handler for tab switching
    this.attachClickHandler(tabContent, tab, onAction);

    // Context menu handler
    if (this.options.enableContextMenu) {
      this.attachContextMenuHandler(tabContent, tab, onAction);
    }

    // Hover effects
    if (this.options.enableHoverEffects) {
      this.attachHoverHandlers(tabContent, tab, onAction);
    }

    // Drag and drop
    if (this.options.enableDragDrop) {
      this.attachDragDropHandlers(tabElement, tab, onAction);
    }

    // Close button handler
    this.attachCloseButtonHandler(tabElement, tab, onAction);

    // Keyboard navigation
    this.attachKeyboardHandlers(tabElement, tab, onAction);
  }

  /**
   * Attaches click handler for tab switching
   */
  private attachClickHandler(
    tabContent: HTMLElement, 
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    // Don't attach click handler for restricted tabs
    if (this.isRestrictedTab(tab)) {
      tabContent.style.cursor = 'default';
      return;
    }

    tabContent.addEventListener('click', (e) => {
      // Don't trigger if clicking on close button or other interactive elements
      if ((e.target as HTMLElement).closest('.tab-close, .context-menu')) {
        return;
      }

      onAction({
        type: 'switch',
        tabId: tab.id
      });

      // Auto-close popup if enabled
      if (this.options.autoClosePopup && window.close) {
        setTimeout(() => window.close(), 100);
      }
    });

    // Visual feedback for clickable tabs
    tabContent.style.cursor = 'pointer';
  }

  /**
   * Attaches context menu handler
   */
  private attachContextMenuHandler(
    tabContent: HTMLElement,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    tabContent.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, tab, onAction);
    });
  }

  /**
   * Attaches hover effect handlers
   */
  private attachHoverHandlers(
    tabContent: HTMLElement,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    tabContent.addEventListener('mouseenter', () => {
      // Clear any existing timeout
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
      }

      // Add hover class immediately
      tabContent.classList.add('hover');

      // Highlight corresponding browser tab after delay
      this.hoverTimeout = window.setTimeout(() => {
        if (!this.isRestrictedTab(tab)) {
          this.highlightBrowserTab(tab.id);
        }
      }, 300);
    });

    tabContent.addEventListener('mouseleave', () => {
      // Clear timeout and remove hover effects
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
      }

      tabContent.classList.remove('hover');
      this.unhighlightBrowserTab(tab.id);
    });
  }

  /**
   * Attaches drag and drop handlers
   */
  private attachDragDropHandlers(
    tabElement: HTMLElement,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    // Don't enable drag/drop for restricted tabs
    if (this.isRestrictedTab(tab)) return;

    tabElement.draggable = true;

    // Drag start
    tabElement.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', tab.id.toString());
        e.dataTransfer.effectAllowed = 'move';
        this.draggedTabId = tab.id;
        
        // Add visual feedback
        tabElement.classList.add('dragging');
      }
    });

    // Drag end
    tabElement.addEventListener('dragend', () => {
      tabElement.classList.remove('dragging');
      this.draggedTabId = null;
      
      // Remove all drop indicators
      document.querySelectorAll('.drop-indicator').forEach(el => {
        el.classList.remove('drop-indicator');
      });
    });

    // Drag over
    tabElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      // Add drop indicator
      if (this.draggedTabId && this.draggedTabId !== tab.id) {
        tabElement.classList.add('drop-indicator');
      }
    });

    // Drag leave
    tabElement.addEventListener('dragleave', () => {
      tabElement.classList.remove('drop-indicator');
    });

    // Drop
    tabElement.addEventListener('drop', (e) => {
      e.preventDefault();
      tabElement.classList.remove('drop-indicator');

      if (e.dataTransfer) {
        const draggedTabId = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (draggedTabId && draggedTabId !== tab.id) {
          onAction({
            type: 'reorder',
            tabId: draggedTabId,
            targetTabId: tab.id
          });
        }
      }
    });
  }

  /**
   * Attaches close button handler
   */
  private attachCloseButtonHandler(
    tabElement: HTMLElement,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    const closeButton = tabElement.querySelector('.tab-close') as HTMLElement;
    if (!closeButton) return;

    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      
      onAction({
        type: 'close',
        tabId: tab.id
      });
    });

    // Add hover effects to close button
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#dc2626';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = '#ef4444';
    });
  }

  /**
   * Attaches keyboard navigation handlers
   */
  private attachKeyboardHandlers(
    tabElement: HTMLElement,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    // Make tab focusable
    tabElement.tabIndex = 0;

    tabElement.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!this.isRestrictedTab(tab)) {
            onAction({ type: 'switch', tabId: tab.id });
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (!this.isRestrictedTab(tab)) {
            onAction({ type: 'close', tabId: tab.id });
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          this.focusPreviousTab(tabElement);
          break;

        case 'ArrowDown':
          e.preventDefault();
          this.focusNextTab(tabElement);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          this.focusParentTab(tabElement);
          break;

        case 'ArrowRight':
          e.preventDefault();
          this.focusFirstChildTab(tabElement);
          break;

        case 'ContextMenu':
          e.preventDefault();
          if (this.options.enableContextMenu) {
            const rect = tabElement.getBoundingClientRect();
            const fakeEvent = {
              pageX: rect.left + rect.width / 2,
              pageY: rect.top + rect.height / 2,
              preventDefault: () => {}
            } as MouseEvent;
            this.showContextMenu(fakeEvent, tab, onAction);
          }
          break;
      }
    });
  }

  /**
   * Shows context menu for tab management
   */
  private showContextMenu(
    event: MouseEvent,
    tab: TabNode,
    onAction: (action: TabAction) => void
  ): void {
    this.hideContextMenu();

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    
    const menuItems = this.getContextMenuItems(tab);
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''}`;
      menuItem.textContent = item.label;
      
      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'context-menu-shortcut';
        shortcut.textContent = item.shortcut;
        menuItem.appendChild(shortcut);
      }
      
      if (!item.disabled) {
        menuItem.addEventListener('click', () => {
          onAction(item.action);
          this.hideContextMenu();
        });
      }
      
      contextMenu.appendChild(menuItem);
    });

    // Position context menu
    this.positionContextMenu(contextMenu, event);

    document.body.appendChild(contextMenu);
    this.contextMenu = contextMenu;

    // Focus first menu item for keyboard navigation
    const firstItem = contextMenu.querySelector('.context-menu-item:not(.disabled)') as HTMLElement;
    if (firstItem) {
      firstItem.focus();
    }
  }

  /**
   * Positions context menu to avoid going off-screen
   */
  private positionContextMenu(contextMenu: HTMLElement, event: MouseEvent): void {
    // Set initial position
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    // Temporarily add to DOM to measure
    contextMenu.style.visibility = 'hidden';
    document.body.appendChild(contextMenu);

    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if menu goes off-screen
    if (rect.right > viewportWidth) {
      contextMenu.style.left = `${event.pageX - rect.width}px`;
    }

    // Adjust vertical position if menu goes off-screen
    if (rect.bottom > viewportHeight) {
      contextMenu.style.top = `${event.pageY - rect.height}px`;
    }

    contextMenu.style.visibility = 'visible';
  }

  /**
   * Hides the context menu
   */
  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  /**
   * Gets context menu items for a tab
   */
  private getContextMenuItems(tab: TabNode): Array<{
    label: string;
    action: TabAction;
    disabled: boolean;
    shortcut?: string;
  }> {
    const isRestricted = this.isRestrictedTab(tab);
    const hasChildren = tab.children && tab.children.length > 0;
    
    return [
      {
        label: 'Switch to tab',
        action: { type: 'switch', tabId: tab.id },
        disabled: isRestricted,
        shortcut: 'Enter'
      },
      {
        label: 'Close tab',
        action: { type: 'close', tabId: tab.id },
        disabled: isRestricted,
        shortcut: 'Del'
      },
      {
        label: 'Close children',
        action: { type: 'closeChildren', tabId: tab.id },
        disabled: isRestricted || !hasChildren
      },
      {
        label: 'Duplicate tab',
        action: { type: 'duplicate', tabId: tab.id },
        disabled: isRestricted
      },
      {
        label: tab.isPinned ? 'Unpin tab' : 'Pin tab',
        action: { type: tab.isPinned ? 'unpin' : 'pin', tabId: tab.id },
        disabled: isRestricted
      }
    ];
  }

  /**
   * Keyboard navigation helpers
   */
  private focusPreviousTab(currentElement: HTMLElement): void {
    const allTabs = Array.from(document.querySelectorAll('.tree-node[tabindex="0"]'));
    const currentIndex = allTabs.indexOf(currentElement);
    
    if (currentIndex > 0) {
      (allTabs[currentIndex - 1] as HTMLElement).focus();
    }
  }

  private focusNextTab(currentElement: HTMLElement): void {
    const allTabs = Array.from(document.querySelectorAll('.tree-node[tabindex="0"]'));
    const currentIndex = allTabs.indexOf(currentElement);
    
    if (currentIndex < allTabs.length - 1) {
      (allTabs[currentIndex + 1] as HTMLElement).focus();
    }
  }

  private focusParentTab(currentElement: HTMLElement): void {
    // Find parent tab by looking at tree structure
    const tabId = currentElement.dataset.tabId;
    if (!tabId) return;

    const parentElement = this.findParentTabElement(currentElement);
    if (parentElement) {
      (parentElement as HTMLElement).focus();
    }
  }

  private focusFirstChildTab(currentElement: HTMLElement): void {
    // Find first child tab
    const nextSibling = currentElement.nextElementSibling;
    if (nextSibling && nextSibling.classList.contains('tree-node')) {
      (nextSibling as HTMLElement).focus();
    }
  }

  private findParentTabElement(currentElement: HTMLElement): Element | null {
    // This is a simplified implementation - in practice, you'd need to
    // track the hierarchy structure to find the actual parent
    const allTabs = Array.from(document.querySelectorAll('.tree-node[tabindex="0"]'));
    const currentIndex = allTabs.indexOf(currentElement);
    
    // Look backwards for a tab with fewer tree lines (indicating higher level)
    for (let i = currentIndex - 1; i >= 0; i--) {
      const element = allTabs[i] as HTMLElement;
      const currentTreeLines = currentElement.querySelectorAll('.tree-line').length;
      const elementTreeLines = element.querySelectorAll('.tree-line').length;
      
      if (elementTreeLines < currentTreeLines) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Browser tab highlighting (requires Chrome extension API)
   */
  private highlightBrowserTab(tabId: number): void {
    // This would typically use Chrome extension API to highlight the tab
    // For now, we'll dispatch a custom event that can be handled by the extension
    document.dispatchEvent(new CustomEvent('highlightTab', {
      detail: { tabId, highlight: true }
    }));
  }

  private unhighlightBrowserTab(tabId: number): void {
    document.dispatchEvent(new CustomEvent('highlightTab', {
      detail: { tabId, highlight: false }
    }));
  }

  /**
   * Utility methods
   */
  private isRestrictedTab(tab: TabNode): boolean {
    return tab.url.startsWith('chrome://') || 
           tab.url.startsWith('chrome-extension://') ||
           tab.url.startsWith('edge://') ||
           tab.url.startsWith('about:');
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.hideContextMenu();
    
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }
}