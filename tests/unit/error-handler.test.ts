/**
 * Unit tests for Error Handler
 */

import { ErrorHandler, ErrorState, RestrictedTabInfo } from './error-handler';
import { TabNode } from './types';

// Mock DOM environment
const mockElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  },
  style: {},
  querySelector: jest.fn(),
  appendChild: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(() => true),
  title: '',
  textContent: '',
  innerHTML: '',
  addEventListener: jest.fn()
};

const mockDocument = {
  createElement: jest.fn(() => mockElement),
  querySelector: jest.fn(() => mockElement)
};

global.document = mockDocument as any;
global.window = {
  location: {
    reload: jest.fn()
  }
} as any;

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    jest.clearAllMocks();
  });

  describe('getRestrictedTabInfo', () => {
    it('should identify Chrome internal pages', () => {
      const tab: TabNode = {
        id: 1,
        title: 'Chrome Settings',
        url: 'chrome://settings/',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const result = ErrorHandler.getRestrictedTabInfo(tab);

      expect(result).toEqual({
        tabId: 1,
        url: 'chrome://settings/',
        reason: 'chrome-internal',
        displayMessage: 'Chrome internal page',
        tooltip: 'This is a Chrome internal page that cannot be managed by extensions'
      });
    });

    it('should identify extension pages', () => {
      const tab: TabNode = {
        id: 2,
        title: 'Extension Page',
        url: 'chrome-extension://abc123/popup.html',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const result = ErrorHandler.getRestrictedTabInfo(tab);

      expect(result?.reason).toBe('extension-page');
      expect(result?.displayMessage).toBe('Extension page');
    });

    it('should identify system pages', () => {
      const tab: TabNode = {
        id: 3,
        title: 'About Page',
        url: 'about:blank',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const result = ErrorHandler.getRestrictedTabInfo(tab);

      expect(result?.reason).toBe('system-page');
    });

    it('should identify local files with permission issues', () => {
      const tab: TabNode = {
        id: 4,
        title: 'Local File',
        url: 'file:///Users/test/document.html',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const result = ErrorHandler.getRestrictedTabInfo(tab);

      expect(result?.reason).toBe('permission-denied');
    });

    it('should return null for regular web pages', () => {
      const tab: TabNode = {
        id: 5,
        title: 'Regular Page',
        url: 'https://example.com',
        favicon: '',
        parentId: null,
        children: [],
        level: 0,
        isActive: false,
        isPinned: false,
        isLoading: false
      };

      const result = ErrorHandler.getRestrictedTabInfo(tab);

      expect(result).toBeNull();
    });
  });

  describe('applyRestrictedStyling', () => {
    let mockTabElement: any;
    let restrictedInfo: RestrictedTabInfo;

    beforeEach(() => {
      mockTabElement = {
        classList: {
          add: jest.fn()
        },
        querySelector: jest.fn(() => ({
          style: {},
          title: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn()
        }))
      };

      restrictedInfo = {
        tabId: 1,
        url: 'chrome://settings/',
        reason: 'chrome-internal',
        displayMessage: 'Chrome internal page',
        tooltip: 'This is a Chrome internal page'
      };
    });

    it('should add restricted class to tab element', () => {
      ErrorHandler.applyRestrictedStyling(mockTabElement, restrictedInfo);

      expect(mockTabElement.classList.add).toHaveBeenCalledWith('restricted');
    });

    it('should update tab content styling', () => {
      const mockTabContent = {
        style: {},
        title: '',
        addEventListener: jest.fn()
      };
      mockTabElement.querySelector.mockReturnValue(mockTabContent);

      ErrorHandler.applyRestrictedStyling(mockTabElement, restrictedInfo);

      expect(mockTabContent.style.cursor).toBe('default');
      expect(mockTabContent.title).toBe(restrictedInfo.tooltip);
    });

    it('should add restriction indicator to title', () => {
      const mockTitleElement = {
        style: {},
        appendChild: jest.fn()
      };
      mockTabElement.querySelector.mockImplementation((selector) => {
        if (selector === '.tab-title') return mockTitleElement;
        return { style: {}, addEventListener: jest.fn() };
      });

      ErrorHandler.applyRestrictedStyling(mockTabElement, restrictedInfo);

      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
      expect(mockTitleElement.appendChild).toHaveBeenCalled();
    });

    it('should hide close button for restricted tabs', () => {
      const mockCloseButton = { style: {} };
      mockTabElement.querySelector.mockImplementation((selector) => {
        if (selector === '.tab-close') return mockCloseButton;
        return { style: {}, addEventListener: jest.fn() };
      });

      ErrorHandler.applyRestrictedStyling(mockTabElement, restrictedInfo);

      expect(mockCloseButton.style.display).toBe('none');
    });
  });

  describe('createErrorState', () => {
    it('should create error state with all properties', () => {
      const retryAction = jest.fn();
      const errorState = errorHandler.createErrorState(
        'permission',
        'Access denied',
        123,
        retryAction
      );

      expect(errorState).toEqual({
        type: 'permission',
        message: 'Access denied',
        tabId: 123,
        recoverable: true,
        retryAction
      });
    });

    it('should create non-recoverable error state without retry action', () => {
      const errorState = errorHandler.createErrorState(
        'network',
        'Connection failed'
      );

      expect(errorState.recoverable).toBe(false);
      expect(errorState.retryAction).toBeUndefined();
    });
  });

  describe('renderError', () => {
    let mockContainer: any;
    let errorState: ErrorState;

    beforeEach(() => {
      mockContainer = {
        appendChild: jest.fn()
      };

      errorState = {
        type: 'permission',
        message: 'Access denied',
        recoverable: false
      };
    });

    it('should render error message with icon and text', () => {
      errorHandler.renderError(errorState, mockContainer);

      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should render retry button for recoverable errors', () => {
      const retryAction = jest.fn();
      const recoverableError = {
        ...errorState,
        recoverable: true,
        retryAction
      };

      errorHandler.renderError(recoverableError, mockContainer);

      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
    });

    it('should render dismiss button', () => {
      errorHandler.renderError(errorState, mockContainer);

      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
    });
  });

  describe('handleChromeAPIError', () => {
    it('should identify permission errors', () => {
      const error = { message: 'permission denied' };
      const errorState = errorHandler.handleChromeAPIError(error, 'access tab');

      expect(errorState.type).toBe('permission');
      expect(errorState.message).toContain('Permission denied');
    });

    it('should identify network errors', () => {
      const error = { message: 'network timeout' };
      const errorState = errorHandler.handleChromeAPIError(error, 'load data');

      expect(errorState.type).toBe('network');
      expect(errorState.message).toContain('Network error');
    });

    it('should identify storage errors', () => {
      const error = { message: 'storage quota exceeded' };
      const errorState = errorHandler.handleChromeAPIError(error, 'save data');

      expect(errorState.type).toBe('storage');
      expect(errorState.message).toContain('Storage error');
    });

    it('should default to unknown error type', () => {
      const error = { message: 'something went wrong' };
      const errorState = errorHandler.handleChromeAPIError(error, 'do something');

      expect(errorState.type).toBe('unknown');
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return string errors as-is', () => {
      const result = errorHandler.getUserFriendlyMessage('Simple error', 'testing');
      expect(result).toBe('Simple error');
    });

    it('should handle "Cannot access" errors', () => {
      const error = { message: 'Cannot access chrome://settings' };
      const result = errorHandler.getUserFriendlyMessage(error, 'accessing tab');

      expect(result).toBe('This tab cannot be accessed due to browser security restrictions.');
    });

    it('should handle extension context errors', () => {
      const error = { message: 'Extension context invalidated' };
      const result = errorHandler.getUserFriendlyMessage(error, 'updating tab');

      expect(result).toBe('Extension needs to be reloaded. Please refresh the page.');
    });

    it('should handle tab editing errors', () => {
      const error = { message: 'Tabs cannot be edited' };
      const result = errorHandler.getUserFriendlyMessage(error, 'modifying tab');

      expect(result).toBe('This tab cannot be modified due to browser restrictions.');
    });

    it('should handle missing tab errors', () => {
      const error = { message: 'No tab with id: 123' };
      const result = errorHandler.getUserFriendlyMessage(error, 'finding tab');

      expect(result).toBe('Tab no longer exists or has been closed.');
    });

    it('should provide generic message for unknown errors', () => {
      const error = { message: 'Unknown error occurred' };
      const result = errorHandler.getUserFriendlyMessage(error, 'processing');

      expect(result).toBe('An error occurred while processing. Please try again.');
    });
  });

  describe('error state management', () => {
    it('should store and retrieve error states', () => {
      const errorState = errorHandler.createErrorState('network', 'Connection failed', 123);

      expect(errorHandler.hasError(123)).toBe(true);
      expect(errorHandler.getError(123)).toBe(errorState);
    });

    it('should clear specific error states', () => {
      errorHandler.createErrorState('permission', 'Access denied', 123);
      errorHandler.clearError(123);

      expect(errorHandler.hasError(123)).toBe(false);
    });

    it('should clear all error states', () => {
      errorHandler.createErrorState('network', 'Error 1', 1);
      errorHandler.createErrorState('permission', 'Error 2', 2);

      errorHandler.clearAllErrors();

      expect(errorHandler.hasError(1)).toBe(false);
      expect(errorHandler.hasError(2)).toBe(false);
    });

    it('should return all error states', () => {
      errorHandler.createErrorState('network', 'Error 1', 1);
      errorHandler.createErrorState('permission', 'Error 2', 2);

      const allErrors = errorHandler.getErrorStates();

      expect(allErrors.size).toBe(2);
      expect(allErrors.has(1)).toBe(true);
      expect(allErrors.has(2)).toBe(true);
    });
  });

  describe('createRestrictedTooltip', () => {
    it('should create tooltip with suggestions for chrome-internal pages', () => {
      const restrictedInfo: RestrictedTabInfo = {
        tabId: 1,
        url: 'chrome://settings/',
        reason: 'chrome-internal',
        displayMessage: 'Chrome internal page',
        tooltip: 'This is a Chrome internal page'
      };

      const tooltip = errorHandler.createRestrictedTooltip(restrictedInfo);

      expect(tooltip).toContain('This is a Chrome internal page');
      expect(tooltip).toContain('Suggestions:');
      expect(tooltip).toContain('These pages are managed by Chrome directly');
    });

    it('should create tooltip without suggestions for unknown reasons', () => {
      const restrictedInfo: RestrictedTabInfo = {
        tabId: 1,
        url: 'unknown://page',
        reason: 'chrome-internal', // Will be treated as unknown in private method
        displayMessage: 'Unknown page',
        tooltip: 'This is an unknown page'
      };

      const tooltip = errorHandler.createRestrictedTooltip(restrictedInfo);

      expect(tooltip).toBe('This is an unknown page');
    });
  });
});