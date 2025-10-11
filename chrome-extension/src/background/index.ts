import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

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
