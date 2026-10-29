import React from 'react';

export type TabKey = 'booking' | 'manage' | 'admin';

interface NavPillGroupProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export const NavPillGroup: React.FC<NavPillGroupProps> = ({ activeTab, onChange }) => {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'booking', label: 'Book Appointment' },
    { key: 'manage', label: 'My Bookings' },
    { key: 'admin', label: 'Admin Operations' },
  ];

  return (
    <div className="inline-flex items-center bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-full">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-150 ${
              isActive
                ? 'bg-white text-[#111111] shadow-sm font-semibold'
                : 'text-[#6b7280] hover:text-[#111111]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
