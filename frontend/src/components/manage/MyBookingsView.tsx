import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Clock,
  User,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Hash,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Booking, ApiError } from '../../types/api';
import { useBookings } from '../../hooks/useBookings';
import { formatTimestamp } from '../../utils/date';

interface MyBookingsViewProps {
  initialEmail?: string;
  onErrorToast: (error: ApiError) => void;
  onSuccessToast: (title: string, message: string) => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  initialEmail,
  onErrorToast,
  onSuccessToast,
}) => {
  const [searchEmailInput, setSearchEmailInput] = useState(initialEmail || '');
  const [searchIdInput, setSearchIdInput] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  // Use designated bookings hook
  const {
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
  } = useBookings();

  // If initialEmail is provided (e.g. redirected from successful booking), search automatically
  useEffect(() => {
    if (initialEmail && initialEmail.trim()) {
      const email = initialEmail.trim();
      setSearchEmailInput(email);
      searchBookings(email).catch((err) => {
        onErrorToast(err as ApiError);
      });
    }
  }, [initialEmail, searchBookings, onErrorToast]);

  // Handle email search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = searchEmailInput.trim();
    if (!email) return;

    try {
      await searchBookings(email);
    } catch (err) {
      onErrorToast(err as ApiError);
    }
  };

  // Handle direct lookup by ID (GET /bookings/{id})
  const handleIdLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = searchIdInput.trim();
    if (!id) return;

    try {
      await lookupBookingById(id);
      onSuccessToast('Booking Found', `Retrieved booking details for ID: ${id}`);
    } catch (err) {
      onErrorToast(err as ApiError);
    }
  };

  // Confirm cancel booking (DELETE /bookings/{id})
  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    try {
      const updated = await cancelBooking(bookingToCancel.id);
      onSuccessToast('Booking Cancelled', `Booking ${updated.id} has been cancelled.`);
      setBookingToCancel(null);
    } catch (err) {
      onErrorToast(err as ApiError);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <h1 className="text-3xl font-semibold text-[#111111] cal-display-headline mb-2 tracking-tight">
          Manage Your Bookings
        </h1>
        <p className="text-sm text-[#6b7280]">
          Search appointments registered under your email address or retrieve a specific booking by its ID.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Email Search Box (2 cols) */}
        <div className="md:col-span-2 bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-2">
            Lookup by Patient Email
          </h2>
          <p className="text-xs text-[#6b7280] mb-4">
            Supports case-insensitive search and cursor-based pagination (Level 4).
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-[#9ca3af] absolute left-3 top-3" />
              <input
                type="email"
                value={searchEmailInput}
                onChange={(e) => setSearchEmailInput(e.target.value)}
                placeholder="e.g. ada@example.com"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-[#e5e7eb] rounded-lg text-[#111111] focus:outline-hidden focus:border-[#111111]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#111111] hover:bg-[#242424] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* Direct Booking ID Lookup Box (1 col) */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-2">
            Find by Booking ID
          </h2>
          <p className="text-xs text-[#6b7280] mb-4">
            Direct lookup via <code className="text-[#111111]">GET /bookings/:id</code>.
          </p>

          <form onSubmit={handleIdLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="w-4 h-4 text-[#9ca3af] absolute left-3 top-3" />
              <input
                type="text"
                value={searchIdInput}
                onChange={(e) => setSearchIdInput(e.target.value)}
                placeholder="Booking ID"
                className="w-full pl-9 pr-2.5 py-2 text-xs font-mono bg-white border border-[#e5e7eb] rounded-lg text-[#111111] focus:outline-hidden focus:border-[#111111]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isIdLoading}
              className="px-3 py-2 bg-[#f5f5f5] hover:bg-[#e5e7eb] text-[#111111] text-xs font-semibold rounded-lg transition-colors border border-[#e5e7eb] disabled:opacity-50"
            >
              {isIdLoading ? '...' : 'Find'}
            </button>
          </form>
        </div>
      </div>

      {/* ID Lookup Result Card */}
      {idLookupBooking && (
        <div className="mb-8 p-5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#111111]">Single Booking Lookup Result</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  idLookupBooking.status === 'confirmed'
                    ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                    : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                }`}
              >
                {idLookupBooking.status}
              </span>
            </div>
            <button
              onClick={clearLookup}
              className="text-xs text-[#6b7280] hover:text-[#111111]"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">ID</span>
              <span className="font-mono text-[#111111]">{idLookupBooking.id}</span>
            </div>
            <div>
              <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">Slot ID</span>
              <span className="font-mono text-[#111111]">{idLookupBooking.slot_id}</span>
            </div>
            <div>
              <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">Patient</span>
              <span className="text-[#111111] font-medium">{idLookupBooking.name}</span>
            </div>
            <div>
              <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">Email</span>
              <span className="text-[#111111]">{idLookupBooking.email}</span>
            </div>
          </div>

          {idLookupBooking.status === 'confirmed' && (
            <div className="mt-3 pt-3 border-t border-[#e5e7eb] flex justify-end">
              <button
                onClick={() => setBookingToCancel(idLookupBooking)}
                className="px-3 py-1.5 text-xs text-[#ef4444] hover:bg-[#fef2f2] border border-[#fecaca] rounded-lg font-medium transition-colors"
              >
                Cancel This Booking
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bookings List Section */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#fcfcfc] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#111111]">
              {activeEmail ? `Bookings for ${activeEmail}` : 'Your Appointments'}
            </h2>
            <p className="text-xs text-[#6b7280]">
              {bookings.length} record{bookings.length === 1 ? '' : 's'} loaded
            </p>
          </div>

          {activeEmail && (
            <button
              onClick={() => refreshCurrent()}
              className="text-xs flex items-center space-x-1 text-[#6b7280] hover:text-[#111111]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#6b7280]">
            <div className="w-6 h-6 border-2 border-[#111111]/20 border-t-[#111111] rounded-full animate-spin mx-auto mb-3"></div>
            Searching bookings for {activeEmail}...
          </div>
        ) : !hasSearched ? (
          <div className="py-16 text-center text-xs text-[#6b7280] px-4">
            <Mail className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
            <p className="font-medium text-[#111111] mb-1">Enter an email address above</p>
            <p>We'll query all past and upcoming appointments associated with that email.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6b7280] px-4">
            <Calendar className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
            <p className="font-medium text-[#111111] mb-1">No bookings found for {activeEmail}</p>
            <p>Ensure the email matches the one entered during the appointment booking.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {bookings.map((booking) => {
              const createdDate = formatTimestamp(booking.created_at);

              return (
                <div
                  key={booking.id}
                  className="p-5 hover:bg-[#fafafa] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-[#111111] bg-[#f5f5f5] px-2 py-0.5 rounded border border-[#e5e7eb]">
                        {booking.id}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center space-x-1 ${
                          booking.status === 'confirmed'
                            ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]'
                            : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
                        }`}
                      >
                        {booking.status === 'confirmed' ? (
                          <CheckCircle className="w-3 h-3 text-[#10b981]" />
                        ) : (
                          <XCircle className="w-3 h-3 text-[#ef4444]" />
                        )}
                        <span className="capitalize">{booking.status}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#374151]">
                      <span className="flex items-center space-x-1 font-medium">
                        <User className="w-3.5 h-3.5 text-[#6b7280]" />
                        <span>{booking.name}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-[#6b7280]">
                        <Hash className="w-3.5 h-3.5 text-[#6b7280]" />
                        <span>Slot ID: {booking.slot_id}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-[#6b7280]">
                        <Clock className="w-3.5 h-3.5 text-[#6b7280]" />
                        <span>Booked on {createdDate}</span>
                      </span>
                    </div>
                  </div>

                  <div className="self-end sm:self-auto">
                    {booking.status === 'confirmed' ? (
                      <button
                        onClick={() => setBookingToCancel(booking)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#ef4444] hover:bg-[#fef2f2] border border-[#fecaca] rounded-lg transition-colors"
                      >
                        Cancel Booking
                      </button>
                    ) : (
                      <span className="text-xs text-[#9ca3af] italic">Cancelled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cursor Pagination Load More */}
        {nextCursor && (
          <div className="p-4 border-t border-[#e5e7eb] bg-[#f9fafb] text-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white border border-[#e5e7eb] hover:bg-[#f5f5f5] text-xs font-semibold text-[#111111] rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>Load More Bookings</span>
            </button>
            <p className="text-[10px] text-[#6b7280] font-mono mt-1">cursor: {nextCursor}</p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center text-[#ef4444] mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-semibold text-[#111111] cal-display-headline mb-2">
              Cancel This Appointment?
            </h3>
            <p className="text-xs text-[#6b7280] leading-relaxed mb-4">
              Cancelling booking <span className="font-mono text-[#111111] font-semibold">{bookingToCancel.id}</span> will release slot <span className="font-mono text-[#111111] font-semibold">{bookingToCancel.slot_id}</span> back to the pool of available appointments.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={isCancelling}
                className="px-3.5 py-2 text-xs font-medium text-[#374151] hover:text-[#111111]"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
