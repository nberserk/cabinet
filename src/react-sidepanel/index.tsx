import React from 'react';
import { createRoot } from 'react-dom/client';
import SidepanelApp from './components/SidepanelApp';

console.log('🚀 React Sidepanel with proper components initializing...');

// Initialize React app when DOM is ready
function initReactSidepanel() {
    const container = document.getElementById('react-root');
    if (!container) {
        console.error('React root container not found');
        return;
    }

    console.log('✅ Creating React root and rendering SidepanelApp...');
    const root = createRoot(container);
    root.render(<SidepanelApp />);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReactSidepanel);
} else {
    initReactSidepanel();
}