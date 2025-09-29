import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { HierarchyState, SidepanelContextType, ChromeMessage } from '../types/react-types';

// Context state shape
interface SidepanelState {
  hierarchyState: HierarchyState | null;
  currentWindowId: number | null;
  isLoading: boolean;
  error: string | null;
  contextMenu: {
    isVisible: boolean;
    position: { x: number; y: number };
    selectedTab: any | null;
  };
}

// Action types for reducer
type SidepanelAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HIERARCHY_STATE'; payload: HierarchyState }
  | { type: 'SET_WINDOW_ID'; payload: number }
  | { type: 'SHOW_CONTEXT_MENU'; payload: { position: { x: number; y: number }; selectedTab: any } }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: SidepanelState = {
  hierarchyState: null,
  currentWindowId: null,
  isLoading: true,
  error: null,
  contextMenu: {
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedTab: null,
  },
};

// Reducer function
function sidepanelReducer(state: SidepanelState, action: SidepanelAction): SidepanelState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_HIERARCHY_STATE':
      return { 
        ...state, 
        hierarchyState: action.payload, 
        isLoading: false, 
        error: null 
      };
    case 'SET_WINDOW_ID':
      return { ...state, currentWindowId: action.payload };
    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          isVisible: true,
          position: action.payload.position,
          selectedTab: action.payload.selectedTab,
        },
      };
    case 'HIDE_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          ...state.contextMenu,
          isVisible: false,
          selectedTab: null,
        },
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Create context
const SidepanelContext = createContext<SidepanelContextType | undefined>(undefined);

// Context provider component
interface SidepanelProviderProps {
  children: ReactNode;
}

export function SidepanelProvider({ children }: SidepanelProviderProps) {
  const [state, dispatch] = useReducer(sidepanelReducer, initialState);

  // Context value with actions
  const contextValue: SidepanelContextType = {
    hierarchyState: state.hierarchyState,
    currentWindowId: state.currentWindowId,
    isLoading: state.isLoading,
    error: state.error,
    updateHierarchy: (hierarchyState: HierarchyState) => {
      dispatch({ type: 'SET_HIERARCHY_STATE', payload: hierarchyState });
    },
    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },
    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
  };

  // Initialize window ID and hierarchy state
  useEffect(() => {
    async function initializeSidepanel() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // Get current window ID
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const windowId = currentTab?.windowId;

        if (!windowId) {
          throw new Error('Could not determine current window ID');
        }

        dispatch({ type: 'SET_WINDOW_ID', payload: windowId });
        console.log('🚀 React sidepanel initializing for window:', windowId);

        // Notify background script that side panel is opened
        try {
          await chrome.runtime.sendMessage({
            type: 'SIDE_PANEL_OPENED',
            windowId: windowId
          });
          console.log('📱 Notified background: side panel opened');
        } catch (notifyError) {
          console.warn('⚠️ Failed to notify side panel opened:', notifyError);
        }

        // Get hierarchy state from background script
        let response = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && (!response || !response.success)) {
          attempts++;
          console.log(`🔍 Requesting hierarchy state for window ${windowId} (attempt ${attempts}/${maxAttempts})`);

          try {
            response = await chrome.runtime.sendMessage({
              type: 'GET_HIERARCHY_STATE',
              windowId: windowId
            });

            console.log('📥 Background response:', response);

            if (response && response.success) {
              break;
            } else if (attempts < maxAttempts) {
              console.log('⏳ Retrying in 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error(`❌ Attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              console.log('⏳ Retrying in 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        if (response && response.success) {
          dispatch({ type: 'SET_HIERARCHY_STATE', payload: response.hierarchyState });
          console.log('✅ Received hierarchy state with', response.hierarchyState?.tabCount || 0, 'tabs');
        } else {
          throw new Error(response?.error || 'Failed to get hierarchy state from background script');
        }

      } catch (error) {
        console.error('❌ Init error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    }

    initializeSidepanel();
  }, []);

  // Set up Chrome runtime message listeners with debouncing
  useEffect(() => {
    // Debounced refresh function to prevent excessive API calls
    const debouncedRefreshHierarchy = debounce(async () => {
      if (!state.currentWindowId) return;

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_HIERARCHY_STATE',
          windowId: state.currentWindowId
        });

        if (response && response.success) {
          dispatch({ type: 'SET_HIERARCHY_STATE', payload: response.hierarchyState });
        }
      } catch (error) {
        console.error('Error refreshing hierarchy:', error);
      }
    }, 150); // 150ms debounce for React updates

    function handleMessage(message: ChromeMessage) {
      if (message.windowId && message.windowId !== state.currentWindowId) {
        return;
      }

      console.log('📨 React sidepanel received message:', message.type);

      switch (message.type) {
        case 'HIERARCHY_UPDATED':
          // Direct updates from background (already debounced there)
          if (message.hierarchyState) {
            dispatch({ type: 'SET_HIERARCHY_STATE', payload: message.hierarchyState });
          }
          break;
        case 'TAB_ACTIVATED':
        case 'TAB_UPDATED':
        case 'TAB_ADDED':
        case 'TAB_REMOVED':
          // Debounced refresh for individual tab events
          debouncedRefreshHierarchy();
          break;
      }
    }

    // Helper debounce function (inline for now)
    function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
      let timeoutId: NodeJS.Timeout | null = null;
      return ((...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      }) as T;
    }

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [state.currentWindowId]);

  // Handle window focus changes
  useEffect(() => {
    async function handleWindowFocus() {
      if (!state.currentWindowId) return;

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_HIERARCHY_STATE',
          windowId: state.currentWindowId
        });

        if (response && response.success) {
          dispatch({ type: 'SET_HIERARCHY_STATE', payload: response.hierarchyState });
        }
      } catch (error) {
        console.error('Error refreshing on focus:', error);
      }
    }

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [state.currentWindowId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.currentWindowId) {
        try {
          chrome.runtime.sendMessage({
            type: 'SIDE_PANEL_CLOSED',
            windowId: state.currentWindowId
          });
          console.log('📱 Notified background: side panel closed');
        } catch (error) {
          console.warn('⚠️ Failed to notify side panel closed:', error);
        }
      }
    };
  }, [state.currentWindowId]);

  return (
    <SidepanelContext.Provider value={contextValue}>
      {children}
    </SidepanelContext.Provider>
  );
}

// Custom hook to use the sidepanel context
export function useSidepanelContext(): SidepanelContextType {
  const context = useContext(SidepanelContext);
  if (context === undefined) {
    throw new Error('useSidepanelContext must be used within a SidepanelProvider');
  }
  return context;
}