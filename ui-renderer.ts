/**
 * UI Rendering System for Tab Hierarchy Visualizer
 * Handles tree visualization components with Tailwind CSS styling
 */

import { TabNode } from './types';

export interface TabDisplayData {
  id: number;
  title: string;
  url: string;
  favicon: string;
  isActive: boolean;
  isPinned: boolean;
  isLoading: boolean;
  isRestricted: boolean;
  level: number;
}

export interface TreeRenderOptions {
  showCloseButtons?: boolean;
  enableContextMenu?: boolean;
  enableDragDrop?: boolean;
  maxTitleLength?: number;
}

export class UIRenderer {
  private container: HTMLElement;
  private options: TreeRenderOptions;
  private contextMenu: HTMLElement | null = null;

  constructor(container: HTMLElement, options: TreeRenderOptions = {}) {
    this.container = container;
    this.options = {
      showCloseButtons: true,
      enableContextMenu: true,
      enableDragDrop: false,
      maxTitleLength: 50,
      ...options
    };
  }

  /**
   * Renders the complete tree structure
   */
  renderTree(hierarchy: TabNode[]): void {
    this.container.innerHTML = '';
    
    if (hierarchy.length === 0) {
      this.renderEmptyState();
      return;
    }

    hierarchy.forEach((rootTab, index) => {
      const isLast = index === hierarchy.length - 1;
      this.renderTabNode(rootTab, 0, isLast, []);
    });
  }

  /**
   * Renders individual tab node with tree lines and visual indicators
   */
  renderTabNode(
    tab: TabNode, 
    level: number, 
    isLast: boolean = false, 
    ancestorLines: boolean[] = []
  ): HTMLElement {
    const tabElement = this.createTabElement(tab, level, isLast, ancestorLines);
    this.container.appendChild(tabElement);

    // Render children recursively
    if (tab.children && tab.children.length > 0) {
      const newAncestorLines = [...ancestorLines];
      newAncestorLines[level] = !isLast;

      tab.children.forEach((child, index) => {
        const isLastChild = index === tab.children.length - 1;
        this.renderTabNode(child, level + 1, isLastChild, newAncestorLines);
      });
    }

    return tabElement;
  }

  /**
   * Creates a tab element with all visual components
   */
  private createTabElement(
    tab: TabNode, 
    level: number, 
    isLast: boolean, 
    ancestorLines: boolean[]
  ): HTMLElement {
    const tabElement = document.createElement('div');
    tabElement.className = this.getTabClasses(tab);
    tabElement.dataset.tabId = tab.id.toString();

    // Add tree lines for hierarchy visualization
    this.addTreeLines(tabElement, level, isLast, ancestorLines);

    // Create tab content container
    const tabContent = this.createTabContent(tab);
    tabElement.appendChild(tabContent);

    // Add event listeners
    this.attachEventListeners(tabElement, tab);

    return tabElement;
  }

  /**
   * Gets CSS classes for tab element based on state
   */
  private getTabClasses(tab: TabNode): string {
    const classes = ['tree-node'];
    
    if (tab.isActive) classes.push('active');
    if (tab.isPinned) classes.push('pinned');
    if (tab.isLoading) classes.push('loading');
    if (this.isRestrictedTab(tab)) classes.push('restricted');

    return classes.join(' ');
  }

  /**
   * Adds tree lines for visual hierarchy representation
   */
  private addTreeLines(
    tabElement: HTMLElement, 
    level: number, 
    isLast: boolean, 
    ancestorLines: boolean[]
  ): void {
    // Add tree lines for each depth level
    for (let i = 0; i < level; i++) {
      const treeLine = document.createElement('div');
      treeLine.className = 'tree-line';
      
      // Show vertical line if ancestor at this level has more siblings
      if (i < ancestorLines.length && ancestorLines[i]) {
        treeLine.classList.add('has-vertical');
      }
      
      tabElement.appendChild(treeLine);
    }

    // Add connection line for current tab (if not root)
    if (level > 0) {
      const connectionLine = document.createElement('div');
      connectionLine.className = 'tree-line has-branch';
      if (isLast) {
        connectionLine.classList.add('last-child');
      }
      tabElement.appendChild(connectionLine);
    }
  }

  /**
   * Creates the main tab content with favicon, title, and indicators
   */
  private createTabContent(tab: TabNode): HTMLElement {
    const tabContent = document.createElement('div');
    tabContent.className = 'tree-content';

    // Favicon
    const favicon = this.createFavicon(tab);
    tabContent.appendChild(favicon);

    // Title
    const title = this.createTitle(tab);
    tabContent.appendChild(title);

    // Visual indicators (pinned, loading, etc.)
    const indicators = this.createIndicators(tab);
    if (indicators.children.length > 0) {
      tabContent.appendChild(indicators);
    }

    // Close button
    if (this.options.showCloseButtons && !this.isRestrictedTab(tab)) {
      const closeButton = this.createCloseButton(tab);
      tabContent.appendChild(closeButton);
    }

    return tabContent;
  }

  /**
   * Creates favicon element with fallback
   */
  private createFavicon(tab: TabNode): HTMLElement {
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favicon || this.getDefaultFavicon();
    favicon.alt = '';
    
    // Handle favicon load errors
    favicon.onerror = () => {
      favicon.src = this.getDefaultFavicon();
    };

    return favicon;
  }

  /**
   * Creates title element with truncation and tooltip
   */
  private createTitle(tab: TabNode): HTMLElement {
    const title = document.createElement('div');
    title.className = 'tab-title';
    
    const displayTitle = tab.title || tab.url || 'Untitled';
    title.textContent = this.truncateTitle(displayTitle);
    title.title = displayTitle; // Tooltip with full title

    return title;
  }

  /**
   * Creates visual indicators container
   */
  private createIndicators(tab: TabNode): HTMLElement {
    const indicators = document.createElement('div');
    indicators.className = 'tab-indicators';

    // Pinned indicator
    if (tab.isPinned) {
      const pinnedIndicator = document.createElement('div');
      pinnedIndicator.className = 'pinned-indicator';
      pinnedIndicator.title = 'Pinned tab';
      indicators.appendChild(pinnedIndicator);
    }

    // Loading indicator
    if (tab.isLoading) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'loading-indicator';
      loadingIndicator.title = 'Loading...';
      indicators.appendChild(loadingIndicator);
    }

    return indicators;
  }

  /**
   * Creates close button for tab
   */
  private createCloseButton(tab: TabNode): HTMLElement {
    const closeButton = document.createElement('button');
    closeButton.className = 'tab-close';
    closeButton.textContent = '×';
    closeButton.title = 'Close tab';
    closeButton.type = 'button';

    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleTabClose(tab.id);
    });

    return closeButton;
  }

  /**
   * Attaches event listeners to tab element
   */
  private attachEventListeners(tabElement: HTMLElement, tab: TabNode): void {
    const tabContent = tabElement.querySelector('.tree-content') as HTMLElement;
    
    // Click to switch tab (disabled for restricted tabs)
    if (!this.isRestrictedTab(tab)) {
      tabContent.addEventListener('click', () => {
        this.handleTabClick(tab.id);
      });
    }

    // Hover effects
    tabContent.addEventListener('mouseenter', () => {
      this.handleTabHover(tab.id, true);
    });

    tabContent.addEventListener('mouseleave', () => {
      this.handleTabHover(tab.id, false);
    });

    // Context menu
    if (this.options.enableContextMenu) {
      tabContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, tab);
      });
    }

    // Drag and drop (if enabled)
    if (this.options.enableDragDrop) {
      this.setupDragDrop(tabElement, tab);
    }
  }

  /**
   * Shows context menu for tab management
   */
  private showContextMenu(event: MouseEvent, tab: TabNode): void {
    this.hideContextMenu();

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    
    const menuItems = this.getContextMenuItems(tab);
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''}`;
      menuItem.textContent = item.label;
      
      if (!item.disabled) {
        menuItem.addEventListener('click', () => {
          item.action();
          this.hideContextMenu();
        });
      }
      
      contextMenu.appendChild(menuItem);
    });

    // Position context menu
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    document.body.appendChild(contextMenu);
    this.contextMenu = contextMenu;

    // Hide context menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 0);
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
  private getContextMenuItems(tab: TabNode): Array<{label: string, action: () => void, disabled: boolean}> {
    const isRestricted = this.isRestrictedTab(tab);
    
    return [
      {
        label: 'Switch to tab',
        action: () => this.handleTabClick(tab.id),
        disabled: isRestricted
      },
      {
        label: 'Close tab',
        action: () => this.handleTabClose(tab.id),
        disabled: isRestricted
      },
      {
        label: 'Close children',
        action: () => this.handleCloseChildren(tab.id),
        disabled: isRestricted || !tab.children || tab.children.length === 0
      },
      {
        label: 'Duplicate tab',
        action: () => this.handleTabDuplicate(tab.id),
        disabled: isRestricted
      }
    ];
  }

  /**
   * Sets up drag and drop functionality
   */
  private setupDragDrop(tabElement: HTMLElement, tab: TabNode): void {
    if (this.isRestrictedTab(tab)) return;

    tabElement.draggable = true;
    
    tabElement.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', tab.id.toString());
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    tabElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    });

    tabElement.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedTabId = parseInt(e.dataTransfer!.getData('text/plain'));
      if (draggedTabId !== tab.id) {
        this.handleTabReorder(draggedTabId, tab.id);
      }
    });
  }

  /**
   * Renders empty state when no tabs are available
   */
  private renderEmptyState(): void {
    const emptyState = document.createElement('div');
    emptyState.className = 'loading-state';
    emptyState.textContent = 'No tabs found';
    this.container.appendChild(emptyState);
  }

  /**
   * Renders loading state
   */
  renderLoadingState(): void {
    this.container.innerHTML = '';
    const loadingState = document.createElement('div');
    loadingState.className = 'loading-state';
    loadingState.innerHTML = '<div class="loading-indicator"></div> Loading tabs...';
    this.container.appendChild(loadingState);
  }

  /**
   * Renders error state
   */
  renderErrorState(message: string): void {
    this.container.innerHTML = '';
    const errorState = document.createElement('div');
    errorState.className = 'error-message';
    errorState.textContent = message;
    this.container.appendChild(errorState);
  }

  /**
   * Updates the visual state of a specific tab
   */
  updateTabState(tabId: number, updates: Partial<TabDisplayData>): void {
    const tabElement = this.container.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    if (!tabElement) return;

    // Update classes based on new state
    if (updates.isActive !== undefined) {
      tabElement.classList.toggle('active', updates.isActive);
    }
    if (updates.isPinned !== undefined) {
      tabElement.classList.toggle('pinned', updates.isPinned);
    }
    if (updates.isLoading !== undefined) {
      tabElement.classList.toggle('loading', updates.isLoading);
    }

    // Update title if changed
    if (updates.title !== undefined) {
      const titleElement = tabElement.querySelector('.tab-title') as HTMLElement;
      if (titleElement) {
        titleElement.textContent = this.truncateTitle(updates.title);
        titleElement.title = updates.title;
      }
    }

    // Update favicon if changed
    if (updates.favicon !== undefined) {
      const faviconElement = tabElement.querySelector('.tab-favicon') as HTMLImageElement;
      if (faviconElement) {
        faviconElement.src = updates.favicon || this.getDefaultFavicon();
      }
    }
  }

  /**
   * Highlights a tab (used for hover effects)
   */
  highlightTab(tabId: number, highlight: boolean = true): void {
    const tabElement = this.container.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    if (tabElement) {
      const tabContent = tabElement.querySelector('.tree-content') as HTMLElement;
      tabContent.classList.toggle('highlight', highlight);
    }
  }

  // Utility methods

  private isRestrictedTab(tab: TabNode): boolean {
    return tab.url.startsWith('chrome://') || 
           tab.url.startsWith('chrome-extension://') ||
           tab.url.startsWith('edge://') ||
           tab.url.startsWith('about:');
  }

  private getDefaultFavicon(): string {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
  }

  private truncateTitle(title: string): string {
    const maxLength = this.options.maxTitleLength || 50;
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  }

  // Event handlers (to be implemented by consumers)

  private handleTabClick(tabId: number): void {
    // Dispatch custom event for tab switching
    this.container.dispatchEvent(new CustomEvent('tabClick', { 
      detail: { tabId },
      bubbles: true 
    }));
  }

  private handleTabClose(tabId: number): void {
    // Dispatch custom event for tab closing
    this.container.dispatchEvent(new CustomEvent('tabClose', { 
      detail: { tabId },
      bubbles: true 
    }));
  }

  private handleTabHover(tabId: number, isHovering: boolean): void {
    // Dispatch custom event for tab hovering
    this.container.dispatchEvent(new CustomEvent('tabHover', { 
      detail: { tabId, isHovering },
      bubbles: true 
    }));
  }

  private handleCloseChildren(tabId: number): void {
    // Dispatch custom event for closing child tabs
    this.container.dispatchEvent(new CustomEvent('closeChildren', { 
      detail: { tabId },
      bubbles: true 
    }));
  }

  private handleTabDuplicate(tabId: number): void {
    // Dispatch custom event for tab duplication
    this.container.dispatchEvent(new CustomEvent('tabDuplicate', { 
      detail: { tabId },
      bubbles: true 
    }));
  }

  private handleTabReorder(draggedTabId: number, targetTabId: number): void {
    // Dispatch custom event for tab reordering
    this.container.dispatchEvent(new CustomEvent('tabReorder', { 
      detail: { draggedTabId, targetTabId },
      bubbles: true 
    }));
  }
}