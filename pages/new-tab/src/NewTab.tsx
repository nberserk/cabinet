import '@src/NewTab.css';
import '@src/NewTab.scss';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense, type Cabinet, type Tab } from '@extension/shared';
import { exampleThemeStorage, cabinetStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect, useMemo } from 'react';

type SortOption = 'createdDate' | 'alphabetical' | 'updatedDate';

interface TabItemProps {
    tab: Tab;
    level: number;
    isLight: boolean;
}

const TabItem = ({ tab, level, isLight }: TabItemProps) => {
    const indentStyle = {
        paddingLeft: `${level * 20 + 12}px`
    };

    return (
        <div
            className={cn(
                'flex items-center p-1 text-xs border-l-4 border-transparent',
                isLight ? 'text-gray-700' : 'text-gray-300'
            )}
            style={indentStyle}
        >
            {tab.favIconUrl ? (
                <img
                    src={tab.favIconUrl}
                    alt=""
                    className="w-3 h-3 mr-2 flex-shrink-0"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <div className="w-3 h-3 mr-2 flex-shrink-0 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600 text-xs">
                    🌐
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="truncate text-left">
                    {tab.title}
                </div>
            </div>
        </div>
    );
};

const CabinetCard = ({ cabinet, isLight, onRestore }: {
    cabinet: Cabinet;
    isLight: boolean;
    onRestore: (cabinet: Cabinet) => void;
}) => {
    // Build tab hierarchy for display
    const tabHierarchy = useMemo(() => {
        type TabWithHierarchy = Tab & { children: TabWithHierarchy[]; level: number };

        const tabMap = new Map<number, TabWithHierarchy>(
            cabinet.tabs.map(tab => [tab.id, { ...tab, children: [], level: 0 }])
        );
        const rootTabs: TabWithHierarchy[] = [];

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

        // Flatten for display
        const flattenTabs = (tabs: TabWithHierarchy[]): (Tab & { level: number })[] => {
            const result: (Tab & { level: number })[] = [];
            tabs.forEach(tab => {
                result.push({ ...tab });
                result.push(...flattenTabs(tab.children));
            });
            return result;
        };

        return flattenTabs(rootTabs);
    }, [cabinet.tabs]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={cn(
            'border rounded-lg p-4 mb-4',
            isLight
                ? 'border-gray-200 bg-white shadow-sm'
                : 'border-gray-600 bg-gray-700 shadow-sm'
        )}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className={cn(
                        'text-lg font-semibold mb-1',
                        isLight ? 'text-gray-900' : 'text-gray-100'
                    )}>
                        {cabinet.name}
                    </h3>
                    {cabinet.description && (
                        <p className={cn(
                            'text-sm mb-2',
                            isLight ? 'text-gray-600' : 'text-gray-400'
                        )}>
                            {cabinet.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onRestore(cabinet)}
                    className={cn(
                        'px-3 py-1 text-sm rounded-md font-medium transition-colors',
                        isLight
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    )}
                >
                    Restore Cabinet
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                <div>
                    <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
                        Created:
                    </span>
                    <span className={cn('ml-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
                        {formatDate(cabinet.createdAt)}
                    </span>
                </div>
                <div>
                    <span className={cn('font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
                        Updated:
                    </span>
                    <span className={cn('ml-1', isLight ? 'text-gray-600' : 'text-gray-400')}>
                        {formatDate(cabinet.updatedAt)}
                    </span>
                </div>
            </div>

            {cabinet.tags && cabinet.tags.length > 0 && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                        {cabinet.tags.map((tag, index) => (
                            <span
                                key={index}
                                className={cn(
                                    'px-2 py-1 text-xs rounded-full',
                                    isLight
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-gray-600 text-gray-300'
                                )}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className={cn(
                'border-t pt-3',
                isLight ? 'border-gray-200' : 'border-gray-600'
            )}>
                <div className={cn(
                    'text-sm font-medium mb-2',
                    isLight ? 'text-gray-700' : 'text-gray-300'
                )}>
                    Tabs ({cabinet.tabs.length})
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {tabHierarchy.slice(0, 10).map(tab => (
                        <TabItem key={tab.id} tab={tab} level={tab.level} isLight={isLight} />
                    ))}
                    {tabHierarchy.length > 10 && (
                        <div className={cn(
                            'text-xs text-center py-2',
                            isLight ? 'text-gray-500' : 'text-gray-400'
                        )}>
                            ... and {tabHierarchy.length - 10} more tabs
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NewTab = () => {
    const { isLight } = useStorage(exampleThemeStorage);
    const [cabinets, setCabinets] = useState<Cabinet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('createdDate');

    useEffect(() => {
        loadCabinets();
    }, []);

    const loadCabinets = async () => {
        try {
            setLoading(true);
            const allCabinets = await cabinetStorage.getAllCabinets();
            setCabinets(allCabinets);
        } catch (error) {
            console.error('Failed to load cabinets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSortedCabinets = useMemo(() => {
        let filtered = cabinets;

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = cabinets.filter(cabinet =>
                cabinet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cabinet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cabinet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                cabinet.tabs.some(tab =>
                    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
                )
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
                cabinet: cabinet
            });

            if (!response.success) {
                console.error('Failed to restore cabinet:', response.error);
            }
        } catch (error) {
            console.error('Failed to restore cabinet:', error);
        }
    };

    const openOptions = () => {
        chrome.runtime.openOptionsPage();
    };

    const openHelp = () => {
        chrome.tabs.create({ url: 'https://github.com/your-repo/cabinet-help' });
    };

    return (
        <div className={cn('min-h-screen', isLight ? 'bg-gray-50' : 'bg-gray-900')}>
            {/* Header Menu */}
            <header className={cn(
                'border-b px-6 py-4',
                isLight
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-800 border-gray-700'
            )}>
                <div className="flex justify-between items-center">
                    <h1 className={cn(
                        'text-2xl font-bold',
                        isLight ? 'text-gray-900' : 'text-gray-100'
                    )}>
                        The Cabinet
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={openOptions}
                            className={cn(
                                'px-3 py-1 text-sm rounded-md transition-colors',
                                isLight
                                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                            )}
                        >
                            Options
                        </button>
                        <button
                            onClick={openHelp}
                            className={cn(
                                'px-3 py-1 text-sm rounded-md transition-colors',
                                isLight
                                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                            )}
                        >
                            Help
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-6">
                {/* Search and Sort Controls */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search cabinets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                'w-full px-4 py-2 rounded-lg border text-sm',
                                isLight
                                    ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    : 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                            )}
                        />
                    </div>
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className={cn(
                                'px-4 py-2 rounded-lg border text-sm',
                                isLight
                                    ? 'border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    : 'border-gray-600 bg-gray-700 text-gray-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-400'
                            )}
                        >
                            <option value="createdDate">Sort by Created Date</option>
                            <option value="updatedDate">Sort by Updated Date</option>
                            <option value="alphabetical">Sort Alphabetically</option>
                        </select>
                    </div>
                </div>

                {/* Cabinet List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <LoadingSpinner />
                    </div>
                ) : filteredAndSortedCabinets.length === 0 ? (
                    <div className={cn(
                        'text-center py-12',
                        isLight ? 'text-gray-500' : 'text-gray-400'
                    )}>
                        {searchQuery.trim() ? 'No cabinets match your search.' : 'No cabinets saved yet.'}
                    </div>
                ) : (
                    <div>
                        <div className={cn(
                            'text-sm mb-4',
                            isLight ? 'text-gray-600' : 'text-gray-400'
                        )}>
                            {filteredAndSortedCabinets.length} cabinet{filteredAndSortedCabinets.length !== 1 ? 's' : ''}
                        </div>
                        {filteredAndSortedCabinets.map(cabinet => (
                            <CabinetCard
                                key={cabinet.id}
                                cabinet={cabinet}
                                isLight={isLight}
                                onRestore={handleRestore}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);
