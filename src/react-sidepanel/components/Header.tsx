import React from 'react';
import { useSidepanelContext } from '../context/SidepanelContext';

const Header: React.FC = () => {
  const { hierarchyState, isLoading, error } = useSidepanelContext();

  const handleCabinetClick = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('cabinets.html')
    });
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading hierarchy...';
    if (error) return 'Error loading tabs';
    if (!hierarchyState || !hierarchyState.rootTabs) return 'No tabs found';
    
    const rootCount = hierarchyState.rootTabs.length;
    const totalCount = hierarchyState.tabCount || 0;
    
    if (rootCount === totalCount) {
      return `${rootCount} tab${rootCount !== 1 ? 's' : ''}`;
    } else {
      return `${rootCount} root tab${rootCount !== 1 ? 's' : ''} (${totalCount} total)`;
    }
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-sm font-medium text-gray-700">Current Window Tabs (React)</h2>
        <p className="text-xs text-gray-500">{getStatusText()}</p>
      </div>
      <button
        id="open-cabinets-btn"
        onClick={handleCabinetClick}
        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        title="Open Cabinet Management"
      >
        Cabinets
      </button>
    </div>
  );
};

export default Header;