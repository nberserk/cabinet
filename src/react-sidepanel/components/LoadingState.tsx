import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div 
      className="text-gray-500 text-sm p-4 text-center" 
      role="status" 
      aria-live="polite"
    >
      <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <span>Loading tabs...</span>
      </div>
    </div>
  );
};

export default LoadingState;