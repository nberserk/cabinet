import React from 'react';
import { useSidepanelContext } from '../context/SidepanelContext';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import TabNode from './TabNode';

const TabTree: React.FC = () => {
  const { hierarchyState, isLoading, error } = useSidepanelContext();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!hierarchyState || !hierarchyState.rootTabs || hierarchyState.rootTabs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div 
      id="tab-tree" 
      className="space-y-0.5 min-h-0 overflow-y-auto max-h-screen" 
      role="tree" 
      aria-label="Browser tabs organized in hierarchy"
      tabIndex={0}
    >
      {hierarchyState.rootTabs.map((tab, index) => (
        <TabNode
          key={tab.id}
          tabNode={tab}
          depth={0}
          isLast={index === hierarchyState.rootTabs.length - 1}
          ancestorLines={[]}
        />
      ))}
    </div>
  );
};

export default TabTree;