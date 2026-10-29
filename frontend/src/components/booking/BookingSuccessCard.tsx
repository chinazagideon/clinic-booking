import React from 'react';
import { Check, Calendar, User, Mail, Hash, ArrowRight } from 'lucide-react';
import { Booking, SlotWithAvailability } from '../../types/api';
import { formatFullDateTime } from '../../utils/date';

interface BookingSuccessCardProps {
  booking: Booking;
  slot?: SlotWithAvailability;
  onBookAnother: () => void;
  onViewBookings: (email: string) => void;
}

export const BookingSuccessCard: React.FC<BookingSuccessCardProps> = ({
  booking,
  slot,
  onBookAnother,
  onViewBookings,
}) => {
  const formattedStart = slot ? formatFullDateTime(slot.start) : '';

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 max-w-lg mx-auto shadow-sm text-center">
      <div className="w-14 h-14 bg-[#ecfdf5] border border-[#a7f3d0] rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-7 h-7 text-[#10b981]" />
      </div>

      <h3 className="text-2xl font-semibold text-[#111111] cal-display-headline mb-2">
        Appointment Confirmed
      </h3>
      <p className="text-sm text-[#6b7280] mb-6">
        Your booking has been successfully recorded in the clinic system.
      </p>

      <div className="bg-[#f5f5f5] rounded-xl p-5 text-left space-y-3 mb-6 border border-[#e5e7eb]">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#e5e7eb]">
          <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
            Booking ID
          </span>
          <span className="text-xs font-mono font-semibold text-[#111111] bg-white px-2 py-0.5 rounded border border-[#e5e7eb]">
            {booking.id}
          </span>
        </div>

        {slot && (
          <div className="flex items-center space-x-3 text-sm text-[#111111]">
            <Calendar className="w-4 h-4 text-[#6b7280] shrink-0" />
            <div>
              <div className="font-semibold">{slot.provider}</div>
              <div className="text-xs text-[#6b7280]">{formattedStart}</div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3 text-sm text-[#111111]">
          <User className="w-4 h-4 text-[#6b7280] shrink-0" />
          <span>{booking.name}</span>
        </div>

        <div className="flex items-center space-x-3 text-sm text-[#111111]">
          <Mail className="w-4 h-4 text-[#6b7280] shrink-0" />
          <span>{booking.email}</span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#6b7280]">
          <Hash className="w-4 h-4 text-[#6b7280] shrink-0" />
          <span>Slot ID: {booking.slot_id}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onBookAnother}
          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-[#e5e7eb] text-[#111111] text-sm font-semibold rounded-lg hover:bg-[#f8f9fa] transition-colors"
        >
          Book Another Slot
        </button>
        <button
          onClick={() => onViewBookings(booking.email)}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-[#111111] text-white text-sm font-semibold rounded-lg hover:bg-[#242424] transition-colors"
        >
          <span>View My Bookings</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
