import { useState, useEffect } from 'react';
import type { TabUI } from '@extension/shared';

export const TabManager = () => {
    const [tabs, setTabs] = useState<TabUI[]>([]);
    const [loading, setLoading] = useState(true);

    // Convert chrome.tabs.Tab to our TabUI interface and build hierarchy
    const buildTabHierarchy = (chromeTabs: chrome.tabs.Tab[]): TabUI[] => {
        const tabMap = new Map<number, TabUI>();
        const rootTabs: TabUI[] = [];

        // Find and log active tab (Chrome's active becomes our highlighted)
        const activeTab = chromeTabs.find(chromeTab => chromeTab.highlighted);
        if (activeTab) {
            console.log('🎯 Active tab (will be highlighted):', {
                id: activeTab.id,
                title: activeTab.title || 'Untitled',
                url: activeTab.url,
                parentTabId: activeTab.openerTabId || 'null'
            });
        } else {
            console.log('⚠️ No highlighted tab found in current window');
        }

        // First pass: create all tab objects
        chromeTabs.forEach(chromeTab => {
            if (chromeTab.id) {
                const tab: TabUI = {
                    id: chromeTab.id,
                    title: chromeTab.title || 'Untitled',
                    url: chromeTab.url || '',
                    favIconUrl: chromeTab.favIconUrl,
                    highlighted: chromeTab.highlighted || false,
                    openerId: chromeTab.openerTabId,
                    level: 0,
                    children: []
                };
                tabMap.set(chromeTab.id, tab);
            }
        });

        // Second pass: build parent-child relationships and calculate levels
        tabMap.forEach(tab => {
            if (tab.openerId && tabMap.has(tab.openerId)) {
                const parent = tabMap.get(tab.openerId)!;
                parent.children.push(tab);
                tab.level = parent.level + 1;
            } else {
                rootTabs.push(tab);
            }
        });

        // Sort function to maintain tree order
        const sortTabs = (tabList: TabUI[]): TabUI[] => {
            return tabList
                .sort((a, b) => a.id - b.id) // Sort by tab ID to maintain order
                .map(tab => ({
                    ...tab,
                    children: sortTabs(tab.children)
                }));
        };

        return sortTabs(rootTabs);
    };

    // Flatten hierarchy for display while preserving tree structure
    const flattenTabs = (tabs: TabUI[]): TabUI[] => {
        const result: TabUI[] = [];

        const addTabsRecursively = (tabList: TabUI[]) => {
            tabList.forEach(tab => {
                result.push(tab);
                if (tab.children.length > 0) {
                    addTabsRecursively(tab.children);
                }
            });
        };

        addTabsRecursively(tabs);
        return result;
    };



    // Get current window tabs
    const getCurrentWindowTabs = async (): Promise<TabUI[]> => {
        try {
            const currentWindow = await chrome.windows.getCurrent();
            const chromeTabs = await chrome.tabs.query({ windowId: currentWindow.id });
            const hierarchicalTabs = buildTabHierarchy(chromeTabs);
            return flattenTabs(hierarchicalTabs);
        } catch (error) {
            console.error('Error getting tabs:', error);
            return [];
        }
    };

    // Initialize tabs
    useEffect(() => {
        const initializeTabs = async () => {
            setLoading(true);
            const currentTabs = await getCurrentWindowTabs();
            setTabs(currentTabs);
            setLoading(false);
        };

        initializeTabs();
    }, []);

    // Tab event listeners
    useEffect(() => {
        const handleTabCreated = async (tab: chrome.tabs.Tab) => {
            console.log('🆕 Tab created:', tab.id, tab.title);
            const currentTabs = await getCurrentWindowTabs();
            setTabs(currentTabs);
        };

        const handleTabRemoved = async (tabId: number) => {
            console.log('🗑️ Tab removed:', tabId);
            const currentTabs = await getCurrentWindowTabs();
            setTabs(currentTabs);
        };

        const handleTabUpdated = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            // Only refresh if important properties changed
            if (changeInfo.title || changeInfo.url || changeInfo.favIconUrl) {
                console.log('📝 Tab updated:', tabId, changeInfo);
                const currentTabs = await getCurrentWindowTabs();
                setTabs(currentTabs);
            }
        };

        const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
            console.log('🎯 Tab activated:', activeInfo.tabId);
            const currentTabs = await getCurrentWindowTabs();
            setTabs(currentTabs);
        };

        // Add listeners
        chrome.tabs.onCreated.addListener(handleTabCreated);
        chrome.tabs.onRemoved.addListener(handleTabRemoved);
        chrome.tabs.onUpdated.addListener(handleTabUpdated);
        chrome.tabs.onActivated.addListener(handleTabActivated);

        // Cleanup listeners
        return () => {
            chrome.tabs.onCreated.removeListener(handleTabCreated);
            chrome.tabs.onRemoved.removeListener(handleTabRemoved);
            chrome.tabs.onUpdated.removeListener(handleTabUpdated);
            chrome.tabs.onActivated.removeListener(handleTabActivated);
        };
    }, []);

    return {
        tabs,
        loading,
        refreshTabs: getCurrentWindowTabs
    };
};