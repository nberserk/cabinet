import React, { useCallback } from 'react';
import { TabNodeProps } from '../types/react-types';

const TabNode: React.FC<TabNodeProps> = ({ tabNode, depth, isLast, ancestorLines }) => {
  const handleTabClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      console.log('Switching to tab:', tabNode.id);
      await chrome.tabs.update(tabNode.id, { active: true });
    } catch (error) {
      console.error('Error switching to tab:', error);
    }
  }, [tabNode.id]);

  const handleCloseTab = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      console.log('Closing tab:', tabNode.id);
      await chrome.runtime.sendMessage({
        type: 'CLOSE_TAB',
        tabId: tabNode.id
      });
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }, [tabNode.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement context menu in next task
    console.log('Context menu for tab:', tabNode.id);
  }, [tabNode.id]);

  if (!tabNode || !tabNode.id) {
    return null;
  }

  const children = tabNode.children || [];
  const paddingClasses = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];
  const paddingClass = paddingClasses[Math.min(depth, paddingClasses.length - 1)];
  
  const activeClass = tabNode.isActive ? 'active bg-blue-100 border-blue-300' : '';
  const favicon = tabNode.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';

  return (
    <>
      <div 
        className={`tree-node ${activeClass}`}
        data-tab-id={tabNode.id}
        data-level={depth}
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={children.length > 0 ? 'true' : 'false'}
        tabIndex={-1}
      >
        <div 
          className={`tree-content ${paddingClass} flex items-center space-x-2 p-2 rounded border border-transparent hover:bg-gray-50 hover:border-gray-200 cursor-pointer group`}
          onClick={handleTabClick}
          onContextMenu={handleContextMenu}
        >
          <img 
            className="w-4 h-4 flex-shrink-0" 
            src={favicon} 
            alt="" 
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div 
              className="text-sm text-gray-900 truncate" 
              title={tabNode.title || tabNode.url || 'Untitled'}
            >
              {tabNode.title || tabNode.url || 'Untitled'}
            </div>
          </div>
          <span 
            className="text-xs text-gray-400 font-mono" 
            title={`Hierarchy level: ${depth}`}
          >
            L{depth}
          </span>
          {tabNode.isPinned && (
            <div 
              className="w-2 h-2 bg-blue-500 rounded-full" 
              title="Pinned tab"
              aria-label="Pinned tab"
            />
          )}
          {tabNode.isLoading && (
            <div 
              className="w-3 h-3 border border-gray-400 border-t-blue-500 rounded-full animate-spin" 
              title="Loading..."
              aria-label="Loading"
            />
          )}
          <button 
            className="close-btn w-4 h-4 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 leading-none border-none cursor-pointer"
            onClick={handleCloseTab}
            title={`Close ${tabNode.title || 'tab'}`}
            aria-label={`Close ${tabNode.title || 'tab'}`}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Render children */}
      {children.length > 0 && children.map((child, index) => (
        <TabNode
          key={child.id}
          tabNode={child}
          depth={depth + 1}
          isLast={index === children.length - 1}
          ancestorLines={[...ancestorLines, !isLast]}
        />
      ))}
    </>
  );
};

export default TabNode;