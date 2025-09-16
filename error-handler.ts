/**
 * Error Handler - Manages restricted tabs and error states
 * Provides graceful handling of permission errors and restricted content
 */

import { TabNode } from './types';

export interface ErrorState {
  type: 'permission' | 'network' | 'restricted' | 'storage' | 'unknown';
  message: string;
  tabId?: number;
  recoverable: boolean;
  retryAction?: () => void;
}

export interface RestrictedTabInfo {
  tabId: number;
  url: string;
  reason: 'chrome-internal' | 'extension-page' | 'system-page' | 'permission-denied';
  displayMessage: string;
  tooltip: string;
}

export class ErrorHandler {
  private errorContainer: HTMLElement | null = null;
  private errorStates: Map<number, ErrorState> = new Map();

  /**
   * Checks if a tab is restricted and returns restriction info
   */
  static getRestrictedTabInfo(tab: TabNode): RestrictedTabInfo | null {
    const url = tab.url.toLowerCase();

    if (url.startsWith('chrome://')) {
      return {
        tabId: tab.id,
        url: tab.url,
        reason: 'chrome-internal',
        displayMessage: 'Chrome internal page',
        tooltip: 'This is a Chrome internal page that cannot be managed by extensions'
      };
    }

    if (url.startsWith('chrome-extension://')) {
      return {
        tabId: tab.id,
        url: tab.url,
        reason: 'extension-page',
        displayMessage: 'Extension page',
        tooltip: 'This is an extension page with limited access'
      };
    }

    if (url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
      return {
        tabId: tab.id,
        url: tab.url,
        reason: 'system-page',
        displayMessage: 'System page',
        tooltip: 'This is a browser system page that cannot be managed'
      };
    }

    if (url.startsWith('file://') && !tab.url.includes('localhost')) {
      return {
        tabId: tab.id,
        url: tab.url,
        reason: 'permission-denied',
        displayMessage: 'Local file',
        tooltip: 'Local files may have restricted access depending on extension permissions'
      };
    }

    return null;
  }

  /**
   * Applies restricted styling and behavior to a tab element
   */
  static applyRestrictedStyling(tabElement: HTMLElement, restrictedInfo: RestrictedTabInfo): void {
    // Add restricted class
    tabElement.classList.add('restricted');

    // Update tab content
    const tabContent = tabElement.querySelector('.tree-content') as HTMLElement;
    if (tabContent) {
      tabContent.style.cursor = 'default';
      tabContent.title = restrictedInfo.tooltip;
      
      // Disable click events
      tabContent.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // Update title with restriction indicator
    const titleElement = tabElement.querySelector('.tab-title') as HTMLElement;
    if (titleElement) {
      titleElement.style.fontStyle = 'italic';
      titleElement.style.color = '#6b7280';
      
      // Add restriction indicator
      const indicator = document.createElement('span');
      indicator.className = 'restriction-indicator';
      indicator.textContent = ' 🔒';
      indicator.title = restrictedInfo.tooltip;
      titleElement.appendChild(indicator);
    }

    // Disable close button for restricted tabs
    const closeButton = tabElement.querySelector('.tab-close') as HTMLElement;
    if (closeButton) {
      closeButton.style.display = 'none';
    }

    // Add visual indicator for restriction reason
    const indicators = tabElement.querySelector('.tab-indicators') as HTMLElement;
    if (indicators) {
      const restrictionIcon = document.createElement('div');
      restrictionIcon.className = 'restriction-icon';
      restrictionIcon.title = restrictedInfo.tooltip;
      
      // Different icons for different restriction types
      switch (restrictedInfo.reason) {
        case 'chrome-internal':
          restrictionIcon.innerHTML = '⚙️';
          break;
        case 'extension-page':
          restrictionIcon.innerHTML = '🧩';
          break;
        case 'system-page':
          restrictionIcon.innerHTML = '🖥️';
          break;
        case 'permission-denied':
          restrictionIcon.innerHTML = '🔒';
          break;
      }
      
      indicators.appendChild(restrictionIcon);
    }
  }

  /**
   * Creates an error state for display
   */
  createErrorState(
    type: ErrorState['type'],
    message: string,
    tabId?: number,
    retryAction?: () => void
  ): ErrorState {
    const errorState: ErrorState = {
      type,
      message,
      tabId,
      recoverable: !!retryAction,
      retryAction
    };

    if (tabId) {
      this.errorStates.set(tabId, errorState);
    }

    return errorState;
  }

  /**
   * Renders an error message in the UI
   */
  renderError(errorState: ErrorState, container: HTMLElement): HTMLElement {
    const errorElement = document.createElement('div');
    errorElement.className = `error-message error-${errorState.type}`;

    // Error icon
    const icon = document.createElement('span');
    icon.className = 'error-icon';
    icon.innerHTML = this.getErrorIcon(errorState.type);
    errorElement.appendChild(icon);

    // Error message
    const messageElement = document.createElement('span');
    messageElement.className = 'error-text';
    messageElement.textContent = errorState.message;
    errorElement.appendChild(messageElement);

    // Retry button if recoverable
    if (errorState.recoverable && errorState.retryAction) {
      const retryButton = document.createElement('button');
      retryButton.className = 'error-retry-button';
      retryButton.textContent = 'Retry';
      retryButton.addEventListener('click', () => {
        errorState.retryAction!();
        this.clearError(errorState.tabId);
      });
      errorElement.appendChild(retryButton);
    }

    // Dismiss button
    const dismissButton = document.createElement('button');
    dismissButton.className = 'error-dismiss-button';
    dismissButton.innerHTML = '×';
    dismissButton.title = 'Dismiss';
    dismissButton.addEventListener('click', () => {
      this.clearError(errorState.tabId);
      errorElement.remove();
    });
    errorElement.appendChild(dismissButton);

    container.appendChild(errorElement);
    return errorElement;
  }

  /**
   * Renders a loading state with error handling
   */
  renderLoadingWithErrorHandling(container: HTMLElement, timeout: number = 5000): void {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-state';
    loadingElement.innerHTML = `
      <div class="loading-indicator"></div>
      <span>Loading tabs...</span>
    `;

    container.appendChild(loadingElement);

    // Set timeout for loading error
    setTimeout(() => {
      if (container.contains(loadingElement)) {
        loadingElement.remove();
        
        const errorState = this.createErrorState(
          'network',
          'Failed to load tabs. Please check your connection and try again.',
          undefined,
          () => window.location.reload()
        );
        
        this.renderError(errorState, container);
      }
    }, timeout);
  }

  /**
   * Handles Chrome extension API errors
   */
  handleChromeAPIError(error: any, operation: string): ErrorState {
    let errorType: ErrorState['type'] = 'unknown';
    let message = `Failed to ${operation}`;

    if (error.message) {
      if (error.message.includes('permission')) {
        errorType = 'permission';
        message = `Permission denied: Cannot ${operation}. Please check extension permissions.`;
      } else if (error.message.includes('network')) {
        errorType = 'network';
        message = `Network error: Failed to ${operation}. Please check your connection.`;
      } else if (error.message.includes('storage')) {
        errorType = 'storage';
        message = `Storage error: Failed to ${operation}. Storage may be full.`;
      }
    }

    return this.createErrorState(errorType, message);
  }

  /**
   * Handles tab access errors gracefully
   */
  handleTabAccessError(tabId: number, error: any): void {
    const errorState = this.createErrorState(
      'permission',
      `Cannot access tab ${tabId}: ${error.message || 'Permission denied'}`,
      tabId
    );

    // Mark tab as restricted in UI
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    if (tabElement) {
      tabElement.classList.add('restricted', 'error');
      
      const tabContent = tabElement.querySelector('.tree-content') as HTMLElement;
      if (tabContent) {
        tabContent.title = errorState.message;
        tabContent.style.cursor = 'not-allowed';
      }
    }
  }

  /**
   * Provides user-friendly error messages
   */
  getUserFriendlyMessage(error: any, context: string): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      // Common Chrome extension errors
      if (error.message.includes('Cannot access')) {
        return 'This tab cannot be accessed due to browser security restrictions.';
      }
      
      if (error.message.includes('Extension context invalidated')) {
        return 'Extension needs to be reloaded. Please refresh the page.';
      }
      
      if (error.message.includes('Tabs cannot be edited')) {
        return 'This tab cannot be modified due to browser restrictions.';
      }
      
      if (error.message.includes('No tab with id')) {
        return 'Tab no longer exists or has been closed.';
      }
    }

    return `An error occurred while ${context}. Please try again.`;
  }

  /**
   * Creates a tooltip for restricted tabs
   */
  createRestrictedTooltip(restrictedInfo: RestrictedTabInfo): string {
    const baseMessage = restrictedInfo.tooltip;
    const suggestions = this.getRestrictedTabSuggestions(restrictedInfo.reason);
    
    return suggestions.length > 0 
      ? `${baseMessage}\n\nSuggestions:\n${suggestions.join('\n')}`
      : baseMessage;
  }

  /**
   * Gets suggestions for handling restricted tabs
   */
  private getRestrictedTabSuggestions(reason: RestrictedTabInfo['reason']): string[] {
    switch (reason) {
      case 'chrome-internal':
        return [
          '• These pages are managed by Chrome directly',
          '• Use Chrome\'s built-in settings instead'
        ];
        
      case 'extension-page':
        return [
          '• Extension pages have limited access',
          '• Manage extensions through Chrome settings'
        ];
        
      case 'system-page':
        return [
          '• System pages cannot be modified',
          '• Use browser settings for configuration'
        ];
        
      case 'permission-denied':
        return [
          '• Check extension permissions in Chrome settings',
          '• Some local files may require special permissions'
        ];
        
      default:
        return [];
    }
  }

  /**
   * Gets appropriate icon for error type
   */
  private getErrorIcon(type: ErrorState['type']): string {
    switch (type) {
      case 'permission':
        return '🔒';
      case 'network':
        return '🌐';
      case 'restricted':
        return '⚠️';
      case 'storage':
        return '💾';
      default:
        return '❌';
    }
  }

  /**
   * Clears error state
   */
  clearError(tabId?: number): void {
    if (tabId) {
      this.errorStates.delete(tabId);
    }
  }

  /**
   * Gets all current error states
   */
  getErrorStates(): Map<number, ErrorState> {
    return new Map(this.errorStates);
  }

  /**
   * Checks if a tab has an error state
   */
  hasError(tabId: number): boolean {
    return this.errorStates.has(tabId);
  }

  /**
   * Gets error state for a specific tab
   */
  getError(tabId: number): ErrorState | undefined {
    return this.errorStates.get(tabId);
  }

  /**
   * Clears all error states
   */
  clearAllErrors(): void {
    this.errorStates.clear();
  }
}