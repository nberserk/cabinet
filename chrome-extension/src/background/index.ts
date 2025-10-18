import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import type { Cabinet } from '@extension/shared';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Handle extension icon clicks to open side panel
chrome.action.onClicked.addListener(async tab => {
  console.log('Extension icon clicked, opening side panel');

  try {
    // Open the side panel for the current window
    await chrome.sidePanel.open({
      windowId: tab.windowId,
    });

    console.log('Side panel opened successfully');
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Set up side panel to open automatically on icon click
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');

  // Enable automatic side panel opening on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle cabinet restoration requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'restoreCabinet') {
    restoreCabinet(request.cabinet)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  return false; // Don't keep channel open for other messages
});

const restoreCabinet = async (cabinet: Cabinet): Promise<void> => {
  try {
    // Create new window with the first tab
    const firstTab = cabinet.tabs[0];
    if (!firstTab) {
      throw new Error('Cabinet has no tabs');
    }

    const newWindow = await chrome.windows.create({
      url: firstTab.url,
      focused: true,
    });

    if (!newWindow.id) {
      throw new Error('Failed to create new window');
    }

    // Create remaining tabs
    const tabPromises = cabinet.tabs.slice(1).map(async tab =>
      chrome.tabs.create({
        windowId: newWindow.id,
        url: tab.url,
        active: false,
      }),
    );

    await Promise.all(tabPromises);

    // Activate the originally active tab if it exists
    const tabs = await chrome.tabs.query({ windowId: newWindow.id });
    const activeTabIndex = cabinet.tabs.findIndex(tab => tab.id === cabinet.activeTabId);
    if (activeTabIndex >= 0 && tabs[activeTabIndex]) {
      await chrome.tabs.update(tabs[activeTabIndex].id!, { active: true });
    }

    console.log(`Successfully restored cabinet: ${cabinet.name}`);
  } catch (error) {
    console.error('Failed to restore cabinet:', error);
    throw error;
  }
};
