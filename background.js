console.log('🚀 Tree Tabs background script starting...');

// Track tab relationships per window
const windowTrees = new Map(); // windowId -> Map of tabId -> {parentId, children}

console.log('📊 Initializing existing tabs...');

// Initialize existing tabs immediately
initializeExistingTabs();

async function initializeExistingTabs() {
  try {
    console.log('🔍 Querying existing tabs...');
    const tabs = await chrome.tabs.query({});
    windowTrees.clear();
    
    tabs.forEach(tab => {
      if (!windowTrees.has(tab.windowId)) {
        windowTrees.set(tab.windowId, new Map());
      }
      const tabTree = windowTrees.get(tab.windowId);
      tabTree.set(tab.id, { parentId: null, children: [] });
    });
    
    console.log('✅ Initialized tabs in', windowTrees.size, 'windows, total tabs:', tabs.length);
  } catch (error) {
    console.error('❌ Failed to initialize tabs:', error);
  }
}

console.log('🎯 Setting up event listeners...');

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Chrome startup detected');
  initializeExistingTabs();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('🔧 Extension installed/updated');
  initializeExistingTabs();
});

chrome.tabs.onCreated.addListener((tab) => {
  console.log('➕ Tab created:', tab.id, 'in window:', tab.windowId, 'opener:', tab.openerTabId);
  
  if (!windowTrees.has(tab.windowId)) {
    console.log('🆕 Creating new window tree for:', tab.windowId);
    windowTrees.set(tab.windowId, new Map());
  }
  
  const tabTree = windowTrees.get(tab.windowId);
  
  if (tab.openerTabId && tabTree.has(tab.openerTabId)) {
    console.log('🔗 Linking tab', tab.id, 'to parent', tab.openerTabId);
    tabTree.set(tab.id, { parentId: tab.openerTabId, children: [] });
    
    // Add to parent's children
    const parent = tabTree.get(tab.openerTabId);
    if (parent) {
      parent.children.push(tab.id);
    }
  } else {
    console.log('🌱 Creating root tab:', tab.id);
    tabTree.set(tab.id, { parentId: null, children: [] });
  }
  
  // Notify side panels in this window
  try {
    chrome.runtime.sendMessage({ 
      type: 'TAB_CREATED', 
      tab, 
      windowId: tab.windowId,
      tree: Object.fromEntries(tabTree) 
    }).catch(() => {
      // Ignore "no receiving end" errors - happens when no side panel is open
      console.log('📤 TAB_CREATED message sent (no receivers)');
    });
  } catch (error) {
    console.error('❌ Failed to send TAB_CREATED message:', error);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('➖ Tab removed:', tabId, 'from window:', removeInfo.windowId);
  
  const tabTree = windowTrees.get(removeInfo.windowId);
  if (!tabTree) {
    console.log('⚠️ No tree found for window:', removeInfo.windowId);
    return;
  }
  
  const tabData = tabTree.get(tabId);
  if (tabData) {
    console.log('🧹 Cleaning up tab relationships for:', tabId);
    
    // Remove from parent's children
    if (tabData.parentId) {
      const parent = tabTree.get(tabData.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== tabId);
      }
    }
    
    // Orphan children
    tabData.children.forEach(childId => {
      const child = tabTree.get(childId);
      if (child) {
        child.parentId = null;
        console.log('👶 Orphaned child tab:', childId);
      }
    });
    
    tabTree.delete(tabId);
  }
  
  try {
    chrome.runtime.sendMessage({ 
      type: 'TAB_REMOVED', 
      tabId,
      windowId: removeInfo.windowId,
      tree: Object.fromEntries(tabTree) 
    }).catch(() => {
      // Ignore "no receiving end" errors - happens when no side panel is open
      console.log('📤 TAB_REMOVED message sent (no receivers)');
    });
  } catch (error) {
    console.error('❌ Failed to send TAB_REMOVED message:', error);
  }
});

// Clean up when window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  windowTrees.delete(windowId);
  console.log('🗑️ Cleaned up window:', windowId);
});

// Handle side panel requests
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'GET_TREE') {
    console.log('📥 Received GET_TREE request from:', sender.tab ? `tab ${sender.tab.id}` : 'side panel');
    
    try {
      let windowId;
      
      if (sender.tab) {
        // Message from a tab
        windowId = sender.tab.windowId;
      } else {
        // Message from side panel - get current active tab's window
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        windowId = tabs[0]?.windowId;
      }
      
      if (!windowId) {
        console.log('⚠️ Could not determine window ID');
        sendResponse({ tree: {} });
        return;
      }
      
      const tabTree = windowTrees.get(windowId) || new Map();
      
      console.log('📊 Sending tree for window', windowId, 'with', tabTree.size, 'tabs');
      sendResponse({ tree: Object.fromEntries(tabTree) });
    } catch (error) {
      console.error('❌ Error handling GET_TREE:', error);
      sendResponse({ tree: {} });
    }
  }
});

// Toggle side panel when toolbar button is clicked
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🖱️ Extension icon clicked for tab:', tab.id, 'window:', tab.windowId);
  
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log('✅ Side panel opened');
  } catch (error) {
    console.error('❌ Failed to open side panel:', error);
  }
});

console.log('🎉 Tree Tabs background script loaded successfully!');
