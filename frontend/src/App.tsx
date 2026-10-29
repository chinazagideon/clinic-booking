import React, { useState } from 'react';
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleErrorToast = (err: ApiError) => {
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
  };

  const handleSuccessToast = (title: string, message: string) => {
    addToast({
      type: 'success',
      title,
      message,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'booking' && (
          <BookingView
            onErrorToast={handleErrorToast}
            onSuccessToast={handleSuccessToast}
            onViewMyBookings={() => setActiveTab('manage')}
          />
        )}
        {activeTab === 'manage' && (
          <MyBookingsView
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
