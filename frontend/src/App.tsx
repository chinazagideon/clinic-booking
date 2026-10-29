import React, { useState, useCallback } from 'react';
import { TopNav } from './components/common/TopNav';
import { TabKey } from './components/common/NavPillGroup';
import { Footer } from './components/common/Footer';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { BookingView } from './components/booking/BookingView';
import { MyBookingsView } from './components/manage/MyBookingsView';
import { AdminView } from './components/admin/AdminView';
import { ApiError } from './types/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('booking');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleViewMyBookings = useCallback((email: string) => {
    setSelectedUserEmail(email);
    setActiveTab('manage');
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    setToasts((prev) => {
      // Prevent duplicate toasts with the exact same title & message
      const isDuplicate = prev.some(
        (t) => t.type === toast.type && t.title === toast.title && t.message === toast.message
      );
      if (isDuplicate) return prev;

      const id = 'toast-' + Math.random().toString(36).substring(2, 9);
      // Keep at most 3 active toasts to avoid flooding
      const updated = [...prev, { ...toast, id }];
      return updated.slice(-3);
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleErrorToast = useCallback(
    (err: ApiError) => {
      const isRateLimit = err.status === 429 || (err.retryAfter !== undefined && err.retryAfter > 0);
      addToast({
        type: isRateLimit ? 'rate-limit' : 'error',
        title: isRateLimit
          ? 'Rate Limit Exceeded (Level 5)'
          : err.status === 409
          ? 'Booking Conflict (Level 3)'
          : err.status === 401
          ? 'Unauthorized (X-API-Key)'
          : 'API Error',
        message: err.error || 'An unexpected error occurred.',
        retryAfter: err.retryAfter,
      });
    },
    [addToast]
  );

  const handleSuccessToast = useCallback(
    (title: string, message: string) => {
      addToast({
        type: 'success',
        title,
        message,
      });
    },
    [addToast]
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'booking' && (
          <BookingView
            onErrorToast={handleErrorToast}
            onSuccessToast={handleSuccessToast}
            onViewMyBookings={handleViewMyBookings}
          />
        )}
        {activeTab === 'manage' && (
          <MyBookingsView
            initialEmail={selectedUserEmail}
            onErrorToast={handleErrorToast}
            onSuccessToast={handleSuccessToast}
          />
        )}
        {activeTab === 'admin' && (
          <AdminView
            onErrorToast={handleErrorToast}
            onSuccessToast={handleSuccessToast}
          />
        )}
      </main>

      <Footer />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
