import '@src/NewTab.css';
import '@src/NewTab.scss';
import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { cabinetStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useMemo } from 'react';
import type { Cabinet, TabUI } from '@extension/shared';

type SortOption = 'createdDate' | 'alphabetical' | 'updatedDate';

const TabItem = ({ tab }: { tab: TabUI }) => {
  const indentStyle = {
    paddingLeft: `${tab.level * 20 + 12}px`,
  };

  return (
    <div className="flex items-center border-l-4 border-transparent p-1 text-xs text-gray-700" style={indentStyle}>
      {tab.favIconUrl ? (
        <img
          src={tab.favIconUrl}
          alt=""
          className="mr-2 h-3 w-3 flex-shrink-0"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="mr-2 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-sm bg-blue-100 text-xs text-blue-600">
          🌐
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-left">{tab.title}</div>
      </div>
    </div>
  );
};

const CabinetCard = ({
  cabinet,
  onRestore,
  onDelete,
}: {
  cabinet: Cabinet;
  onRestore: (cabinet: Cabinet) => void;
  onDelete: (cabinet: Cabinet) => void;
}) => {
  // Build tab hierarchy for display using TabUI
  const tabHierarchy = useMemo(() => {
    const tabMap = new Map<number, TabUI>(
      cabinet.tabs.map(tab => [
        tab.id,
        {
          ...tab,
          highlighted: tab.id === cabinet.activeTabId,
          level: 0,
          children: [],
        },
      ]),
    );
    const rootTabs: TabUI[] = [];

    // Build parent-child relationships
    cabinet.tabs.forEach(tab => {
      const tabWithChildren = tabMap.get(tab.id)!;
      if (tab.openerId && tabMap.has(tab.openerId)) {
        const parent = tabMap.get(tab.openerId)!;
        parent.children.push(tabWithChildren);
        tabWithChildren.level = parent.level + 1;
      } else {
        rootTabs.push(tabWithChildren);
      }
    });

    // Sort function to maintain tree order
    const sortTabs = (tabList: TabUI[]): TabUI[] =>
      tabList
        .sort((a, b) => a.id - b.id)
        .map(tab => ({
          ...tab,
          children: sortTabs(tab.children),
        }));

    // Flatten for display
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

    return flattenTabs(sortTabs(rootTabs));
  }, [cabinet.tabs, cabinet.activeTabId]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">{cabinet.name}</h3>
          {cabinet.description && <p className="mb-2 text-sm text-gray-600">{cabinet.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(cabinet)}
            className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700"
            title="Delete Cabinet">
            Delete Cabinet
          </button>
          <button
            onClick={() => onRestore(cabinet)}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            Restore Cabinet
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-1 text-xs">
        <div>
          <span className="font-medium text-gray-700">ID:</span>
          <span className="ml-1 text-gray-600">{cabinet.id}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Created:</span>
          <span className="ml-1 text-gray-600">{formatDate(cabinet.createdAt)}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Updated:</span>
          <span className="ml-1 text-gray-600">{formatDate(cabinet.updatedAt)}</span>
        </div>
        <div>
          <span className="gap-4 font-medium text-gray-700">Tags:</span>
          {cabinet.tags && cabinet.tags.length > 0 && (
            <span className="ml-1 gap-1 text-gray-600">
              {cabinet.tags.map((tag, index) => (
                <span key={index} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="mb-2 text-sm font-medium text-gray-700">Tabs ({cabinet.tabs.length})</div>
        <div className="max-h-48 overflow-y-auto">
          {tabHierarchy.slice(0, 10).map(tab => (
            <TabItem key={tab.id} tab={tab} />
          ))}
          {tabHierarchy.length > 10 && (
            <div className="py-2 text-center text-xs text-gray-500">... and {tabHierarchy.length - 10} more tabs</div>
          )}
        </div>
      </div>
    </div>
  );
};

const NewTab = () => {
  const cabinets = useStorage(cabinetStorage);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('createdDate');

  const filteredAndSortedCabinets = useMemo(() => {
    let filtered = cabinets;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = cabinets.filter(
        cabinet =>
          cabinet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cabinet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cabinet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          cabinet.tabs.some(
            tab =>
              tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              tab.url.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'updatedDate':
          return b.updatedAt - a.updatedAt;
        case 'createdDate':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [cabinets, searchQuery, sortBy]);

  const handleRestore = async (cabinet: Cabinet) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'restoreCabinet',
        cabinet: cabinet,
      });

      if (!response.success) {
        console.error('Failed to restore cabinet:', response.error);
      }
    } catch (error) {
      console.error('Failed to restore cabinet:', error);
    }
  };

  const handleDelete = async (cabinet: Cabinet) => {
    const confirmMessage = `Are you sure you want to delete "${cabinet.name}"?\n\nThis will permanently remove the cabinet and all its ${cabinet.tabs.length} tab${cabinet.tabs.length !== 1 ? 's' : ''}. This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      try {
        await cabinetStorage.removeCabinet(cabinet.id);
      } catch (error) {
        console.error('Failed to delete cabinet:', error);
        alert('Failed to delete cabinet. Please try again.');
      }
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openHelp = () => {
    chrome.tabs.create({ url: 'https://github.com/your-repo/cabinet-help' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Menu */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">The Cabinet</h1>
          <div className="flex gap-4">
            <button
              onClick={openOptions}
              className="rounded-md px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Options
            </button>
            <button
              onClick={openHelp}
              className="rounded-md px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Search and Sort Controls */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search cabinets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="createdDate">Sort by Created Date</option>
              <option value="updatedDate">Sort by Updated Date</option>
              <option value="alphabetical">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Cabinet List */}
        {filteredAndSortedCabinets.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {searchQuery.trim() ? 'No cabinets match your search.' : 'No cabinets saved yet.'}
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              {filteredAndSortedCabinets.length} cabinet{filteredAndSortedCabinets.length !== 1 ? 's' : ''}
            </div>
            {filteredAndSortedCabinets.map(cabinet => (
              <CabinetCard key={cabinet.id} cabinet={cabinet} onRestore={handleRestore} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);
