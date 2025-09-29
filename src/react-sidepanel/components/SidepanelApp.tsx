import React from 'react';
import { SidepanelProvider } from '../context/SidepanelContext';
import { SidepanelErrorBoundary } from './ErrorBoundary';
import Header from './Header';
import TabTree from './TabTree';

const SidepanelApp: React.FC = () => {
  return (
    <SidepanelErrorBoundary>
      <SidepanelProvider>
        <div className="m-0 p-2 bg-gray-100 text-white font-sans">
          <main role="main" aria-label="Tab hierarchy tree">
            <Header />
            <TabTree />
          </main>
        </div>
      </SidepanelProvider>
    </SidepanelErrorBoundary>
  );
};

export default SidepanelApp;