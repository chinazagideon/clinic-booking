import { useState, useCallback } from 'react';
import { NewBooking, BookingCreationResult, ApiError } from '../types/api';
import { clinicApi } from '../services/apiClient';

interface UseCreateBookingReturn {
  mutateAsync: (booking: NewBooking, idempotencyKey?: string) => Promise<BookingCreationResult>;
  isSubmitting: boolean;
  error: ApiError | null;
  resetError: () => void;
}

export function useCreateBooking(): UseCreateBookingReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const mutateAsync = useCallback(
    async (booking: NewBooking, idempotencyKey?: string): Promise<BookingCreationResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await clinicApi.createBooking(booking, idempotencyKey);
        setIsSubmitting(false);
        return result;
      } catch (err) {
        setIsSubmitting(false);
        const apiError = err as ApiError;
        setError(apiError);
        throw apiError;
      }
    },
    []
  );

  return {
    mutateAsync,
    isSubmitting,
    error,
    resetError,
  };
}
