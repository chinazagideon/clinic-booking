import { useState, useEffect, useCallback, useMemo } from 'react';
import { SlotWithAvailability, ApiError } from '../types/api';
import { clinicApi } from '../services/apiClient';
import { getIsoDateKey } from '../utils/date';

interface UseSlotsReturn {
  slots: SlotWithAvailability[];
  isLoading: boolean;
  error: ApiError | null;
  refetch: (provider?: string) => Promise<void>;
  providers: string[];
  availableDates: { key: string; date: Date }[];
}

export function useSlots(selectedProvider: string = ''): UseSlotsReturn {
  const [slots, setSlots] = useState<SlotWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async (provider?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clinicApi.getSlots(provider);
      setSlots(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch(selectedProvider);
  }, [refetch, selectedProvider]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      if (s.provider) set.add(s.provider);
    });
    return Array.from(set).sort();
  }, [slots]);

  const availableDates = useMemo(() => {
    const map = new Map<string, Date>();
    slots.forEach((s) => {
      const d = new Date(s.start);
      const key = getIsoDateKey(d);
      if (!map.has(key)) {
        map.set(key, d);
      }
    });

    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map((key) => ({
      key,
      date: map.get(key)!,
    }));
  }, [slots]);

  return {
    slots,
    isLoading,
    error,
    refetch,
    providers,
    availableDates,
  };
}
