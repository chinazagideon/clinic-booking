import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Single-responsibility component for displaying error states with optional retry capability.
 * Styled according to DESIGN-cal.md error tokens.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to reach clinic API',
  message,
  onRetry,
  isRetrying = false,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        className={`p-4 text-center bg-[#fff8f8] border border-[#fecaca] rounded-xl text-xs text-[#991b1b] space-y-2 ${className}`}
      >
        <AlertCircle className="w-5 h-5 mx-auto text-[#ef4444]" />
        {title && <p className="font-semibold">{title}</p>}
        <p className="text-[11px] text-[#7f1d1d] leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-1 px-3 py-1 bg-[#111111] hover:bg-[#242424] text-white text-[11px] font-semibold rounded-md transition-colors inline-flex items-center space-x-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`py-12 px-6 text-center border border-[#fecaca] bg-[#fff5f5] rounded-xl ${className}`}
    >
      <AlertCircle className="w-8 h-8 text-[#ef4444] mx-auto mb-2.5" />
      <h4 className="text-sm font-semibold text-[#991b1b] mb-1">{title}</h4>
      <p className="text-xs text-[#7f1d1d] max-w-sm mx-auto mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#111111] hover:bg-[#242424] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Connecting...' : 'Retry Connection'}</span>
        </button>
      )}
    </div>
  );
};
