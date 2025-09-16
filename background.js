console.log('🚀 Tab Hierarchy Visualizer background service worker starting...');

// Import types and constants (note: in service worker context, we'll define these inline)
const ERROR_MESSAGES = {
  TAB_ACCESS_DENIED: 'Cannot access this tab due to browser restrictions',
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please delete some Cabinets.',
  CABINET_NOT_FOUND: 'Cabinet not found',
  INVALID_CABINET_DATA: 'Invalid Cabinet data format',
  RESTORATION_FAILED: 'Failed to restore some tabs from Cabinet',
  PERMISSION_DENIED: 'Extension permissions required for this operation'
};

const CONFIG = {
  UPDATE_DEBOUNCE_DELAY: 100,
  MAX_HIERARCHY_DEPTH: 10,
  MAX_TABS: 500
};

const STORAGE_KEYS = {
  HIERARCHY_STATE: 'tab_hierarchy_state',
  WINDOW_HIERARCHIES: 'window_hierarchies'
};

// Track hierarchy state per window using a more structured approach
const windowHierarchies = new Map(); // windowId -> HierarchyState

// Persistence utilities
async function saveHierarchyState() {
  try {
    // Convert Map to plain object for storage
    const hierarchyData = {};
    windowHierarchies.forEach((state, windowId) => {
      // Convert TabNode objects to serializable format
      const serializableState = {
        rootTabs: state.rootTabs.map(tab => serializeTabNode(tab)),
        activeTabId: state.activeTabId,
        windowId: state.windowId,
        timestamp: Date.now()
      };
      hierarchyData[windowId] = serializableState;
    });

    await chrome.storage.local.set({
      [STORAGE_KEYS.WINDOW_HIERARCHIES]: hierarchyData
    });
    
    console.log('💾 Saved hierarchy state for', Object.keys(hierarchyData).length, 'windows');
  } catch (error) {
    console.error('❌ Failed to save hierarchy state:', error);
  }
}

async function loadHierarchyState() {
  // Simplified - no persistence loading for now to avoid startup issues
  console.log('📂 Skipping persistence loading for now');
  return false;
}

function serializeTabNode(tab) {
  return {
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favicon: tab.favicon,
    parentId: tab.parentId,
    children: tab.children.map(child => serializeTabNode(child)),
    level: tab.level,
    isActive: tab.isActive,
    isPinned: tab.isPinned,
    isLoading: tab.isLoading
  };
}

function deserializeTabNode(data) {
  return {
    id: data.id,
    title: data.title,
    url: data.url,
    favicon: data.favicon,
    parentId: data.parentId,
    children: data.children.map(child => deserializeTabNode(child)),
    level: data.level,
    isActive: data.isActive,
    isPinned: data.isPinned,
    isLoading: data.isLoading
  };
}

// Debounce utility for batching updates
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Initialize existing tabs and build hierarchy
async function initializeExistingTabs() {
  try {
    console.log('🔍 Initializing existing tabs and building hierarchies...');
    
    // Get current tabs from Chrome
    const tabs = await chrome.tabs.query({});
    console.log('📋 Found', tabs.length, 'total tabs');
    
    // Group tabs by window
    const tabsByWindow = new Map();
    tabs.forEach(tab => {
      if (!tabsByWindow.has(tab.windowId)) {
        tabsByWindow.set(tab.windowId, []);
      }
      tabsByWindow.get(tab.windowId).push(tab);
    });

    // Build fresh hierarchy for each window
    windowHierarchies.clear();
    for (const [windowId, windowTabs] of tabsByWindow) {
      const hierarchyState = buildHierarchyFromTabs(windowTabs, windowId);
      windowHierarchies.set(windowId, hierarchyState);
      console.log(`✅ Built hierarchy for window ${windowId} with ${windowTabs.length} tabs`);
    }
    
    console.log(`📊 Initialized ${windowHierarchies.size} window hierarchies`);
  } catch (error) {
    console.error('❌ Failed to initialize tabs:', error);
    // Continue with empty state rather than failing completely
    windowHierarchies.clear();
  }
}

// Simplified - no persistence merging for now

// Build hierarchy state from Chrome tabs
function buildHierarchyFromTabs(tabs, windowId) {
  const tabMap = new Map();
  const rootTabs = [];
  let activeTabId = null;

  // First pass: create TabNode objects
  tabs.forEach(tab => {
    if (!tab.id) return;

    const tabNode = {
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl || '',
      parentId: null,
      children: [],
      level: 0,
      isActive: tab.active || false,
      isPinned: tab.pinned || false,
      isLoading: tab.status === 'loading'
    };

    tabMap.set(tab.id, tabNode);
    
    if (tab.active) {
      activeTabId = tab.id;
    }
  });

  // Second pass: establish parent-child relationships
  tabs.forEach(tab => {
    if (!tab.id || !tabMap.has(tab.id)) return;

    const tabNode = tabMap.get(tab.id);
    
    if (tab.openerTabId && tabMap.has(tab.openerTabId)) {
      const parent = tabMap.get(tab.openerTabId);
      tabNode.parentId = tab.openerTabId;
      tabNode.level = Math.min(parent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
      parent.children.push(tabNode);
    } else {
      rootTabs.push(tabNode);
    }
  });

  return {
    rootTabs,
    tabMap,
    activeTabId,
    windowId
  };
}

// Debounced update function to prevent excessive notifications
const debouncedNotifyHierarchyUpdate = debounce((windowId, hierarchyState) => {
  notifyHierarchyUpdate(windowId, hierarchyState);
}, CONFIG.UPDATE_DEBOUNCE_DELAY);

// Debounced save function to prevent excessive storage writes
const debouncedSaveHierarchyState = debounce(() => {
  saveHierarchyState();
}, CONFIG.UPDATE_DEBOUNCE_DELAY * 2); // Save less frequently than notifications

// Initialize on startup and installation
console.log('🎯 Setting up Chrome extension event listeners...');

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Chrome startup detected - reinitializing tabs');
  setTimeout(initializeExistingTabs, 100); // Small delay to ensure Chrome is ready
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  setTimeout(initializeExistingTabs, 100); // Small delay to ensure Chrome is ready
});

// Tab creation event listener
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    console.log('➕ Tab created:', tab.id, 'in window:', tab.windowId, 'opener:', tab.openerTabId);
    
    if (!tab.id) {
      console.warn('⚠️ Tab created without ID, skipping');
      return;
    }

    // Handle restricted tabs gracefully
    if (isRestrictedTab(tab)) {
      console.log('🚫 Restricted tab detected:', tab.url);
    }

    // Get or create hierarchy state for this window
    let hierarchyState = windowHierarchies.get(tab.windowId);
    if (!hierarchyState) {
      console.log('🆕 Creating new hierarchy state for window:', tab.windowId);
      hierarchyState = {
        rootTabs: [],
        tabMap: new Map(),
        activeTabId: null,
        windowId: tab.windowId
      };
      windowHierarchies.set(tab.windowId, hierarchyState);
    }

    // Create TabNode
    const tabNode = {
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl || '',
      parentId: null,
      children: [],
      level: 0,
      isActive: tab.active || false,
      isPinned: tab.pinned || false,
      isLoading: tab.status === 'loading'
    };

    // Establish parent-child relationship
    if (tab.openerTabId && hierarchyState.tabMap.has(tab.openerTabId)) {
      const parent = hierarchyState.tabMap.get(tab.openerTabId);
      tabNode.parentId = tab.openerTabId;
      tabNode.level = Math.min(parent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
      parent.children.push(tabNode);
      console.log('🔗 Linked tab', tab.id, 'to parent', tab.openerTabId, 'at level', tabNode.level);
    } else {
      hierarchyState.rootTabs.push(tabNode);
      console.log('🌱 Added root tab:', tab.id);
    }

    // Add to tab map
    hierarchyState.tabMap.set(tab.id, tabNode);

    // Update active tab if this is the active tab
    if (tab.active) {
      hierarchyState.activeTabId = tab.id;
    }

    // Notify UI components and save state
    debouncedNotifyHierarchyUpdate(tab.windowId, hierarchyState);
    debouncedSaveHierarchyState();

  } catch (error) {
    console.error('❌ Error handling tab creation:', error);
    handleTabEventError(error, 'TAB_CREATED', tab);
  }
});

// Tab removal event listener
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    console.log('➖ Tab removed:', tabId, 'from window:', removeInfo.windowId);
    
    const hierarchyState = windowHierarchies.get(removeInfo.windowId);
    if (!hierarchyState) {
      console.log('⚠️ No hierarchy state found for window:', removeInfo.windowId);
      return;
    }

    const tabNode = hierarchyState.tabMap.get(tabId);
    if (!tabNode) {
      console.log('⚠️ Tab not found in hierarchy:', tabId);
      return;
    }

    console.log('🧹 Removing tab from hierarchy:', tabId);

    // Remove from parent's children array
    if (tabNode.parentId) {
      const parent = hierarchyState.tabMap.get(tabNode.parentId);
      if (parent) {
        parent.children = parent.children.filter(child => child.id !== tabId);
        console.log('🔗 Removed from parent', tabNode.parentId);
      }
    } else {
      // Remove from root tabs
      hierarchyState.rootTabs = hierarchyState.rootTabs.filter(tab => tab.id !== tabId);
      console.log('🌱 Removed from root tabs');
    }

    // Handle orphaned children - move them to root level or to grandparent
    if (tabNode.children.length > 0) {
      console.log('👶 Handling', tabNode.children.length, 'orphaned children');
      
      tabNode.children.forEach(child => {
        if (tabNode.parentId) {
          // Move children to grandparent
          const grandparent = hierarchyState.tabMap.get(tabNode.parentId);
          if (grandparent) {
            child.parentId = tabNode.parentId;
            child.level = Math.min(grandparent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
            grandparent.children.push(child);
            console.log('👴 Moved child', child.id, 'to grandparent', tabNode.parentId);
          } else {
            // Grandparent not found, move to root
            child.parentId = null;
            child.level = 0;
            hierarchyState.rootTabs.push(child);
            console.log('🌱 Moved orphaned child', child.id, 'to root');
          }
        } else {
          // Parent was root, children become root
          child.parentId = null;
          child.level = 0;
          hierarchyState.rootTabs.push(child);
          console.log('🌱 Promoted child', child.id, 'to root');
        }
      });
    }

    // Remove from tab map
    hierarchyState.tabMap.delete(tabId);

    // Update active tab if this was the active tab
    if (hierarchyState.activeTabId === tabId) {
      hierarchyState.activeTabId = null;
      console.log('🎯 Cleared active tab reference');
    }

    // Notify UI components and save state
    debouncedNotifyHierarchyUpdate(removeInfo.windowId, hierarchyState);
    debouncedSaveHierarchyState();

  } catch (error) {
    console.error('❌ Error handling tab removal:', error);
    handleTabEventError(error, 'TAB_REMOVED', { id: tabId, windowId: removeInfo.windowId });
  }
});

// Tab update event listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (!tab.windowId) return;

    const hierarchyState = windowHierarchies.get(tab.windowId);
    if (!hierarchyState) return;

    const tabNode = hierarchyState.tabMap.get(tabId);
    if (!tabNode) return;

    // Update tab properties
    let hasChanges = false;
    
    if (changeInfo.title !== undefined && changeInfo.title !== tabNode.title) {
      tabNode.title = changeInfo.title;
      hasChanges = true;
    }
    
    if (changeInfo.url !== undefined && changeInfo.url !== tabNode.url) {
      tabNode.url = changeInfo.url;
      hasChanges = true;
    }
    
    if (changeInfo.favIconUrl !== undefined && changeInfo.favIconUrl !== tabNode.favicon) {
      tabNode.favicon = changeInfo.favIconUrl;
      hasChanges = true;
    }
    
    if (changeInfo.pinned !== undefined && changeInfo.pinned !== tabNode.isPinned) {
      tabNode.isPinned = changeInfo.pinned;
      hasChanges = true;
    }
    
    if (changeInfo.status !== undefined) {
      const isLoading = changeInfo.status === 'loading';
      if (isLoading !== tabNode.isLoading) {
        tabNode.isLoading = isLoading;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      console.log('🔄 Tab updated:', tabId, 'changes:', Object.keys(changeInfo));
      debouncedNotifyHierarchyUpdate(tab.windowId, hierarchyState);
      debouncedSaveHierarchyState();
    }

  } catch (error) {
    console.error('❌ Error handling tab update:', error);
    handleTabEventError(error, 'TAB_UPDATED', tab);
  }
});

// Tab activation event listener
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    console.log('🎯 Tab activated:', activeInfo.tabId, 'in window:', activeInfo.windowId);
    
    const hierarchyState = windowHierarchies.get(activeInfo.windowId);
    if (!hierarchyState) return;

    // Update previous active tab
    if (hierarchyState.activeTabId) {
      const previousActive = hierarchyState.tabMap.get(hierarchyState.activeTabId);
      if (previousActive) {
        previousActive.isActive = false;
      }
    }

    // Update new active tab
    const newActive = hierarchyState.tabMap.get(activeInfo.tabId);
    if (newActive) {
      newActive.isActive = true;
      hierarchyState.activeTabId = activeInfo.tabId;
      
      debouncedNotifyHierarchyUpdate(activeInfo.windowId, hierarchyState);
      debouncedSaveHierarchyState();
    }

  } catch (error) {
    console.error('❌ Error handling tab activation:', error);
    handleTabEventError(error, 'TAB_ACTIVATED', activeInfo);
  }
});

// Tab move event listener
chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  try {
    console.log('🔄 Tab moved:', tabId, 'in window:', moveInfo.windowId, 'from', moveInfo.fromIndex, 'to', moveInfo.toIndex);
    
    const hierarchyState = windowHierarchies.get(moveInfo.windowId);
    if (hierarchyState) {
      // Tab position changed within the same window
      // The hierarchy relationships remain the same, just notify UI
      debouncedNotifyHierarchyUpdate(moveInfo.windowId, hierarchyState);
      debouncedSaveHierarchyState();
    }

  } catch (error) {
    console.error('❌ Error handling tab move:', error);
    handleTabEventError(error, 'TAB_MOVED', { id: tabId, windowId: moveInfo.windowId });
  }
});

// Tab attached event listener (when tab moves between windows)
chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  try {
    console.log('🔗 Tab attached:', tabId, 'to window:', attachInfo.newWindowId, 'at position:', attachInfo.newPosition);
    
    // Get the tab details
    const tab = await chrome.tabs.get(tabId);
    
    // Remove from old window hierarchy (if it exists)
    // Note: onDetached should have already handled this, but we'll be safe
    
    // Add to new window hierarchy
    let hierarchyState = windowHierarchies.get(attachInfo.newWindowId);
    if (!hierarchyState) {
      hierarchyState = {
        rootTabs: [],
        tabMap: new Map(),
        activeTabId: null,
        windowId: attachInfo.newWindowId
      };
      windowHierarchies.set(attachInfo.newWindowId, hierarchyState);
    }

    // Create TabNode for the moved tab
    const tabNode = {
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl || '',
      parentId: null, // Reset parent relationship when moving between windows
      children: [],
      level: 0,
      isActive: tab.active || false,
      isPinned: tab.pinned || false,
      isLoading: tab.status === 'loading'
    };

    // Add as root tab in new window (lose parent relationship across windows)
    hierarchyState.rootTabs.push(tabNode);
    hierarchyState.tabMap.set(tab.id, tabNode);

    if (tab.active) {
      hierarchyState.activeTabId = tab.id;
    }

    console.log('✅ Tab attached to new window hierarchy:', tabId);
    debouncedNotifyHierarchyUpdate(attachInfo.newWindowId, hierarchyState);
    debouncedSaveHierarchyState();

  } catch (error) {
    console.error('❌ Error handling tab attach:', error);
    handleTabEventError(error, 'TAB_ATTACHED', { id: tabId, windowId: attachInfo.newWindowId });
  }
});

// Tab detached event listener (when tab moves between windows)
chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  try {
    console.log('🔓 Tab detached:', tabId, 'from window:', detachInfo.oldWindowId, 'at position:', detachInfo.oldPosition);
    
    const hierarchyState = windowHierarchies.get(detachInfo.oldWindowId);
    if (!hierarchyState) return;

    const tabNode = hierarchyState.tabMap.get(tabId);
    if (!tabNode) return;

    // Remove from parent's children array
    if (tabNode.parentId) {
      const parent = hierarchyState.tabMap.get(tabNode.parentId);
      if (parent) {
        parent.children = parent.children.filter(child => child.id !== tabId);
      }
    } else {
      // Remove from root tabs
      hierarchyState.rootTabs = hierarchyState.rootTabs.filter(tab => tab.id !== tabId);
    }

    // Handle orphaned children - promote them to root or to grandparent
    if (tabNode.children.length > 0) {
      console.log('👶 Handling', tabNode.children.length, 'orphaned children from detached tab');
      
      tabNode.children.forEach(child => {
        if (tabNode.parentId) {
          // Move children to grandparent
          const grandparent = hierarchyState.tabMap.get(tabNode.parentId);
          if (grandparent) {
            child.parentId = tabNode.parentId;
            child.level = Math.min(grandparent.level + 1, CONFIG.MAX_HIERARCHY_DEPTH);
            grandparent.children.push(child);
          } else {
            // Grandparent not found, move to root
            child.parentId = null;
            child.level = 0;
            hierarchyState.rootTabs.push(child);
          }
        } else {
          // Parent was root, children become root
          child.parentId = null;
          child.level = 0;
          hierarchyState.rootTabs.push(child);
        }
      });
    }

    // Remove from tab map
    hierarchyState.tabMap.delete(tabId);

    // Update active tab if this was the active tab
    if (hierarchyState.activeTabId === tabId) {
      hierarchyState.activeTabId = null;
    }

    console.log('✅ Tab detached from window hierarchy:', tabId);
    debouncedNotifyHierarchyUpdate(detachInfo.oldWindowId, hierarchyState);
    debouncedSaveHierarchyState();

  } catch (error) {
    console.error('❌ Error handling tab detach:', error);
    handleTabEventError(error, 'TAB_DETACHED', { id: tabId, windowId: detachInfo.oldWindowId });
  }
});

// Window removal event listener
chrome.windows.onRemoved.addListener((windowId) => {
  console.log('🗑️ Window removed:', windowId);
  windowHierarchies.delete(windowId);
  debouncedSaveHierarchyState();
});

// Utility functions
function isRestrictedTab(tab) {
  if (!tab.url) return true;
  
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'chrome-devtools:', 'edge:', 'about:'];
  return restrictedProtocols.some(protocol => tab.url.startsWith(protocol));
}

function handleTabEventError(error, eventType, tabData) {
  console.error(`❌ Error in ${eventType} handler:`, error);
  
  // Log additional context
  if (tabData) {
    console.error('Tab data:', tabData);
  }
  
  // Could implement error reporting here
  // For now, we'll just log and continue
}

function notifyHierarchyUpdate(windowId, hierarchyState) {
  try {
    const message = {
      type: 'HIERARCHY_UPDATED',
      windowId,
      hierarchyState: {
        rootTabs: hierarchyState.rootTabs,
        activeTabId: hierarchyState.activeTabId,
        tabCount: hierarchyState.tabMap.size
      }
    };

    // Send to all extension contexts (side panel, popup, etc.)
    chrome.runtime.sendMessage(message).catch(() => {
      // Ignore "no receiving end" errors - happens when no UI is open
      console.log('📤 HIERARCHY_UPDATED message sent (no receivers)');
    });

  } catch (error) {
    console.error('❌ Failed to notify hierarchy update:', error);
  }
}

// Message handler for communication with UI components
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📥 Received message:', message.type, 'from:', sender.tab ? `tab ${sender.tab.id}` : 'extension context');

  // Handle async operations properly
  (async () => {
    try {
      switch (message.type) {
        case 'GET_HIERARCHY_STATE':
          await handleGetHierarchyState(message, sender, sendResponse);
          break;
          
        case 'GET_TREE': // Legacy support
          await handleGetTree(message, sender, sendResponse);
          break;
          
        case 'SWITCH_TO_TAB':
          await handleSwitchToTab(message, sender, sendResponse);
          break;
          
        case 'CLOSE_TAB':
          await handleCloseTab(message, sender, sendResponse);
          break;
          
        case 'CASCADING_DELETE':
          await handleCascadingDelete(message, sender, sendResponse);
          break;
          
        case 'SAVE_CABINET':
          await handleSaveCabinet(message, sender, sendResponse);
          break;
          
        case 'LIST_CABINETS':
          await handleListCabinets(message, sender, sendResponse);
          break;
          
        case 'RESTORE_CABINET':
          await handleRestoreCabinet(message, sender, sendResponse);
          break;
          
        case 'DELETE_CABINET':
          await handleDeleteCabinet(message, sender, sendResponse);
          break;
          
        case 'RENAME_CABINET':
          await handleRenameCabinet(message, sender, sendResponse);
          break;
          
        case 'GET_STORAGE_INFO':
          await handleGetStorageInfo(message, sender, sendResponse);
          break;
          
        case 'GET_CABINET_PREVIEW':
          await handleGetCabinetPreview(message, sender, sendResponse);
          break;
          
        case 'DUPLICATE_CABINET':
          await handleDuplicateCabinet(message, sender, sendResponse);
          break;
          
        case 'PING':
          console.log('🏓 PING received, sending PONG');
          sendResponse({ success: true, message: 'PONG' });
          break;
          
        default:
          console.log('⚠️ Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we'll send response asynchronously
  return true;
});

// Message handlers
async function handleGetHierarchyState(message, sender, sendResponse) {
  console.log('🔍 handleGetHierarchyState called with message:', message);
  
  try {
    let windowId = message.windowId;
    
    if (!windowId) {
      console.log('🔍 No windowId in message, determining from sender...');
      if (sender.tab) {
        windowId = sender.tab.windowId;
        console.log('📋 Got windowId from sender tab:', windowId);
      } else {
        console.log('🔍 Querying for active tab...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        windowId = tabs[0]?.windowId;
        console.log('📋 Got windowId from active tab query:', windowId);
      }
    }
    
    if (!windowId) {
      console.log('⚠️ Could not determine window ID for hierarchy state request');
      const errorResponse = { success: false, error: 'Could not determine window ID' };
      console.log('📤 Sending error response:', errorResponse);
      sendResponse(errorResponse);
      return;
    }
    
    console.log('🔍 Looking for hierarchy state for window:', windowId);
    console.log('📊 Available windows:', Array.from(windowHierarchies.keys()));
    
    let hierarchyState = windowHierarchies.get(windowId);
    if (!hierarchyState) {
      console.log('⚠️ No hierarchy state found for window:', windowId, '- building fresh hierarchy');
      
      // Try to build hierarchy from current tabs
      try {
        console.log('🔍 Querying tabs for window:', windowId);
        const tabs = await chrome.tabs.query({ windowId: windowId });
        console.log('📋 Found', tabs.length, 'tabs in window', windowId);
        
        if (tabs.length > 0) {
          console.log('🏗️ Building hierarchy from tabs...');
          hierarchyState = buildHierarchyFromTabs(tabs, windowId);
          windowHierarchies.set(windowId, hierarchyState);
          console.log('✅ Built fresh hierarchy with', hierarchyState.tabMap.size, 'tabs');
        } else {
          console.log('📝 No tabs found, creating empty hierarchy state');
          // Initialize empty state
          hierarchyState = {
            rootTabs: [],
            tabMap: new Map(),
            activeTabId: null,
            windowId
          };
          windowHierarchies.set(windowId, hierarchyState);
          console.log('📝 Created empty hierarchy state for window', windowId);
        }
      } catch (tabQueryError) {
        console.error('❌ Failed to query tabs for window', windowId, ':', tabQueryError);
        // Initialize empty state as fallback
        hierarchyState = {
          rootTabs: [],
          tabMap: new Map(),
          activeTabId: null,
          windowId
        };
        windowHierarchies.set(windowId, hierarchyState);
        console.log('📝 Created fallback empty hierarchy state');
      }
    }
    
    const response = { 
      success: true, 
      hierarchyState: {
        rootTabs: hierarchyState.rootTabs,
        activeTabId: hierarchyState.activeTabId,
        windowId: hierarchyState.windowId,
        tabCount: hierarchyState.tabMap.size
      }
    };
    
    console.log('📊 Sending hierarchy state response for window', windowId, 'with', hierarchyState.tabMap.size, 'tabs');
    console.log('📤 Response object:', response);
    sendResponse(response);
    
  } catch (error) {
    console.error('❌ Error getting hierarchy state:', error);
    const errorResponse = { success: false, error: error.message };
    console.log('📤 Sending error response:', errorResponse);
    sendResponse(errorResponse);
  }
}

async function handleGetTree(message, sender, sendResponse) {
  // Legacy handler for backward compatibility
  try {
    let windowId;
    
    if (sender.tab) {
      windowId = sender.tab.windowId;
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      windowId = tabs[0]?.windowId;
    }
    
    if (!windowId) {
      console.log('⚠️ Could not determine window ID for legacy tree request');
      sendResponse({ tree: {} });
      return;
    }
    
    const hierarchyState = windowHierarchies.get(windowId);
    if (!hierarchyState) {
      sendResponse({ tree: {} });
      return;
    }
    
    // Convert to legacy format
    const legacyTree = {};
    hierarchyState.tabMap.forEach((tabNode, tabId) => {
      legacyTree[tabId] = {
        parentId: tabNode.parentId,
        children: tabNode.children.map(child => child.id)
      };
    });
    
    console.log('📊 Sending legacy tree for window', windowId, 'with', Object.keys(legacyTree).length, 'tabs');
    sendResponse({ tree: legacyTree });
    
  } catch (error) {
    console.error('❌ Error handling legacy GET_TREE:', error);
    sendResponse({ tree: {} });
  }
}

async function handleSwitchToTab(message, sender, sendResponse) {
  try {
    const { tabId } = message;
    
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required' });
      return;
    }
    
    await chrome.tabs.update(tabId, { active: true });
    console.log('✅ Switched to tab:', tabId);
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('❌ Error switching to tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCloseTab(message, sender, sendResponse) {
  try {
    const { tabId } = message;
    
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required' });
      return;
    }
    
    await chrome.tabs.remove(tabId);
    console.log('✅ Closed tab:', tabId);
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('❌ Error closing tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCascadingDelete(message, sender, sendResponse) {
  try {
    const { tabId, windowId } = message;
    
    if (!tabId) {
      sendResponse({ success: false, error: 'Tab ID required' });
      return;
    }
    
    const hierarchyState = windowHierarchies.get(windowId);
    if (!hierarchyState) {
      sendResponse({ success: false, error: 'Window hierarchy not found' });
      return;
    }
    
    // Get all descendant tabs
    const tabsToDelete = [];
    const visited = new Set();
    
    function collectDescendants(currentTabId) {
      if (visited.has(currentTabId)) return;
      visited.add(currentTabId);
      
      const tabNode = hierarchyState.tabMap.get(currentTabId);
      if (!tabNode) return;
      
      tabsToDelete.push(currentTabId);
      tabNode.children.forEach(child => collectDescendants(child.id));
    }
    
    collectDescendants(tabId);
    
    // Close tabs in reverse order (children first)
    const errors = [];
    const deletedTabs = [];
    
    for (let i = tabsToDelete.length - 1; i >= 0; i--) {
      const currentTabId = tabsToDelete[i];
      try {
        await chrome.tabs.remove(currentTabId);
        deletedTabs.push(currentTabId);
        console.log('✅ Cascading delete closed tab:', currentTabId);
      } catch (error) {
        errors.push(`Failed to close tab ${currentTabId}: ${error.message}`);
        console.error('❌ Error in cascading delete for tab:', currentTabId, error);
      }
    }
    
    sendResponse({ 
      success: errors.length === 0,
      deletedTabs,
      errors
    });
    
  } catch (error) {
    console.error('❌ Error in cascading delete:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Note: Using popup instead of side panel, so no action.onClicked handler needed

// Cabinet message handlers
async function handleSaveCabinet(message, sender, sendResponse) {
  try {
    const { name, hierarchyState } = message;
    
    if (!name || !hierarchyState) {
      sendResponse({ success: false, error: 'Cabinet name and hierarchy state required' });
      return;
    }
    
    // Create Cabinet object
    const cabinet = {
      id: `cabinet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tabs: hierarchyState.rootTabs || [],
      metadata: {
        tabCount: hierarchyState.tabCount || 0,
        windowId: hierarchyState.windowId || -1
      }
    };
    
    // Get existing cabinets
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    
    // Check if name already exists
    if (cabinets.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      sendResponse({ success: false, error: 'A Cabinet with this name already exists' });
      return;
    }
    
    // Add new cabinet
    cabinets.push(cabinet);
    
    // Save to storage
    await chrome.storage.local.set({ tab_hierarchy_cabinets: cabinets });
    
    console.log('✅ Cabinet saved:', cabinet.name);
    sendResponse({ success: true, data: cabinet });
    
  } catch (error) {
    console.error('❌ Error saving cabinet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleListCabinets(message, sender, sendResponse) {
  try {
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    
    // Convert date strings back to Date objects and sort by creation date
    const processedCabinets = cabinets
      .map(cabinet => ({
        ...cabinet,
        createdAt: new Date(cabinet.createdAt),
        updatedAt: new Date(cabinet.updatedAt)
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log('📋 Listed', processedCabinets.length, 'cabinets');
    sendResponse({ success: true, data: processedCabinets });
    
  } catch (error) {
    console.error('❌ Error listing cabinets:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleRestoreCabinet(message, sender, sendResponse) {
  try {
    const { cabinetId } = message;
    
    if (!cabinetId) {
      sendResponse({ success: false, error: 'Cabinet ID required' });
      return;
    }
    
    // Get cabinet
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    const cabinet = cabinets.find(c => c.id === cabinetId);
    
    if (!cabinet) {
      sendResponse({ success: false, error: 'Cabinet not found' });
      return;
    }
    
    // Get current window
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) {
      sendResponse({ success: false, error: 'Could not access current window' });
      return;
    }
    
    // Close existing tabs (except pinned ones)
    const currentTabs = await chrome.tabs.query({ windowId: currentWindow.id });
    const tabsToClose = currentTabs.filter(tab => !tab.pinned && tab.id);
    
    if (tabsToClose.length > 0) {
      // Keep at least one tab open to prevent window closure
      if (tabsToClose.length === currentTabs.length) {
        await chrome.tabs.create({ url: 'chrome://newtab/', windowId: currentWindow.id, active: true });
      }
      
      const tabIds = tabsToClose.map(tab => tab.id);
      await chrome.tabs.remove(tabIds);
    }
    
    // Restore tabs from cabinet
    const restoredTabs = [];
    const failedUrls = [];
    
    async function restoreTabsRecursively(tabs, parentId = null) {
      for (const tab of tabs) {
        try {
          // Skip restricted URLs
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            failedUrls.push(tab.url);
            continue;
          }
          
          const createProperties = {
            url: tab.url,
            windowId: currentWindow.id,
            active: false,
            pinned: tab.isPinned || false
          };
          
          if (parentId) {
            createProperties.openerTabId = parentId;
          }
          
          const newTab = await chrome.tabs.create(createProperties);
          if (newTab.id) {
            restoredTabs.push(newTab.id);
            
            // Restore children
            if (tab.children && tab.children.length > 0) {
              await restoreTabsRecursively(tab.children, newTab.id);
            }
          }
          
        } catch (error) {
          console.error('Failed to restore tab:', tab.title, error);
          failedUrls.push(tab.url);
        }
      }
    }
    
    await restoreTabsRecursively(cabinet.tabs);
    
    console.log('✅ Cabinet restored:', cabinet.name, 'Restored:', restoredTabs.length, 'Failed:', failedUrls.length);
    sendResponse({ 
      success: true, 
      data: {
        restoredTabs,
        failedUrls,
        summary: {
          totalTabs: cabinet.metadata.tabCount,
          successfulTabs: restoredTabs.length,
          failedTabs: failedUrls.length
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error restoring cabinet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeleteCabinet(message, sender, sendResponse) {
  try {
    const { cabinetId } = message;
    
    if (!cabinetId) {
      sendResponse({ success: false, error: 'Cabinet ID required' });
      return;
    }
    
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    const cabinetIndex = cabinets.findIndex(c => c.id === cabinetId);
    
    if (cabinetIndex === -1) {
      sendResponse({ success: false, error: 'Cabinet not found' });
      return;
    }
    
    const deletedCabinet = cabinets.splice(cabinetIndex, 1)[0];
    await chrome.storage.local.set({ tab_hierarchy_cabinets: cabinets });
    
    console.log('✅ Cabinet deleted:', deletedCabinet.name);
    sendResponse({ success: true, data: deletedCabinet });
    
  } catch (error) {
    console.error('❌ Error deleting cabinet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleRenameCabinet(message, sender, sendResponse) {
  try {
    const { cabinetId, newName } = message;
    
    if (!cabinetId || !newName) {
      sendResponse({ success: false, error: 'Cabinet ID and new name required' });
      return;
    }
    
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    const cabinetIndex = cabinets.findIndex(c => c.id === cabinetId);
    
    if (cabinetIndex === -1) {
      sendResponse({ success: false, error: 'Cabinet not found' });
      return;
    }
    
    // Check if new name already exists
    if (cabinets.some((c, index) => index !== cabinetIndex && c.name.toLowerCase() === newName.toLowerCase())) {
      sendResponse({ success: false, error: 'A Cabinet with this name already exists' });
      return;
    }
    
    const cabinet = cabinets[cabinetIndex];
    cabinet.name = newName.trim();
    cabinet.updatedAt = new Date();
    
    await chrome.storage.local.set({ tab_hierarchy_cabinets: cabinets });
    
    console.log('✅ Cabinet renamed:', newName);
    sendResponse({ success: true, data: cabinet });
    
  } catch (error) {
    console.error('❌ Error renaming cabinet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetStorageInfo(message, sender, sendResponse) {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    
    const storageInfo = {
      used: usage,
      available: chrome.storage.local.QUOTA_BYTES - usage,
      cabinetCount: cabinets.length,
      isNearLimit: usage > (chrome.storage.local.QUOTA_BYTES * 0.8) // 80% threshold
    };
    
    console.log('📊 Storage info:', storageInfo);
    sendResponse({ success: true, data: storageInfo });
    
  } catch (error) {
    console.error('❌ Error getting storage info:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetCabinetPreview(message, sender, sendResponse) {
  try {
    const { cabinetId } = message;
    
    if (!cabinetId) {
      sendResponse({ success: false, error: 'Cabinet ID required' });
      return;
    }
    
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    const cabinet = cabinets.find(c => c.id === cabinetId);
    
    if (!cabinet) {
      sendResponse({ success: false, error: 'Cabinet not found' });
      return;
    }
    
    // Create tab summary
    const tabSummary = createTabSummary(cabinet.tabs);
    
    const preview = {
      id: cabinet.id,
      name: cabinet.name,
      createdAt: cabinet.createdAt,
      updatedAt: cabinet.updatedAt,
      metadata: cabinet.metadata,
      tabSummary: tabSummary
    };
    
    sendResponse({ success: true, data: preview });
    
  } catch (error) {
    console.error('❌ Error getting cabinet preview:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDuplicateCabinet(message, sender, sendResponse) {
  try {
    const { cabinetId, newName } = message;
    
    if (!cabinetId || !newName) {
      sendResponse({ success: false, error: 'Cabinet ID and new name required' });
      return;
    }
    
    const result = await chrome.storage.local.get('tab_hierarchy_cabinets');
    const cabinets = result.tab_hierarchy_cabinets || [];
    const originalCabinet = cabinets.find(c => c.id === cabinetId);
    
    if (!originalCabinet) {
      sendResponse({ success: false, error: 'Original cabinet not found' });
      return;
    }
    
    // Check if new name already exists
    if (cabinets.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
      sendResponse({ success: false, error: 'A Cabinet with this name already exists' });
      return;
    }
    
    // Create duplicate cabinet
    const duplicatedCabinet = {
      id: `cabinet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tabs: JSON.parse(JSON.stringify(originalCabinet.tabs)), // Deep copy
      metadata: { ...originalCabinet.metadata }
    };
    
    cabinets.push(duplicatedCabinet);
    await chrome.storage.local.set({ tab_hierarchy_cabinets: cabinets });
    
    console.log('✅ Cabinet duplicated:', newName);
    sendResponse({ success: true, data: duplicatedCabinet });
    
  } catch (error) {
    console.error('❌ Error duplicating cabinet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Helper function to create tab summary
function createTabSummary(tabs) {
  let totalTabs = 0;
  let maxDepth = 0;
  let restrictedTabs = 0;
  let pinnedTabs = 0;
  const domains = new Set();

  function analyzeTabs(tabList, depth = 0) {
    tabList.forEach(tab => {
      totalTabs++;
      maxDepth = Math.max(maxDepth, depth);
      
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        restrictedTabs++;
      }
      
      if (tab.isPinned) {
        pinnedTabs++;
      }

      // Extract domain
      try {
        const url = new URL(tab.url);
        domains.add(url.hostname);
      } catch (error) {
        // Invalid URL, skip domain extraction
      }

      if (tab.children && tab.children.length > 0) {
        analyzeTabs(tab.children, depth + 1);
      }
    });
  }

  analyzeTabs(tabs);

  return {
    totalTabs,
    rootTabs: tabs.length,
    maxDepth,
    restrictedTabs,
    pinnedTabs,
    domains: Array.from(domains).slice(0, 10) // Limit to first 10 domains
  };
}

// Initialize tabs when the service worker starts
console.log('📊 Initializing existing tabs on startup...');
setTimeout(() => {
  initializeExistingTabs();
}, 200); // Small delay to ensure Chrome APIs are ready

console.log('🎉 Tab Hierarchy Visualizer background service worker loaded successfully!');
