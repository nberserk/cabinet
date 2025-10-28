import '@src/NewTab.css';
import '@src/NewTab.scss';
import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { cabinetStorage, exampleThemeStorage } from '@extension/storage';
import { ErrorDisplay, LoadingSpinner, ToggleButton, cn } from '@extension/ui';
import { useState, useMemo } from 'react';
import type { Cabinet, TabUI } from '@extension/shared';

type SortOption = 'createdDate' | 'alphabetical' | 'updatedDate';

const TabItem = ({ tab, isLight }: { tab: TabUI; isLight: boolean }) => {
  const indentStyle = {
    paddingLeft: `${tab.level * 20 + 12}px`,
  };

  return (
    <div
      className={cn(
        'flex items-center border-l-4 border-transparent p-1 text-xs',
        isLight ? 'text-gray-700' : 'text-gray-300',
      )}
      style={indentStyle}>
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
        <div
          className={cn(
            'mr-2 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-sm text-xs',
            isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-900 text-blue-300',
          )}>
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
  isLight,
}: {
  cabinet: Cabinet;
  onRestore: (cabinet: Cabinet) => void;
  onDelete: (cabinet: Cabinet) => void;
  isLight: boolean;
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
    <div
      className={cn(
        'mb-4 rounded-lg border p-4 shadow-sm',
        isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800',
      )}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className={cn('mb-1 text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            {cabinet.name}
          </h3>
          {cabinet.description && (
            <p className={cn('mb-2 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>{cabinet.description}</p>
          )}
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
          <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>ID:</span>
          <span className={cn('ml-1', isLight ? 'text-gray-600' : 'text-gray-400')}>{cabinet.id}</span>
        </div>
        <div>
          <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Created:</span>
          <span className={cn('ml-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
            {formatDate(cabinet.createdAt)}
          </span>
        </div>
        <div>
          <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Updated:</span>
          <span className={cn('ml-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
            {formatDate(cabinet.updatedAt)}
          </span>
        </div>
        <div>
          <span className={cn('gap-4 font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Tags:</span>
          {cabinet.tags && cabinet.tags.length > 0 && (
            <span className={cn('ml-1 gap-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
              {cabinet.tags.map((tag, index) => (
                <span
                  key={index}
                  className={cn(
                    'rounded-full px-2 py-1 text-xs',
                    isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-300',
                  )}>
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className={cn('border-t pt-3', isLight ? 'border-gray-200' : 'border-gray-700')}>
        <div className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
          Tabs ({cabinet.tabs.length})
        </div>
        <div className="max-h-48 overflow-y-auto">
          {tabHierarchy.slice(0, 10).map(tab => (
            <TabItem key={tab.id} tab={tab} isLight={isLight} />
          ))}
          {tabHierarchy.length > 10 && (
            <div className={cn('py-2 text-center text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
              ... and {tabHierarchy.length - 10} more tabs
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NewTab = () => {
  const cabinets = useStorage(cabinetStorage);
  const { isLight } = useStorage(exampleThemeStorage);
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

  const openGitHub = () => {
    chrome.tabs.create({ url: 'https://github.com/nberserk/cabinet' });
  };

  return (
    <div className={cn('min-h-screen', isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100')}>
      {/* Header Menu */}
      <header
        className={cn('border-b px-6 py-4', isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800')}>
        <div className="flex items-center justify-between">
          <h1 className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>The Cabinet</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={openOptions}
              className={cn(
                'rounded-md px-3 py-1 text-sm transition-colors',
                isLight
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100',
              )}>
              Options
            </button>
            <button
              onClick={openGitHub}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors',
                isLight
                  ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100',
              )}
              title="View on GitHub">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
            <ToggleButton className="mt-0">Toggle Theme</ToggleButton>
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
              className={cn(
                'w-full rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  : 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400',
              )}
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
              )}>
              <option value="createdDate">Sort by Created Date</option>
              <option value="updatedDate">Sort by Updated Date</option>
              <option value="alphabetical">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Cabinet List */}
        {filteredAndSortedCabinets.length === 0 ? (
          <div className={cn('py-12 text-center', isLight ? 'text-gray-500' : 'text-gray-400')}>
            {searchQuery.trim() ? 'No cabinets match your search.' : 'No cabinets saved yet.'}
          </div>
        ) : (
          <div>
            <div className={cn('mb-4 text-sm', isLight ? 'text-gray-600' : 'text-gray-400')}>
              {filteredAndSortedCabinets.length} cabinet{filteredAndSortedCabinets.length !== 1 ? 's' : ''}
            </div>
            {filteredAndSortedCabinets.map(cabinet => (
              <CabinetCard
                key={cabinet.id}
                cabinet={cabinet}
                onRestore={handleRestore}
                onDelete={handleDelete}
                isLight={isLight}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);
