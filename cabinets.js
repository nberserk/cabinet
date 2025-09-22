/**
 * Cabinet Management Page - Clean implementation
 */

// State
let cabinets = [];
let filteredCabinets = [];
let currentWindowId = null;

// DOM Elements
let elements = {};

// Initialize the page
async function init() {
    try {
        console.log('🚀 Initializing Cabinet Management page...');
        
        initializeElements();
        setupEventListeners();
        showLoadingState();
        
        // Get current window ID
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentWindowId = currentTab?.windowId;
        
        // Load data
        await Promise.all([
            loadCabinets(),
            updateStorageInfo()
        ]);
        
        hideLoadingState();
        console.log('✅ Cabinet Management page initialized');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        hideLoadingState();
        showError('Failed to initialize: ' + error.message);
    }
}

// Initialize DOM elements
function initializeElements() {
    const elementIds = [
        'cabinet-list', 'search-cabinets', 'sort-cabinets', 'save-current-cabinet',
        'refresh-cabinets', 'back-to-hierarchy', 'save-cabinet-modal', 'cabinet-name-input',
        'context-menu', 'storage-stats', 'empty-state', 'loading-state', 'save-first-cabinet',
        'cancel-save-cabinet', 'confirm-save-cabinet', 'close-modal'
    ];
    
    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
        if (!elements[id]) {
            throw new Error(`Element with id '${id}' not found`);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements['back-to-hierarchy'].addEventListener('click', () => window.close());
    
    // Cabinet operations
    elements['save-current-cabinet'].addEventListener('click', showSaveCabinetModal);
    elements['save-first-cabinet'].addEventListener('click', showSaveCabinetModal);
    elements['refresh-cabinets'].addEventListener('click', refreshData);
    
    // Search and filter
    elements['search-cabinets'].addEventListener('input', handleSearch);
    elements['sort-cabinets'].addEventListener('change', handleSort);
    
    // Modal
    elements['cancel-save-cabinet'].addEventListener('click', hideSaveCabinetModal);
    elements['confirm-save-cabinet'].addEventListener('click', handleSaveCabinet);
    elements['close-modal'].addEventListener('click', hideSaveCabinetModal);
    elements['save-cabinet-modal'].addEventListener('click', (e) => {
        if (e.target === elements['save-cabinet-modal']) hideSaveCabinetModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('click', hideContextMenu);
}

// Load cabinets from storage
async function loadCabinets() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'LIST_CABINETS' });
        
        if (response?.success) {
            cabinets = response.data || [];
            filteredCabinets = [...cabinets];
            await renderCabinets(); // Now async to handle preview loading
            console.log('📋 Loaded', cabinets.length, 'cabinets with detailed previews');
        } else {
            throw new Error(response?.error || 'Failed to load cabinets');
        }
    } catch (error) {
        console.error('Error loading cabinets:', error);
        showError('Failed to load cabinets: ' + error.message);
    }
}

// Update storage info
async function updateStorageInfo() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STORAGE_INFO' });
        
        if (response?.success) {
            const { used, available, cabinetCount, isNearLimit } = response.data;
            const usedMB = (used / (1024 * 1024)).toFixed(1);
            const availableMB = (available / (1024 * 1024)).toFixed(1);
            
            elements['storage-stats'].innerHTML = `
                <div class="text-sm font-medium ${isNearLimit ? 'text-orange-600' : 'text-gray-900'}">
                    ${cabinetCount} Cabinets • ${usedMB}MB used
                </div>
                <div class="text-xs text-gray-500">
                    ${availableMB}MB available
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating storage info:', error);
        elements['storage-stats'].textContent = 'Storage info unavailable';
    }
}

// Render cabinet list with always-visible details
async function renderCabinets() {
    const container = elements['cabinet-list'];
    container.innerHTML = '';
    
    if (filteredCabinets.length === 0) {
        if (cabinets.length === 0) {
            showEmptyState();
        } else {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">No cabinets match your search criteria</p>
                </div>
            `;
        }
        return;
    }
    
    hideEmptyState();
    
    // Create all cabinet cards first
    filteredCabinets.forEach(cabinet => {
        const cabinetCard = createCabinetCard(cabinet);
        container.appendChild(cabinetCard);
    });
    
    // Then load all previews automatically
    await loadAllCabinetPreviews();
}

// Create cabinet card element
function createCabinetCard(cabinet) {
    const card = document.createElement('div');
    card.className = 'cabinet-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer';
    card.dataset.cabinetId = cabinet.id;
    
    const createdDate = new Date(cabinet.createdAt).toLocaleDateString();
    const tabCount = cabinet.metadata?.tabCount || 0;
    
    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
                <h3 class="text-lg font-medium text-gray-900 truncate mb-2" title="${escapeHtml(cabinet.name)}">
                    ${escapeHtml(cabinet.name)}
                </h3>
                <div class="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        ${tabCount} tabs
                    </span>
                    <span class="flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0l-2 13a2 2 0 002 2h6a2 2 0 002-2l-2-13"/>
                        </svg>
                        Created ${createdDate}
                    </span>
                </div>
                <div class="bg-gray-50 rounded-md p-3">
                    <div class="text-xs font-medium text-gray-700 mb-1">Preview:</div>
                    <div class="text-xs text-gray-600" id="preview-${cabinet.id}">
                        Loading preview...
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
                <button class="restore-btn px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors" 
                        title="Restore this Cabinet">
                    Restore
                </button>
                <button class="more-btn p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" 
                        title="More options">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const restoreBtn = card.querySelector('.restore-btn');
    const moreBtn = card.querySelector('.more-btn');
    
    restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRestoreCabinet(cabinet.id);
    });
    
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showContextMenu(e, cabinet);
    });
    
    // Preview will be loaded automatically by loadAllCabinetPreviews()
    
    return card;
}

// Load cabinet preview with always-visible details
async function loadCabinetPreview(cabinetId) {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_CABINET_PREVIEW',
            cabinetId: cabinetId
        });
        
        if (response?.success) {
            const preview = response.data;
            const previewElement = document.getElementById(`preview-${cabinetId}`);
            
            if (previewElement && preview.tabSummary) {
                const { totalTabs, rootTabs, maxDepth, domains } = preview.tabSummary;
                
                // Create always-visible preview with summary and detailed view
                previewElement.innerHTML = `
                    <div class="mb-3">
                        <div class="text-xs text-gray-700">${rootTabs} root tabs, ${maxDepth} levels deep</div>
                        <div class="text-xs text-gray-500 mt-1">Domains: ${domains.slice(0, 3).join(', ')}${domains.length > 3 ? '...' : ''}</div>
                    </div>
                    <div id="detailed-preview-${cabinetId}" class="border-t border-gray-200 pt-3">
                        <!-- Detailed preview will be loaded here -->
                    </div>
                `;
                
                // Automatically load detailed preview
                await loadDetailedPreview(cabinetId);
            }
        }
    } catch (error) {
        console.error('Error loading preview:', error);
        const previewElement = document.getElementById(`preview-${cabinetId}`);
        if (previewElement) {
            previewElement.textContent = 'Preview unavailable';
        }
    }
}

// Load detailed preview automatically
async function loadDetailedPreview(cabinetId) {
    const detailedPreview = document.getElementById(`detailed-preview-${cabinetId}`);
    
    if (!detailedPreview) return;
    
    try {
        // Load full cabinet data
        const response = await chrome.runtime.sendMessage({
            type: 'GET_CABINET',
            cabinetId: cabinetId
        });
        
        if (response?.success && response.data) {
            const cabinet = response.data;
            renderDetailedCabinetPreview(detailedPreview, cabinet.tabs);
        } else {
            detailedPreview.innerHTML = '<div class="text-red-600 text-xs">Failed to load cabinet details</div>';
        }
    } catch (error) {
        console.error('Error loading detailed preview:', error);
        detailedPreview.innerHTML = '<div class="text-red-600 text-xs">Error loading details</div>';
    }
}

// Load all cabinet previews efficiently
async function loadAllCabinetPreviews() {
    const cabinetCards = document.querySelectorAll('[data-cabinet-id]');
    const loadPromises = [];
    
    cabinetCards.forEach(card => {
        const cabinetId = card.dataset.cabinetId;
        if (cabinetId) {
            loadPromises.push(loadCabinetPreview(cabinetId));
        }
    });
    
    // Load all previews in parallel for better performance
    try {
        await Promise.all(loadPromises);
        console.log('✅ All cabinet previews loaded');
    } catch (error) {
        console.error('❌ Error loading some cabinet previews:', error);
    }
}

// Render detailed cabinet preview with hierarchical structure
function renderDetailedCabinetPreview(container, tabs) {
    if (!tabs || tabs.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-xs">No tabs in this cabinet</div>';
        return;
    }
    
    // Build hierarchy from flat tab array
    const tabMap = new Map();
    const rootTabs = [];
    
    // First pass: create tab map
    tabs.forEach(tab => {
        tabMap.set(tab.id, { ...tab, children: [] });
    });
    
    // Second pass: build parent-child relationships
    tabs.forEach(tab => {
        const tabNode = tabMap.get(tab.id);
        if (tab.parentId && tabMap.has(tab.parentId)) {
            const parent = tabMap.get(tab.parentId);
            parent.children.push(tabNode);
        } else {
            rootTabs.push(tabNode);
        }
    });
    
    // Create compact preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'cabinet-preview-tree compact max-h-48 overflow-y-auto';
    
    // Render root tabs
    rootTabs.forEach((tab, index) => {
        const isLast = index === rootTabs.length - 1;
        renderTabNodeInPreview(previewContainer, tab, 0, isLast, []);
    });
    
    container.innerHTML = '';
    container.appendChild(previewContainer);
}

// Render individual tab node in preview using sidepanel logic
function renderTabNodeInPreview(container, tabNode, depth, isLast = false, ancestorLines = []) {
    if (!tabNode || !tabNode.id) {
        console.warn('Invalid tab node:', tabNode);
        return;
    }
    
    // Ensure children array exists
    if (!tabNode.children) {
        tabNode.children = [];
    }
    
    // Create main tab element (same as sidepanel)
    const tabElement = document.createElement('div');
    tabElement.className = 'tree-node';
    tabElement.setAttribute('data-tab-id', tabNode.id);
    tabElement.setAttribute('data-level', depth);
    tabElement.setAttribute('role', 'treeitem');
    tabElement.setAttribute('aria-level', depth + 1);
    tabElement.setAttribute('aria-expanded', tabNode.children.length > 0 ? 'true' : 'false');
    tabElement.setAttribute('tabindex', '-1');
    
    if (tabNode.isActive) {
        tabElement.classList.add('active');
        tabElement.setAttribute('aria-selected', 'true');
    }
    
    // Tab content wrapper (same as sidepanel)
    const tabContent = document.createElement('div');
    tabContent.className = 'tree-content';
    
    // Add padding based on hierarchy depth using Tailwind classes (same as sidepanel)
    const paddingClasses = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];
    const paddingClass = paddingClasses[Math.min(depth, paddingClasses.length - 1)];
    tabContent.classList.add(paddingClass);
    
    // Favicon (same as sidepanel)
    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tabNode.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
    favicon.alt = '';
    favicon.setAttribute('aria-hidden', 'true');
    tabContent.appendChild(favicon);
    
    // Title (same as sidepanel)
    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tabNode.title || tabNode.url || 'Untitled';
    title.setAttribute('title', tabNode.title || tabNode.url || 'Untitled');
    tabContent.appendChild(title);
    
    // Depth indicator (same as sidepanel)
    const depthIndicator = document.createElement('span');
    depthIndicator.className = 'text-xs text-gray-400 ml-2 font-mono';
    depthIndicator.textContent = `L${depth}`;
    depthIndicator.setAttribute('title', `Hierarchy level: ${depth}`);
    tabContent.appendChild(depthIndicator);
    
    // Tab indicators (same as sidepanel)
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
    
    // No close button for cabinet preview (read-only)
    // No event handlers for cabinet preview (read-only)
    
    tabElement.appendChild(tabContent);
    container.appendChild(tabElement);
    
    // Render children (same as sidepanel)
    if (tabNode.children && tabNode.children.length > 0) {
        const newAncestorLines = [...ancestorLines];
        newAncestorLines[depth] = !isLast;
        
        tabNode.children.forEach((child, index) => {
            const isLastChild = index === tabNode.children.length - 1;
            renderTabNodeInPreview(container, child, depth + 1, isLastChild, newAncestorLines);
        });
    }
}

// Handle search
async function handleSearch() {
    const query = elements['search-cabinets'].value.toLowerCase().trim();
    
    if (!query) {
        filteredCabinets = [...cabinets];
    } else {
        filteredCabinets = cabinets.filter(cabinet => 
            cabinet.name.toLowerCase().includes(query)
        );
    }
    
    await handleSort();
}

// Handle sort
async function handleSort() {
    const sortBy = elements['sort-cabinets'].value;
    
    filteredCabinets.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'oldest':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'name':
                return a.name.localeCompare(b.name);
            case 'tabs':
                return (b.metadata?.tabCount || 0) - (a.metadata?.tabCount || 0);
            default:
                return 0;
        }
    });
    
    await renderCabinets();
}

// Show save cabinet modal
function showSaveCabinetModal() {
    elements['save-cabinet-modal'].classList.remove('hidden');
    elements['cabinet-name-input'].value = '';
    elements['cabinet-name-input'].focus();
}

// Hide save cabinet modal
function hideSaveCabinetModal() {
    elements['save-cabinet-modal'].classList.add('hidden');
    elements['cabinet-name-input'].value = '';
}

// Handle save cabinet
async function handleSaveCabinet() {
    const name = elements['cabinet-name-input'].value.trim();
    
    if (!name) {
        alert('Please enter a cabinet name.');
        elements['cabinet-name-input'].focus();
        return;
    }
    
    if (name.length > 100) {
        alert('Cabinet name cannot exceed 100 characters.');
        elements['cabinet-name-input'].focus();
        return;
    }
    
    if (cabinets.some(cabinet => cabinet.name.toLowerCase() === name.toLowerCase())) {
        alert('A Cabinet with this name already exists. Please choose a different name.');
        elements['cabinet-name-input'].focus();
        return;
    }
    
    try {
        // Get current hierarchy
        const hierarchyResponse = await chrome.runtime.sendMessage({
            type: 'GET_HIERARCHY_STATE',
            windowId: currentWindowId
        });
        
        if (!hierarchyResponse?.success) {
            alert('Failed to get current tab hierarchy. Please try again.');
            return;
        }
        
        // Save cabinet
        const response = await chrome.runtime.sendMessage({
            type: 'SAVE_CABINET',
            name: name,
            hierarchyState: hierarchyResponse.hierarchyState
        });
        
        if (response?.success) {
            hideSaveCabinetModal();
            await refreshData();
            console.log('✅ Cabinet saved:', response.data);
        } else {
            alert(`Failed to save Cabinet: ${response?.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error saving cabinet:', error);
        alert(`Failed to save Cabinet: ${error.message}`);
    }
}

// Handle restore cabinet
async function handleRestoreCabinet(cabinetId) {
    const cabinet = cabinets.find(c => c.id === cabinetId);
    if (!cabinet) return;
    
    const tabCount = cabinet.metadata?.tabCount || 0;
    if (!confirm(`This will close all current tabs and restore "${cabinet.name}" (${tabCount} tabs). Continue?`)) {
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'RESTORE_CABINET',
            cabinetId: cabinetId
        });
        
        if (response?.success) {
            const { summary } = response.data;
            console.log('✅ Cabinet restored:', response.data);
            
            if (summary.failedTabs > 0) {
                alert(`Cabinet restored with ${summary.successfulTabs} tabs. ${summary.failedTabs} tabs could not be restored due to browser restrictions.`);
            } else {
                setTimeout(() => window.close(), 1000);
            }
        } else {
            alert(`Failed to restore Cabinet: ${response?.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error restoring cabinet:', error);
        alert(`Failed to restore Cabinet: ${error.message}`);
    }
}

// Show context menu
function showContextMenu(event, cabinet) {
    const menu = elements['context-menu'];
    
    const menuItems = [
        { label: 'Restore Cabinet', action: () => handleRestoreCabinet(cabinet.id) },
        { label: 'Rename Cabinet', action: () => handleRenameCabinet(cabinet.id) },
        { label: 'Delete Cabinet', action: () => handleDeleteCabinet(cabinet.id), danger: true }
    ];
    
    menu.innerHTML = '';
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = `px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`;
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
            item.action();
            hideContextMenu();
        };
        menu.appendChild(menuItem);
    });
    
    // Position menu
    const x = Math.min(event.pageX, window.innerWidth - 200);
    const y = Math.min(event.pageY, window.innerHeight - (menuItems.length * 40));
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');
}

// Hide context menu
function hideContextMenu() {
    elements['context-menu'].classList.add('hidden');
}

// Handle rename cabinet
async function handleRenameCabinet(cabinetId) {
    const cabinet = cabinets.find(c => c.id === cabinetId);
    if (!cabinet) return;
    
    const newName = prompt('Enter new cabinet name:', cabinet.name);
    if (!newName || newName.trim() === cabinet.name) return;
    
    const trimmedName = newName.trim();
    if (trimmedName.length === 0 || trimmedName.length > 100) {
        alert('Cabinet name must be between 1 and 100 characters.');
        return;
    }
    
    if (cabinets.some(c => c.id !== cabinetId && c.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert('A Cabinet with this name already exists.');
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'RENAME_CABINET',
            cabinetId: cabinetId,
            newName: trimmedName
        });
        
        if (response?.success) {
            await refreshData();
            console.log('✅ Cabinet renamed');
        } else {
            alert(`Failed to rename Cabinet: ${response?.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error renaming cabinet:', error);
        alert(`Failed to rename Cabinet: ${error.message}`);
    }
}

// Handle delete cabinet
async function handleDeleteCabinet(cabinetId) {
    const cabinet = cabinets.find(c => c.id === cabinetId);
    if (!cabinet) return;
    
    if (!confirm(`Are you sure you want to delete "${cabinet.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'DELETE_CABINET',
            cabinetId: cabinetId
        });
        
        if (response?.success) {
            await refreshData();
            console.log('✅ Cabinet deleted');
        } else {
            alert(`Failed to delete Cabinet: ${response?.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error deleting cabinet:', error);
        alert(`Failed to delete Cabinet: ${error.message}`);
    }
}

// Handle keyboard shortcuts
function handleKeyboard(e) {
    if (e.key === 'Escape') {
        hideSaveCabinetModal();
        hideContextMenu();
    } else if (e.key === 'Enter' && !elements['save-cabinet-modal'].classList.contains('hidden')) {
        handleSaveCabinet();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        showSaveCabinetModal();
    }
}

// Refresh all data
async function refreshData() {
    showLoadingState();
    await Promise.all([loadCabinets(), updateStorageInfo()]);
    hideLoadingState();
}

// State management
function showLoadingState() {
    elements['loading-state'].classList.remove('hidden');
    elements['cabinet-list'].classList.add('hidden');
    elements['empty-state'].classList.add('hidden');
}

function hideLoadingState() {
    elements['loading-state'].classList.add('hidden');
    elements['cabinet-list'].classList.remove('hidden');
}

function showEmptyState() {
    elements['empty-state'].classList.remove('hidden');
    elements['cabinet-list'].classList.add('hidden');
}

function hideEmptyState() {
    elements['empty-state'].classList.add('hidden');
    elements['cabinet-list'].classList.remove('hidden');
}

function showError(message) {
    console.error('Cabinet Management Error:', message);
    alert(message);
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}