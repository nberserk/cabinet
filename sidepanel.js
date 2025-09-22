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
let openCabinetsBtn;

// Initialize DOM elements
function initializeElements() {
    tabTreeElement = document.getElementById('tab-tree');
    loadingStateElement = document.getElementById('loading-state');
    errorStateElement = document.getElementById('error-state');
    emptyStateElement = document.getElementById('empty-state');
    contextMenuElement = document.getElementById('context-menu');
    openCabinetsBtn = document.getElementById('open-cabinets-btn');

    if (!tabTreeElement || !loadingStateElement || !errorStateElement || !emptyStateElement ||
        !contextMenuElement || !openCabinetsBtn) {
        throw new Error('Required DOM elements not found');
    }
}

// Initialize the side panel
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

        console.log('🚀 Side panel initializing for window:', currentWindowId);

        // Notify background script that side panel is opened
        try {
            await chrome.runtime.sendMessage({
                type: 'SIDE_PANEL_OPENED',
                windowId: currentWindowId
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
            console.log(`🔍 Requesting hierarchy state for window ${currentWindowId} (attempt ${attempts}/${maxAttempts})`);

            try {
                response = await chrome.runtime.sendMessage({
                    type: 'GET_HIERARCHY_STATE',
                    windowId: currentWindowId
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
            hierarchyState = response.hierarchyState;
            console.log('✅ Received hierarchy state with', hierarchyState?.tabCount || 0, 'tabs');
            console.log('📊 Root tabs:', hierarchyState?.rootTabs?.length || 0);
            renderHierarchy();
        } else {
            console.log('⚠️ GET_HIERARCHY_STATE failed after retries, trying legacy GET_TREE message...');

            try {
                const legacyResponse = await chrome.runtime.sendMessage({ type: 'GET_TREE' });
                console.log('📥 Legacy response:', legacyResponse);

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
                    console.log('📝 Using legacy tree format, showing empty state');
                } else {
                    throw new Error('Legacy GET_TREE also failed');
                }
            } catch (legacyError) {
                const errorMsg = response?.error || 'Failed to get hierarchy state from background script';
                console.error('❌ All hierarchy requests failed:', errorMsg);
                throw new Error(errorMsg);
            }
        }

        // Set up keyboard navigation
        setupKeyboardNavigation();

        // Set up context menu
        setupContextMenu();

        // Set up Cabinet management button
        setupCabinetButton();

        hideLoadingState();

    } catch (error) {
        console.error('❌ Init error:', error);
        showErrorState(`Failed to get hierarchy state: ${error.message}`);
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

    // Create main tab element
    const tabElement = document.createElement('div');
    tabElement.className = 'tree-node';
    tabElement.setAttribute('data-tab-id', tabNode.id);
    tabElement.setAttribute('data-level', depth); // Add level for gradient styling
    tabElement.setAttribute('role', 'treeitem');
    tabElement.setAttribute('aria-level', depth + 1);
    tabElement.setAttribute('aria-expanded', tabNode.children.length > 0 ? 'true' : 'false');
    tabElement.setAttribute('tabindex', '-1');

    if (tabNode.isActive) {
        tabElement.classList.add('active');
        tabElement.setAttribute('aria-selected', 'true');
    }

    // Tree lines are handled by CSS gradients in Option 3
    // No need to create tree line elements

    // Tab content wrapper
    const tabContent = document.createElement('div');
    tabContent.className = 'tree-content';

    // Add padding based on hierarchy depth using Tailwind classes
    const paddingClasses = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];
    const paddingClass = paddingClasses[Math.min(depth, paddingClasses.length - 1)];
    tabContent.classList.add(paddingClass);

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

    // Depth indicator
    const depthIndicator = document.createElement('span');
    depthIndicator.className = 'text-xs text-gray-400 ml-2 font-mono';
    depthIndicator.textContent = `L${depth}`;
    depthIndicator.setAttribute('title', `Hierarchy level: ${depth}`);
    tabContent.appendChild(depthIndicator);

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
    closeBtn.className = 'w-4 h-4 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded-sm border-none cursor-pointer ml-1 opacity-0 transition-all duration-200 flex-shrink-0 leading-none';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('title', 'Close tab');
    closeBtn.setAttribute('aria-label', `Close ${tabNode.title || 'tab'}`);
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        handleCloseTab(tabNode.id);
    };
    tabContent.appendChild(closeBtn);

    // Event handlers - use mousedown for faster response
    tabContent.onmousedown = (e) => {
        // Only handle left mouse button
        if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            handleTabClick(tabNode.id);
        }
    };

    // Touch support for mobile/tablet
    tabContent.ontouchstart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTabClick(tabNode.id);
    };

    // Prevent click event to avoid double firing
    tabContent.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Add visual feedback classes
    tabContent.onmouseenter = () => {
        tabContent.classList.add('hover');
    };

    tabContent.onmouseleave = () => {
        tabContent.classList.remove('hover');
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
        console.log('Switching to tab:', tabId);

        // Immediate visual feedback - update UI optimistically
        updateActiveStateOptimistically(tabId);

        // Try direct Chrome API first for immediate response
        try {
            await chrome.tabs.update(tabId, { active: true });
            console.log('Direct tab switch successful');
        } catch (directError) {
            console.log('Direct switch failed, trying via background:', directError);
            // Fallback to background script
            const response = await chrome.runtime.sendMessage({
                type: 'SWITCH_TO_TAB',
                tabId: tabId
            });
            console.log('Tab switch response:', response);
        }
    } catch (error) {
        console.error('Error switching to tab:', error);
        // Revert optimistic update on error
        renderHierarchy();
    }
}

// Optimistic UI update for immediate visual feedback
function updateActiveStateOptimistically(tabId) {
    // Remove active class from all tabs
    document.querySelectorAll('.tree-node.active').forEach(node => {
        node.classList.remove('active');
        node.setAttribute('aria-selected', 'false');
    });

    // Add active class to clicked tab
    const clickedTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
        clickedTab.setAttribute('aria-selected', 'true');
    }

    // Update hierarchy state
    if (hierarchyState && hierarchyState.rootTabs) {
        updateTabActiveInState(hierarchyState.rootTabs, tabId);
        hierarchyState.activeTabId = tabId;
    }
}

// Helper to update active state in hierarchy data
function updateTabActiveInState(tabs, activeTabId) {
    tabs.forEach(tab => {
        tab.isActive = tab.id === activeTabId;
        if (tab.children) {
            updateTabActiveInState(tab.children, activeTabId);
        }
    });
}

async function handleCloseTab(tabId) {
    try {
        // Check if this tab has children - if so, use cascading delete
        const tabNode = findTabNodeById(tabId);
        if (tabNode && tabNode.children && tabNode.children.length > 0) {
            await chrome.runtime.sendMessage({
                type: 'CASCADING_DELETE',
                tabId: tabId
            });
        } else {
            await chrome.runtime.sendMessage({
                type: 'CLOSE_TAB',
                tabId: tabId
            });
        }
    } catch (error) {
        console.error('Error closing tab:', error);
    }
}

// Helper function to find tab node by ID in the hierarchy
function findTabNodeById(tabId) {
    if (!hierarchyState || !hierarchyState.rootTabs) return null;

    function searchInTabs(tabs) {
        for (const tab of tabs) {
            if (tab.id === tabId) return tab;
            if (tab.children) {
                const found = searchInTabs(tab.children);
                if (found) return found;
            }
        }
        return null;
    }

    return searchInTabs(hierarchyState.rootTabs);
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

        switch (message.type) {
            case 'TAB_ADDED':
                handleTabAdded(message.tab, message.parentId);
                break;
            case 'TAB_REMOVED':
                handleTabRemoved(message.tabId);
                break;
            case 'TAB_UPDATED':
                handleTabUpdated(message.tab);
                break;
            case 'TAB_ACTIVATED':
                handleTabActivated(message.tabId);
                break;
            case 'HIERARCHY_UPDATED':
                // Fallback to full re-render for complex changes
                hierarchyState = message.hierarchyState;
                renderHierarchy();
                break;
        }
    } catch (error) {
        console.error('Message handler error:', error);
    }
});

// Handle window focus changes
window.addEventListener('focus', async () => {
    try {
        // Refresh hierarchy state when window gains focus
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

// Cabinet Management Button
function setupCabinetButton() {
    openCabinetsBtn.addEventListener('click', openCabinetManagementPage);
}

function openCabinetManagementPage() {
    // Open Cabinet management page in a new tab
    chrome.tabs.create({
        url: chrome.runtime.getURL('cabinets.html')
    });
}

// Notify background when side panel is closed
window.addEventListener('beforeunload', () => {
    if (currentWindowId) {
        try {
            chrome.runtime.sendMessage({
                type: 'SIDE_PANEL_CLOSED',
                windowId: currentWindowId
            });
            console.log('📱 Notified background: side panel closed');
        } catch (error) {
            console.warn('⚠️ Failed to notify side panel closed:', error);
        }
    }
});

// Initialize the side panel when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
