import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { TabManager } from './hooks/TabManager';
import type { Tab } from './types';

const TabItem = ({ tab }: { tab: Tab }) => {
    const { isLight } = useStorage(exampleThemeStorage);

    const handleTabClick = () => {
        chrome.tabs.update(tab.id, { active: true });
    };

    const indentStyle = {
        paddingLeft: `${tab.level * 20 + 12}px`
    };

    return (
        <div
            onClick={handleTabClick}
            className={cn(
                'flex items-center p-2 cursor-pointer border-l-4 transition-colors',
                tab.highlighted
                    ? 'bg-gray-600 text-white shadow-lg'
                    : isLight
                        ? 'hover:bg-gray-100 text-gray-900 border-transparent'
                        : 'hover:bg-gray-700 text-gray-100 border-transparent'
            )}
            style={indentStyle}
        >
            {tab.favIconUrl ? (
                <img
                    src={tab.favIconUrl}
                    alt=""
                    className="w-4 h-4 mr-2 flex-shrink-0"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <div className="w-4 h-4 mr-2 flex-shrink-0 bg-blue-100 rounded-sm flex items-center justify-center text-blue-600">
                    🌐
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className={cn(
                    'text-xs truncate text-left',
                    tab.highlighted
                        ? 'font-bold text-white'
                        : 'font-medium',
                    !tab.highlighted && (isLight ? 'text-gray-900' : 'text-gray-100')
                )}>
                    {tab.title}
                </div>
            </div>
            {tab.children.length > 0 && (
                <span className={cn(
                    'text-xs ml-2',
                    tab.highlighted
                        ? 'text-blue-100'
                        : isLight
                            ? 'text-gray-400'
                            : 'text-gray-400'
                )}>
                    ({tab.children.length})
                </span>
            )}
        </div>
    );
};

const TabList = () => {
    const { tabs, loading } = TabManager();
    const { isLight } = useStorage(exampleThemeStorage);

    if (loading) {
        return (
            <div className={cn(
                'p-4 text-center',
                isLight ? 'text-gray-500' : 'text-gray-400'
            )}>
                Loading tabs...
            </div>
        );
    }

    if (tabs.length === 0) {
        return (
            <div className={cn(
                'p-4 text-center',
                isLight ? 'text-gray-500' : 'text-gray-400'
            )}>
                No tabs found
            </div>
        );
    }

    return (
        <div className={cn(
            'border-t',
            isLight ? 'border-gray-200' : 'border-gray-600'
        )}>
            <div className={cn(
                'p-2 text-sm font-medium',
                isLight
                    ? 'bg-gray-50 text-gray-700'
                    : 'bg-gray-700 text-gray-300'
            )}>
                Tabs ({tabs.length})
            </div>
            <div className="max-h-96 overflow-y-auto">
                {tabs.map(tab => (
                    <TabItem key={tab.id} tab={tab} />
                ))}
            </div>
        </div>
    );
};

export default TabList;