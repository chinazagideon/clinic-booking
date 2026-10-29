import { useState, useCallback } from 'react';
import { Slot, ApiError } from '../types/api';
import { clinicApi } from '../services/apiClient';

interface UseResetSlotsReturn {
  resetSlotsAsync: (slots: Slot[]) => Promise<void>;
  isResetting: boolean;
  error: ApiError | null;
  resetError: () => void;
}

export function useResetSlots(): UseResetSlotsReturn {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const resetSlotsAsync = useCallback(async (slots: Slot[]): Promise<void> => {
    setIsResetting(true);
    setError(null);
    try {
      await clinicApi.resetSlots(slots);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr);
      throw apiErr;
    } finally {
      setIsResetting(false);
    }
  }, []);

  return {
    resetSlotsAsync,
    isResetting,
    error,
    resetError,
  };
}
