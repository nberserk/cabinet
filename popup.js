// State management
let hierarchyState = null;
let currentWindowId = null;
let isLoading = true;
let contextMenu = null;
let selectedTabId = null;

// UI elements - will be initialized when DOM is ready
let tabTreeElement;
let loadingStateElement;
let errorStateElement;
let emptyStateElement;
let contextMenuElement;
let saveCabinetBtn;
let manageCabinetsBtn;

// Initialize DOM elements
function initializeElements() {
  tabTreeElement = document.getElementById('tab-tree');
  loadingStateElement = document.getElementById('loading-state');
  errorStateElement = document.getElementById('error-state');
  emptyStateElement = document.getElementById('empty-state');
  contextMenuElement = document.getElementById('context-menu');
  saveCabinetBtn = document.getElementById('save-cabinet-btn');
  manageCabinetsBtn = document.getElementById('manage-cabinets-btn');
  
  if (!tabTreeElement || !loadingStateElement || !errorStateElement || !emptyStateElement || !contextMenuElement) {
    throw new Error('Required DOM elements not found');
  }
}

// Initialize the popup
async function init() {
  try {
    // Initialize DOM elements first
    initializeElements();
    
    showLoadingState();
    
    // Get current window ID
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentWindowId = currentTab?.windowId;
    
    if (!currentWindowId) {
      throw new Error('Could not determine current window ID');
    }
    
    console.log('Popup initializing for window:', currentWindowId);
    
    // Get hierarchy state from background script
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_HIERARCHY_STATE',
      windowId: currentWindowId 
    });
    
    console.log('Background response:', response);
    
    if (response && response.success) {
      hierarchyState = response.hierarchyState;
      console.log('Received hierarchy state with', hierarchyState?.tabCount || 0, 'tabs');
      renderHierarchy();
    } else {
      // Fallback to legacy GET_TREE message for backward compatibility
      console.log('Trying legacy GET_TREE message...');
      const legacyResponse = await chrome.runtime.sendMessage({ type: 'GET_TREE' });
      
      if (legacyResponse && legacyResponse.tree) {
        // Convert legacy format to new format
        hierarchyState = {
          rootTabs: [],
          tabCount: Object.keys(legacyResponse.tree).length,
          activeTabId: null,
          windowId: currentWindowId
        };
        
        // For now, show empty state if using legacy format
        showEmptyState();
        console.log('Using legacy tree format, showing empty state');
      } else {
        throw new Error(response?.error || 'Failed to get hierarchy state');
      }
    }
    
    // Set up quick action buttons
    setupQuickActions();
    
    // Set up keyboard navigation
    setupKeyboardNavigation();
    
    // Set up context menu
    setupContextMenu();
    
    hideLoadingState();
    
  } catch (error) {
    console.error('Init error:', error);
    showErrorState(error.message);
  }
}

// State management functions
function showLoadingState() {
  isLoading = true;
  loadingStateElement.classList.remove('hidden');
  tabTreeElement.classList.add('hidden');
  errorStateElement.classList.add('hidden');
  emptyStateElement.classList.add('hidden');
}

function hideLoadingState() {
  isLoading = false;
  loadingStateElement.classList.add('hidden');
}

function showErrorState(message) {
  errorStateElement.classList.remove('hidden');
  tabTreeElement.classList.add('hidden');
  loadingStateElement.classList.add('hidden');
  emptyStateElement.classList.add('hidden');
  
  const errorMessageElement = document.getElementById('error-message');
  if (errorMessageElement) {
    errorMessageElement.textContent = message;
  }
}

function showEmptyState() {
  emptyStateElement.classList.remove('hidden');
  tabTreeElement.classList.add('hidden');
  errorStateElement.classList.add('hidden');
  loadingStateElement.classList.add('hidden');
}

function showTabTree() {
  tabTreeElement.classList.remove('hidden');
  errorStateElement.classList.add('hidden');
  loadingStateElement.classList.add('hidden');
  emptyStateElement.classList.add('hidden');
}

// Main rendering function
function renderHierarchy() {
  try {
    console.log('renderHierarchy called with state:', hierarchyState);
    
    if (!hierarchyState) {
      console.log('No hierarchy state, showing empty state');
      showEmptyState();
      return;
    }
    
    if (!hierarchyState.rootTabs || !Array.isArray(hierarchyState.rootTabs)) {
      console.log('Invalid rootTabs, showing empty state');
      showEmptyState();
      return;
    }
    
    if (hierarchyState.rootTabs.length === 0) {
      console.log('No root tabs, showing empty state');
      showEmptyState();
      return;
    }
    
    showTabTree();
    tabTreeElement.innerHTML = '';
    
    console.log('Rendering hierarchy with', hierarchyState.rootTabs.length, 'root tabs');
    
    hierarchyState.rootTabs.forEach((tab, index) => {
      const isLast = index === hierarchyState.rootTabs.length - 1;
      renderTabNode(tabTreeElement, tab, 0, isLast, []);
    });
    
    // Set focus to first tab for keyboard navigation
    const firstTab = tabTreeElement.querySelector('.tree-node');
    if (firstTab) {
      firstTab.setAttribute('tabindex', '0');
    }
    
  } catch (error) {
    console.error('Render error:', error);
    showErrorState('Failed to render tab hierarchy: ' + error.message);
  }
}

// Render individual tab node with tree structure
function renderTabNode(container, tabNode, depth, isLast = false, ancestorLines = []) {
  if (!tabNode || !tabNode.id) {
    console.warn('Invalid tab node:', tabNode);
    return;
  }
  
  // Ensure children array exists
  if (!tabNode.children) {
    tabNode.children = [];
  }
  
  // Check if this is a restricted Chrome page
  const isRestricted = tabNode.url?.startsWith('chrome://') || 
                      tabNode.url?.startsWith('chrome-extension://') ||
                      tabNode.url?.startsWith('chrome-devtools://');
  
  // Create main tab element
  const tabElement = document.createElement('div');
  tabElement.className = 'tree-node';
  tabElement.setAttribute('data-tab-id', tabNode.id);
  tabElement.setAttribute('role', 'treeitem');
  tabElement.setAttribute('aria-level', depth + 1);
  tabElement.setAttribute('aria-expanded', tabNode.children.length > 0 ? 'true' : 'false');
  tabElement.setAttribute('tabindex', '-1');
  
  if (tabNode.isActive) {
    tabElement.classList.add('active');
    tabElement.setAttribute('aria-selected', 'true');
  }
  if (isRestricted) {
    tabElement.classList.add('restricted');
    tabElement.setAttribute('aria-disabled', 'true');
  }
  
  // Add tree lines for each depth level
  for (let i = 0; i < depth; i++) {
    const treeLine = document.createElement('div');
    treeLine.className = 'tree-line';
    treeLine.setAttribute('aria-hidden', 'true');
    
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
    connectionLine.setAttribute('aria-hidden', 'true');
    if (isLast) {
      connectionLine.classList.add('last-child');
    }
    tabElement.appendChild(connectionLine);
  }
  
  // Tab content wrapper
  const tabContent = document.createElement('div');
  tabContent.className = 'tree-content';
  
  // Favicon
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = tabNode.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
  favicon.alt = '';
  favicon.setAttribute('aria-hidden', 'true');
  tabContent.appendChild(favicon);
  
  // Title
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tabNode.title || tabNode.url || 'Untitled';
  title.setAttribute('title', tabNode.title || tabNode.url || 'Untitled');
  tabContent.appendChild(title);
  
  // Tab indicators (pinned, loading)
  const indicators = document.createElement('div');
  indicators.className = 'tab-indicators';
  
  if (tabNode.isPinned) {
    const pinnedIndicator = document.createElement('div');
    pinnedIndicator.className = 'pinned-indicator';
    pinnedIndicator.setAttribute('title', 'Pinned tab');
    pinnedIndicator.setAttribute('aria-label', 'Pinned tab');
    indicators.appendChild(pinnedIndicator);
  }
  
  if (tabNode.isLoading) {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.setAttribute('title', 'Loading...');
    loadingIndicator.setAttribute('aria-label', 'Loading');
    indicators.appendChild(loadingIndicator);
  }
  
  tabContent.appendChild(indicators);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('title', 'Close tab');
  closeBtn.setAttribute('aria-label', `Close ${tabNode.title || 'tab'}`);
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    handleCloseTab(tabNode.id);
  };
  tabContent.appendChild(closeBtn);
  
  // Event handlers
  tabContent.onclick = (e) => {
    if (!isRestricted) {
      handleTabClick(tabNode.id);
    }
  };
  
  tabContent.oncontextmenu = (e) => {
    e.preventDefault();
    showContextMenu(e, tabNode);
  };
  
  // Keyboard event handlers
  tabElement.onkeydown = (e) => {
    handleKeyboardNavigation(e, tabNode);
  };
  
  tabElement.appendChild(tabContent);
  container.appendChild(tabElement);
  
  // Render children
  if (tabNode.children && tabNode.children.length > 0) {
    // Update ancestor lines - current level should show vertical line if not last
    const newAncestorLines = [...ancestorLines];
    newAncestorLines[depth] = !isLast;
    
    tabNode.children.forEach((child, index) => {
      const isLastChild = index === tabNode.children.length - 1;
      renderTabNode(container, child, depth + 1, isLastChild, newAncestorLines);
    });
  }
}

// Tab interaction handlers
async function handleTabClick(tabId) {
  try {
    await chrome.runtime.sendMessage({
      type: 'SWITCH_TO_TAB',
      tabId: tabId
    });
    
    // Auto-close popup after tab selection
    setTimeout(() => {
      if (window.close) {
        window.close();
      }
    }, 100);
  } catch (error) {
    console.error('Error switching to tab:', error);
  }
}

async function handleCloseTab(tabId) {
  try {
    await chrome.runtime.sendMessage({
      type: 'CLOSE_TAB',
      tabId: tabId
    });
  } catch (error) {
    console.error('Error closing tab:', error);
  }
}

// Quick action button handlers
function setupQuickActions() {
  if (saveCabinetBtn) {
    saveCabinetBtn.addEventListener('click', async () => {
      try {
        const cabinetName = prompt('Enter a name for this Cabinet:');
        if (cabinetName && cabinetName.trim()) {
          await chrome.runtime.sendMessage({
            type: 'SAVE_CABINET',
            name: cabinetName.trim(),
            windowId: currentWindowId
          });
          
          // Show success feedback
          saveCabinetBtn.textContent = 'Saved!';
          setTimeout(() => {
            saveCabinetBtn.textContent = 'Save Cabinet';
          }, 1500);
        }
      } catch (error) {
        console.error('Error saving cabinet:', error);
        saveCabinetBtn.textContent = 'Error';
        setTimeout(() => {
          saveCabinetBtn.textContent = 'Save Cabinet';
        }, 1500);
      }
    });
  }
  
  if (manageCabinetsBtn) {
    manageCabinetsBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'cabinets.html' });
      if (window.close) {
        window.close();
      }
    });
  }
}

// Keyboard navigation
function setupKeyboardNavigation() {
  tabTreeElement.addEventListener('keydown', (e) => {
    const focusedElement = document.activeElement;
    if (!focusedElement || !focusedElement.classList.contains('tree-node')) {
      return;
    }
    
    const tabId = parseInt(focusedElement.getAttribute('data-tab-id'));
    handleKeyboardNavigation(e, { id: tabId });
  });
}

function handleKeyboardNavigation(e, tabNode) {
  const currentElement = e.target.closest('.tree-node');
  if (!currentElement) return;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      focusNextTab(currentElement);
      break;
    case 'ArrowUp':
      e.preventDefault();
      focusPreviousTab(currentElement);
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      handleTabClick(tabNode.id);
      break;
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      handleCloseTab(tabNode.id);
      break;
    case 'Escape':
      e.preventDefault();
      hideContextMenu();
      // Close popup on escape
      if (window.close) {
        window.close();
      }
      break;
  }
}

function focusNextTab(currentElement) {
  const allTabs = Array.from(tabTreeElement.querySelectorAll('.tree-node'));
  const currentIndex = allTabs.indexOf(currentElement);
  const nextTab = allTabs[currentIndex + 1];
  
  if (nextTab) {
    currentElement.setAttribute('tabindex', '-1');
    nextTab.setAttribute('tabindex', '0');
    nextTab.focus();
  }
}

function focusPreviousTab(currentElement) {
  const allTabs = Array.from(tabTreeElement.querySelectorAll('.tree-node'));
  const currentIndex = allTabs.indexOf(currentElement);
  const previousTab = allTabs[currentIndex - 1];
  
  if (previousTab) {
    currentElement.setAttribute('tabindex', '-1');
    previousTab.setAttribute('tabindex', '0');
    previousTab.focus();
  }
}

// Context menu functionality
function setupContextMenu() {
  // Hide context menu when clicking elsewhere
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.tree-node')) {
      hideContextMenu();
    }
  });
}

function showContextMenu(e, tabNode) {
  selectedTabId = tabNode.id;
  
  // Create context menu items
  const menuItems = [
    {
      label: 'Switch to Tab',
      action: () => handleTabClick(tabNode.id),
      disabled: tabNode.isActive
    },
    {
      label: 'Close Tab',
      action: () => handleCloseTab(tabNode.id),
      disabled: false
    },
    {
      label: 'Close Children',
      action: () => handleCascadingDelete(tabNode.id),
      disabled: !tabNode.children || tabNode.children.length === 0
    }
  ];
  
  // Clear existing menu items
  contextMenuElement.innerHTML = '';
  
  // Add menu items
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    if (item.disabled) {
      menuItem.classList.add('disabled');
    }
    menuItem.textContent = item.label;
    menuItem.setAttribute('role', 'menuitem');
    menuItem.setAttribute('tabindex', item.disabled ? '-1' : '0');
    
    if (!item.disabled) {
      menuItem.onclick = () => {
        item.action();
        hideContextMenu();
      };
    }
    
    contextMenuElement.appendChild(menuItem);
  });
  
  // Position and show menu
  contextMenuElement.style.left = `${e.pageX}px`;
  contextMenuElement.style.top = `${e.pageY}px`;
  contextMenuElement.classList.remove('hidden');
  contextMenuElement.setAttribute('aria-hidden', 'false');
  
  // Focus first enabled item
  const firstEnabledItem = contextMenuElement.querySelector('.context-menu-item:not(.disabled)');
  if (firstEnabledItem) {
    firstEnabledItem.focus();
  }
}

function hideContextMenu() {
  contextMenuElement.classList.add('hidden');
  contextMenuElement.setAttribute('aria-hidden', 'true');
  selectedTabId = null;
}

async function handleCascadingDelete(tabId) {
  try {
    await chrome.runtime.sendMessage({
      type: 'CASCADING_DELETE',
      tabId: tabId
    });
  } catch (error) {
    console.error('Error performing cascading delete:', error);
  }
}

// Listen for hierarchy updates from background script
chrome.runtime.onMessage.addListener((message) => {
  try {
    console.log('Message received:', message.type);
    
    // Only handle messages for our window
    if (message.windowId && message.windowId !== currentWindowId) {
      return;
    }
    
    if (message.type === 'HIERARCHY_UPDATED') {
      hierarchyState = message.hierarchyState;
      renderHierarchy();
    }
  } catch (error) {
    console.error('Message handler error:', error);
  }
});

// Handle popup lifecycle - refresh data when popup is opened
window.addEventListener('focus', async () => {
  try {
    // Refresh hierarchy state when popup gains focus
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_HIERARCHY_STATE',
      windowId: currentWindowId 
    });
    
    if (response.success) {
      hierarchyState = response.hierarchyState;
      renderHierarchy();
    }
  } catch (error) {
    console.error('Error refreshing on focus:', error);
  }
});

// Initialize the popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
