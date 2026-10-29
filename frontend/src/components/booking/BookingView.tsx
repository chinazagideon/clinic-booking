import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Sparkles,
  Filter,
} from 'lucide-react';
import { SlotWithAvailability, Booking, ApiError } from '../../types/api';
import { useSlots } from '../../hooks/useSlots';
import {
  getIsoDateKey,
  formatMonthDay,
  formatWeekdayShort,
  formatTimeOnly,
} from '../../utils/date';
import { ErrorState } from '../common/ErrorState';
import { BookingModal } from './BookingModal';
import { BookingSuccessCard } from './BookingSuccessCard';

interface BookingViewProps {
  onErrorToast: (error: ApiError) => void;
  onSuccessToast: (title: string, message: string) => void;
  onViewMyBookings: (email: string) => void;
}

export const BookingView: React.FC<BookingViewProps> = ({
  onErrorToast,
  onSuccessToast,
  onViewMyBookings,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [activeSlotForBooking, setActiveSlotForBooking] = useState<SlotWithAvailability | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking: Booking;
    slot: SlotWithAvailability;
  } | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState<boolean>(true);

  // Use designated slots hook - clean state management without recursive toast calls
  const { slots, isLoading, error, refetch, providers, availableDates } = useSlots(selectedProvider);

  // Auto-select first date if none selected
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDateStr) {
      setSelectedDateStr(availableDates[0].key);
    }
  }, [availableDates, selectedDateStr]);

  // Filter slots for currently selected date and availability filter
  const currentSlots = useMemo(() => {
    return slots.filter((slot) => {
      const slotDateKey = getIsoDateKey(slot.start);
      if (selectedDateStr && slotDateKey !== selectedDateStr) return false;
      if (showOnlyAvailable && !slot.available) return false;
      return true;
    });
  }, [slots, selectedDateStr, showOnlyAvailable]);

  const handleBookingConfirmed = (booking: Booking, slot: SlotWithAvailability) => {
    setConfirmedBooking({ booking, slot });
    onSuccessToast('Appointment Confirmed', `Booking ${booking.id} reserved successfully!`);
    refetch(selectedProvider);
  };

  if (confirmedBooking) {
    return (
      <div className="py-12 px-4 max-w-4xl mx-auto">
        <BookingSuccessCard
          booking={confirmedBooking.booking}
          slot={confirmedBooking.slot}
          onBookAnother={() => setConfirmedBooking(null)}
          onViewBookings={() => onViewMyBookings(confirmedBooking.booking.email)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Instant Healthcare Scheduling</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#111111] cal-display-headline mb-3 tracking-tight">
          Book a Clinical Appointment
        </h1>
        <p className="text-sm text-[#6b7280]">
          Select your preferred healthcare provider, choose an open date and time slot, and receive instant confirmation.
        </p>
      </div>

      {/* Main Split Layout Container */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xs overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb] bg-[#fcfcfc] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Provider:
            </span>
            <button
              onClick={() => setSelectedProvider('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                selectedProvider === ''
                  ? 'bg-[#111111] text-white'
                  : 'bg-white text-[#374151] border border-[#e5e7eb] hover:bg-[#f5f5f5]'
              }`}
            >
              All Providers
            </button>
            {providers.map((p, idx) => {
              const isSelected = selectedProvider === p;
              const pastelColors = ['bg-[#fb923c]', 'bg-[#8b5cf6]', 'bg-[#ec4899]', 'bg-[#34d399]'];
              const pastel = pastelColors[idx % pastelColors.length];

              return (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    isSelected
                      ? 'bg-[#111111] text-white'
                      : 'bg-white text-[#374151] border border-[#e5e7eb] hover:bg-[#f5f5f5]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : pastel}`}></span>
                  <span>{p}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <label className="flex items-center space-x-1.5 text-xs text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                className="rounded text-[#111111] focus:ring-0"
              />
              <span>Available only</span>
            </label>

            <button
              onClick={() => refetch(selectedProvider)}
              disabled={isLoading}
              className="flex items-center space-x-1 text-xs text-[#6b7280] hover:text-[#111111] bg-white border border-[#e5e7eb] px-2.5 py-1.5 rounded-md hover:bg-[#f8f9fa] transition-colors"
              title="Refresh Slots"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Split Grid Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#e5e7eb]">
          {/* Left Panel: Date Picker & Clinic Info (5 cols) */}
          <div className="md:col-span-5 p-6 bg-[#fbfbfb]">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-[#111111] mb-1">Select a Date</h2>
              <p className="text-xs text-[#6b7280]">
                Browse available clinic days with scheduled doctor shifts.
              </p>
            </div>

            {error && slots.length === 0 ? (
              <ErrorState
                compact
                title="Unable to reach clinic API"
                message={error.error}
                onRetry={() => refetch(selectedProvider)}
                isRetrying={isLoading}
              />
            ) : availableDates.length === 0 ? (
              <div className="p-6 text-center bg-white border border-[#e5e7eb] rounded-xl text-xs text-[#6b7280]">
                No slot dates found. Go to <span className="font-semibold text-[#111111]">Admin Operations</span> to seed slots.
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {availableDates.map((item) => {
                  const isSelected = selectedDateStr === item.key;
                  const weekday = formatWeekdayShort(item.date);
                  const monthDay = formatMonthDay(item.date);

                  // Count slots on this date
                  const dateSlots = slots.filter((s) => getIsoDateKey(s.start) === item.key);
                  const availableCount = dateSlots.filter((s) => s.available).length;

                  return (
                    <button
                      key={item.key}
                      onClick={() => setSelectedDateStr(item.key)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-white border-[#111111] shadow-xs'
                          : 'bg-white border-[#e5e7eb] hover:border-[#9ca3af]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-semibold ${
                            isSelected
                              ? 'bg-[#111111] text-white'
                              : 'bg-[#f5f5f5] text-[#111111]'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-normal leading-none mb-0.5">
                            {weekday}
                          </span>
                          <span className="text-sm leading-none">{item.date.getDate()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#111111]">{monthDay}</div>
                          <div className="text-xs text-[#6b7280]">{dateSlots.length} slots total</div>
                        </div>
                      </div>

                      <div>
                        {availableCount > 0 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                            {availableCount} open
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280]">
                            Booked
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Clinic Info Box */}
            <div className="p-4 bg-white border border-[#e5e7eb] rounded-xl text-xs space-y-2">
              <div className="font-semibold text-[#111111] flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#111111]" />
                <span>Appointment Details</span>
              </div>
              <p className="text-[#6b7280] leading-relaxed">
                Standard consultations are 30 minutes in length. Slots are locked using pessimistic DB locks to prevent double-booking.
              </p>
            </div>
          </div>

          {/* Right Panel: Time Slots Column (7 cols) */}
          <div className="md:col-span-7 p-6 bg-white">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#f3f4f6]">
              <div>
                <h2 className="text-base font-semibold text-[#111111]">
                  Available Times
                </h2>
                <p className="text-xs text-[#6b7280]">
                  {selectedDateStr ? formatMonthDay(selectedDateStr + 'T12:00:00Z') : 'Select a date'}
                </p>
              </div>

              <div className="text-xs text-[#6b7280]">
                Showing {currentSlots.length} slot{currentSlots.length === 1 ? '' : 's'}
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-xs text-[#6b7280]">
                <div className="w-6 h-6 border-2 border-[#111111]/20 border-t-[#111111] rounded-full animate-spin mx-auto mb-3"></div>
                Loading slots from backend...
              </div>
            ) : error && slots.length === 0 ? (
              <ErrorState
                title="Unable to connect to clinic API"
                message={error.error}
                onRetry={() => refetch(selectedProvider)}
                isRetrying={isLoading}
              />
            ) : currentSlots.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-[#e5e7eb] rounded-xl p-6">
                <Clock className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-[#111111] mb-1">
                  No slots match your selection
                </h4>
                <p className="text-xs text-[#6b7280] max-w-xs mx-auto mb-4">
                  Try unchecking "Available only", selecting a different provider, or choosing another date.
                </p>
                {showOnlyAvailable && (
                  <button
                    onClick={() => setShowOnlyAvailable(false)}
                    className="text-xs font-semibold text-[#111111] underline"
                  >
                    Show all slots including booked
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {currentSlots.map((slot) => {
                  const startTime = formatTimeOnly(slot.start);
                  const endTime = formatTimeOnly(slot.end);

                  return (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        slot.available
                          ? 'border-[#e5e7eb] hover:border-[#111111] hover:shadow-xs bg-white cursor-pointer'
                          : 'border-[#f3f4f6] bg-[#f9fafb] opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (slot.available) {
                          setActiveSlotForBooking(slot);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#111111]">{slot.provider}</span>
                        {slot.available ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                            Open
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6b7280]">
                            Booked
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-[#374151] font-medium mb-3">
                        <Clock className="w-3.5 h-3.5 text-[#6b7280]" />
                        <span>
                          {startTime} – {endTime}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!slot.available}
                        className={`w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          slot.available
                            ? 'bg-[#111111] hover:bg-[#242424] text-white'
                            : 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                        }`}
                      >
                        {slot.available ? 'Select Slot' : 'Unavailable'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <BookingModal
        slot={activeSlotForBooking}
        isOpen={Boolean(activeSlotForBooking)}
        onClose={() => setActiveSlotForBooking(null)}
        onSuccess={handleBookingConfirmed}
        onErrorToast={onErrorToast}
      />
    </div>
  );
};
