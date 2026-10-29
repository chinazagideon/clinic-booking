import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  SlotWithAvailability,
  BookingCreationResult,
  ApiError,
} from '../../types/api';
import { useCreateBooking } from '../../hooks/useCreateBooking';
import { formatDateWithWeekday, formatTimeRange } from '../../utils/date';
import { APP_CONFIG } from '../../constants/app';

interface BookingModalProps {
  slot: SlotWithAvailability | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: BookingCreationResult, slot: SlotWithAvailability) => void;
  onErrorToast: (error: ApiError) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  isOpen,
  onClose,
  onSuccess,
  onErrorToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Intent-scoped key: held constant across retries with identical payload
  const idempotencyKeyRef = useRef<string>('');
  const lastPayloadRef = useRef<{
    slot_id: string;
    name: string;
    email: string;
  } | null>(null);

  // Mint a new intent-scoped idempotency key whenever the modal opens for a new slot session
  useEffect(() => {
    if (isOpen && slot) {
      idempotencyKeyRef.current = `idem-${slot.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      lastPayloadRef.current = null;
      setValidationError(null);
    }
  }, [isOpen, slot?.id]);

  const { mutateAsync: createBooking, isSubmitting } = useCreateBooking();

  if (!isOpen || !slot) return null;

  const formattedDate = formatDateWithWeekday(slot.start);
  const formattedTime = formatTimeRange(slot.start, slot.end);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setValidationError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    // Only mint a new key if the payload content actually changed from a prior attempt,
    // avoiding 422 payload mismatches. Safe transport retries keep the identical key.
    if (
      lastPayloadRef.current &&
      (lastPayloadRef.current.name !== trimmedName ||
        lastPayloadRef.current.email !== trimmedEmail ||
        lastPayloadRef.current.slot_id !== slot.id)
    ) {
      idempotencyKeyRef.current = `idem-${slot.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    lastPayloadRef.current = {
      slot_id: slot.id,
      name: trimmedName,
      email: trimmedEmail,
    };

    try {
      const result = await createBooking(
        lastPayloadRef.current,
        idempotencyKeyRef.current
      );

      onSuccess(result, slot);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setValidationError(apiErr.error || 'Failed to complete booking');
      onErrorToast(apiErr);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-xl w-full max-w-lg p-6 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6b7280] hover:text-[#111111] p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            <span>Available Slot</span>
          </div>
          <h3 className="text-xl font-semibold text-[#111111] cal-display-headline">
            Confirm Your Appointment
          </h3>
          <p className="text-xs text-[#6b7280]">
            Review slot details and submit your details to lock in your reservation.
          </p>
        </div>

        {/* Slot Summary Card */}
        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-4 mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#111111]">{slot.provider}</span>
            <span className="text-xs font-mono text-[#6b7280]">ID: {slot.id}</span>
          </div>
          <div className="flex items-center space-x-4 text-xs text-[#374151]">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#6b7280]" />
              <span>{formattedDate}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#6b7280]" />
              <span>{formattedTime}</span>
            </span>
          </div>
        </div>

        {validationError && (
          <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-lg text-xs flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9ca3af] absolute left-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-[#e5e7eb] rounded-lg text-[#111111] focus:outline-hidden focus:border-[#111111]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#9ca3af] absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-[#e5e7eb] rounded-lg text-[#111111] focus:outline-hidden focus:border-[#111111]"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-[#374151] hover:text-[#111111] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#111111] hover:bg-[#242424] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                  <span>Confirm Booking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
