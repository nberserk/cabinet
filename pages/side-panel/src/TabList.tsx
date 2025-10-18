import { TabManager } from './hooks/TabManager';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import type { TabUI } from '@extension/shared';

const TabItem = ({ tab }: { tab: TabUI }) => {
  const { isLight } = useStorage(exampleThemeStorage);

  const handleTabClick = () => {
    chrome.tabs.update(tab.id, { active: true });
  };

  const indentStyle = {
    paddingLeft: `${tab.level * 20 + 12}px`,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick();
    }
  };

  return (
    <div
      onClick={handleTabClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        'flex cursor-pointer items-center border-l-4 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
        tab.highlighted
          ? 'bg-slate-500 text-white'
          : isLight
            ? 'border-transparent text-gray-900 hover:bg-gray-100'
            : 'border-transparent text-gray-100 hover:bg-gray-700',
      )}
      style={indentStyle}>
      {tab.favIconUrl ? (
        <img
          src={tab.favIconUrl}
          alt=""
          className="mr-2 h-4 w-4 flex-shrink-0"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="mr-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm bg-blue-100 text-blue-600">
          🌐
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-left text-xs',
            tab.highlighted ? 'font-bold text-white' : 'font-medium',
            !tab.highlighted && (isLight ? 'text-gray-900' : 'text-gray-100'),
          )}>
          {tab.title}
        </div>
      </div>
      {tab.children.length > 0 && (
        <span
          className={cn(
            'ml-2 text-xs',
            tab.highlighted ? 'text-blue-100' : isLight ? 'text-gray-400' : 'text-gray-400',
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
    return <div className={cn('p-4 text-center', isLight ? 'text-gray-500' : 'text-gray-400')}>Loading tabs...</div>;
  }

  if (tabs.length === 0) {
    return <div className={cn('p-4 text-center', isLight ? 'text-gray-500' : 'text-gray-400')}>No tabs found</div>;
  }

  return (
    <div className={cn('flex h-full flex-col border-t', isLight ? 'border-gray-200' : 'border-gray-600')}>
      <div
        className={cn('p-2 text-sm font-medium', isLight ? 'bg-gray-50 text-gray-700' : 'bg-gray-700 text-gray-300')}>
        Tabs ({tabs.length})
      </div>
      <div className="flex-1 overflow-y-auto">
        {tabs.map(tab => (
          <TabItem key={tab.id} tab={tab} />
        ))}
      </div>
    </div>
  );
};

export default TabList;
