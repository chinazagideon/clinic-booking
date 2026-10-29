import { useState, useCallback } from 'react';
import { Booking } from '../types/api';
import { clinicApi } from '../services/apiClient';

interface UseBookingsReturn {
  bookings: Booking[];
  nextCursor: string | null;
  activeEmail: string;
  hasSearched: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  searchBookings: (email: string) => Promise<void>;
  loadMore: () => Promise<void>;
  idLookupBooking: Booking | null;
  isIdLoading: boolean;
  lookupBookingById: (id: string) => Promise<Booking>;
  clearLookup: () => void;
  cancelBooking: (id: string) => Promise<Booking>;
  isCancelling: boolean;
  refreshCurrent: () => Promise<void>;
}

export function useBookings(): UseBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeEmail, setActiveEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [idLookupBooking, setIdLookupBooking] = useState<Booking | null>(null);
  const [isIdLoading, setIsIdLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const searchBookings = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setActiveEmail(trimmed);
    setHasSearched(true);
    setBookings([]);
    setNextCursor(null);

    try {
      const res = await clinicApi.getBookings(trimmed, 10, null);
      setBookings(res.bookings || []);
      setNextCursor(res.next_cursor);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !activeEmail || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await clinicApi.getBookings(activeEmail, 10, nextCursor);
      setBookings((prev) => [...prev, ...(res.bookings || [])]);
      setNextCursor(res.next_cursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, activeEmail, isLoadingMore]);

  const refreshCurrent = useCallback(async () => {
    if (activeEmail) {
      await searchBookings(activeEmail);
    }
  }, [activeEmail, searchBookings]);

  const lookupBookingById = useCallback(async (id: string): Promise<Booking> => {
    const trimmed = id.trim();
    setIsIdLoading(true);
    setIdLookupBooking(null);

    try {
      const booking = await clinicApi.getBooking(trimmed);
      setIdLookupBooking(booking);
      return booking;
    } finally {
      setIsIdLoading(false);
    }
  }, []);

  const clearLookup = useCallback(() => {
    setIdLookupBooking(null);
  }, []);

  const cancelBooking = useCallback(async (id: string): Promise<Booking> => {
    setIsCancelling(true);
    try {
      const updated = await clinicApi.cancelBooking(id);

      // Update in local lists
      setBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? { ...b, status: 'cancelled' } : b))
      );

      setIdLookupBooking((prev) =>
        prev && prev.id === updated.id ? { ...prev, status: 'cancelled' } : prev
      );

      return updated;
    } finally {
      setIsCancelling(false);
    }
  }, []);

  return {
    bookings,
    nextCursor,
    activeEmail,
    hasSearched,
    isLoading,
    isLoadingMore,
    searchBookings,
    loadMore,
    idLookupBooking,
    isIdLoading,
    lookupBookingById,
    clearLookup,
    cancelBooking,
    isCancelling,
    refreshCurrent,
  };
}
