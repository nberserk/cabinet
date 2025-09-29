import React from 'react';

interface ErrorStateProps {
  message: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div 
      className="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md" 
      role="alert" 
      aria-live="assertive"
    >
      <div className="flex items-start space-x-2">
        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path 
            fillRule="evenodd" 
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
            clipRule="evenodd" 
          />
        </svg>
        <div className="flex-1">
          <p className="font-medium">Error loading tabs</p>
          <p className="text-xs mt-1">{message}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorState;