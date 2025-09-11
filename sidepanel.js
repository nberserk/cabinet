let tabTree = {};
let allTabs = {};
let currentWindowId = null;

// Get initial data
async function init() {
  try {
    // Get current window ID from the current window
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentWindowId = currentTab?.windowId;
    
    console.log('Side panel init for window:', currentWindowId);
    
    // Get ALL tabs from current window first
    const tabs = await chrome.tabs.query({ windowId: currentWindowId });
    allTabs = {};
    tabs.forEach(tab => allTabs[tab.id] = tab);
    console.log('Found', tabs.length, 'tabs in window');
    
    // Then get the tree structure
    const response = await chrome.runtime.sendMessage({ type: 'GET_TREE' });
    tabTree = response?.tree || {};
    console.log('Received tree with', Object.keys(tabTree).length, 'entries');
    
    renderTree();
  } catch (error) {
    console.error('Init error:', error);
  }
}

function renderTree() {
  try {
    const container = document.getElementById('tab-tree');
    container.innerHTML = '';
    
    // Find root tabs (no parent)
    const rootTabs = Object.keys(tabTree).filter(id => !tabTree[id].parentId);
    console.log('Root tabs:', rootTabs.length);
    
    rootTabs.forEach((tabId, index) => {
      const isLast = index === rootTabs.length - 1;
      renderTabWithChildren(container, tabId, 0, isLast, []);
    });
  } catch (error) {
    console.error('Render error:', error);
  }
}

function renderTabWithChildren(container, tabId, depth, isLast = false, ancestorLines = []) {
  const tab = allTabs[tabId];
  if (!tab) return;
  
  // Check if this is a restricted Chrome page
  const isRestricted = tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://');
  
  const tabElement = document.createElement('div');
  tabElement.className = 'tab-item';
  if (tab.active) tabElement.classList.add('active');
  if (isRestricted) tabElement.classList.add('restricted');
  
  // Add tree lines for each depth level
  for (let i = 0; i < depth; i++) {
    const treeLine = document.createElement('div');
    treeLine.className = 'tree-line';
    
    // Show vertical line if ancestor at this level has more siblings
    if (i < ancestorLines.length && ancestorLines[i]) {
      treeLine.classList.add('has-vertical');
    }
    
    tabElement.appendChild(treeLine);
  }
  
  // Add the connection line for current tab (if not root)
  if (depth > 0) {
    const connectionLine = document.createElement('div');
    connectionLine.className = 'tree-line has-branch';
    if (isLast) {
      connectionLine.classList.add('last-child');
    }
    tabElement.appendChild(connectionLine);
  }
  
  // Tab content wrapper
  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';
  
  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
  tabContent.appendChild(favicon);
  
  // Title
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title || tab.url;
  tabContent.appendChild(title);
  
  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    chrome.tabs.remove(tab.id);
  };
  tabContent.appendChild(closeBtn);
  
  // Click to switch tab (disabled for restricted pages)
  if (!isRestricted) {
    tabContent.onclick = () => {
      chrome.tabs.update(tab.id, { active: true });
    };
  } else {
    tabContent.style.cursor = 'default';
  }
  
  tabElement.appendChild(tabContent);
  container.appendChild(tabElement);
  
  // Render children
  const tabData = tabTree[tabId];
  if (tabData && tabData.children && tabData.children.length > 0) {
    // Update ancestor lines - current level should show vertical line if not last
    const newAncestorLines = [...ancestorLines];
    newAncestorLines[depth] = !isLast;
    
    tabData.children.forEach((childId, index) => {
      const isLastChild = index === tabData.children.length - 1;
      renderTabWithChildren(container, childId, depth + 1, isLastChild, newAncestorLines);
    });
  }
}

// Listen for updates
chrome.runtime.onMessage.addListener((message) => {
  try {
    console.log('Message received:', message.type, 'for window:', message.windowId);
    
    // Only handle messages for our window
    if (message.windowId !== currentWindowId) {
      return;
    }
    
    if (message.type === 'TAB_CREATED' || message.type === 'TAB_REMOVED') {
      tabTree = message.tree;
      chrome.tabs.query({ windowId: currentWindowId }).then(tabs => {
        allTabs = {};
        tabs.forEach(tab => allTabs[tab.id] = tab);
        renderTree();
      });
    }
  } catch (error) {
    console.error('Message handler error:', error);
  }
});

// Tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    // Only handle updates for our window
    if (tab.windowId !== currentWindowId) {
      return;
    }
    
    chrome.tabs.query({ windowId: currentWindowId }).then(tabs => {
      allTabs = {};
      tabs.forEach(tab => allTabs[tab.id] = tab);
      renderTree();
    });
  } catch (error) {
    console.error('Tab update error:', error);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  try {
    // Only handle activation in our window
    if (activeInfo.windowId !== currentWindowId) {
      return;
    }
    
    renderTree();
  } catch (error) {
    console.error('Tab activation error:', error);
  }
});

init();
