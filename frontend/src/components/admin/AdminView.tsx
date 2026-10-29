import React, { useState } from 'react';
import {
  Wrench,
  RotateCcw,
  Sparkles,
  Database,
  Code2,
  Check,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { Slot, ApiError } from '../../types/api';
import { useSlots } from '../../hooks/useSlots';
import { useResetSlots } from '../../hooks/useResetSlots';
import { generateDefaultSlots } from '../../services/apiPresets';
import { formatFullDateTime, formatTimeOnly } from '../../utils/date';

interface AdminViewProps {
  onErrorToast: (error: ApiError) => void;
  onSuccessToast: (title: string, message: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  onErrorToast,
  onSuccessToast,
}) => {
  // Use designated slots hook for inventory
  const { slots: currentSlots, isLoading: isLoadingSlots, refetch: fetchLiveSlots } = useSlots();

  // Use designated reset slots hook
  const { resetSlotsAsync, isResetting } = useResetSlots();

  // JSON editor state
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(generateDefaultSlots().slice(0, 4), null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Execute reset with given slot payload
  const handleExecuteReset = async (slotsToSeed: Slot[], label: string) => {
    if (
      !window.confirm(
        `Are you sure you want to reset the clinic database? This runs POST /reset which deletes ALL active bookings and replaces all slots.`
      )
    ) {
      return;
    }

    try {
      await resetSlotsAsync(slotsToSeed);
      onSuccessToast('Database Reset Complete', `${label}: ${slotsToSeed.length} slots loaded.`);
      await fetchLiveSlots();
    } catch (err) {
      onErrorToast(err as ApiError);
    }
  };

  // Seed default 3-provider schedule
  const handleSeedDefaults = () => {
    const slots = generateDefaultSlots();
    handleExecuteReset(slots, 'Default Schedule (3 Providers, 3 Days)');
  };

  // Seed minimal test schedule
  const handleSeedMinimal = () => {
    const now = new Date();
    const start1 = new Date(now.getTime() + 60 * 60 * 1000);
    const end1 = new Date(now.getTime() + 90 * 60 * 1000);
    const start2 = new Date(now.getTime() + 120 * 60 * 1000);
    const end2 = new Date(now.getTime() + 150 * 60 * 1000);

    const slots: Slot[] = [
      {
        id: 's1',
        provider: 'Dr Ade',
        start: start1.toISOString(),
        end: end1.toISOString(),
      },
      {
        id: 's2',
        provider: 'Dr Ade',
        start: start2.toISOString(),
        end: end2.toISOString(),
      },
    ];
    handleExecuteReset(slots, 'Minimal Test Schedule (Dr Ade)');
  };

  // Clear all
  const handleClearAll = () => {
    handleExecuteReset([], 'Empty Database (0 Slots)');
  };

  // Handle custom JSON submit
  const handleCustomJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setJsonError('JSON must be an array of slot objects: [{ id, provider, start, end }]');
        return;
      }
      handleExecuteReset(parsed, 'Custom JSON Payload');
    } catch {
      setJsonError('Invalid JSON format. Please verify syntax.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Title */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f5f5f5] text-[#111111] border border-[#e5e7eb] mb-3">
          <Wrench className="w-3.5 h-3.5 text-[#f59e0b]" />
          <span>Clinic Operations & Database Admin</span>
        </span>
        <h1 className="text-3xl font-semibold text-[#111111] cal-display-headline mb-2 tracking-tight">
          Slot Management & Seeder
        </h1>
        <p className="text-sm text-[#6b7280]">
          Manage clinic inventory and execute <code className="text-[#111111] font-mono">POST /reset</code> to seed or reconfigure available appointment slots.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Left Column: Quick Actions & JSON Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Preset Buttons */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#3b82f6]" />
              <span>Quick Seed Presets</span>
            </h2>
            <p className="text-xs text-[#6b7280] mb-5">
              Instant one-click presets to populate or clean up test slot data.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSeedDefaults}
                disabled={isResetting}
                className="w-full flex items-center justify-between p-3.5 bg-[#f8f9fa] hover:bg-[#f3f4f6] border border-[#e5e7eb] rounded-xl text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-[#111111]">
                    Full Schedule (3 Doctors, 3 Days)
                  </div>
                  <div className="text-[11px] text-[#6b7280]">
                    Generates 45 appointment slots across Dr Ade, Dr Smith, Dr Chen.
                  </div>
                </div>
                <RotateCcw className="w-4 h-4 text-[#6b7280]" />
              </button>

              <button
                onClick={handleSeedMinimal}
                disabled={isResetting}
                className="w-full flex items-center justify-between p-3.5 bg-[#f8f9fa] hover:bg-[#f3f4f6] border border-[#e5e7eb] rounded-xl text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-[#111111]">
                    Minimal Assessment Spec (s1 & s2)
                  </div>
                  <div className="text-[11px] text-[#6b7280]">
                    2 upcoming slots for Dr Ade matching contract examples.
                  </div>
                </div>
                <RotateCcw className="w-4 h-4 text-[#6b7280]" />
              </button>

              <button
                onClick={handleClearAll}
                disabled={isResetting}
                className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-[#fef2f2] border border-[#fecaca] rounded-xl text-left transition-colors text-[#991b1b]"
              >
                <div>
                  <div className="text-xs font-semibold text-[#ef4444]">
                    Clear All Slots & Bookings
                  </div>
                  <div className="text-[11px] text-[#6b7280]">
                    Deletes every booking and wipes out all slot records.
                  </div>
                </div>
                <RotateCcw className="w-4 h-4 text-[#ef4444]" />
              </button>
            </div>
          </div>

          {/* Custom JSON Payload Editor */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Code2 className="w-4 h-4 text-[#111111]" />
              <span>Custom JSON Payload</span>
            </h2>
            <p className="text-xs text-[#6b7280] mb-3">
              Directly input an array of slot objects to submit to <code className="text-[#111111]">POST /reset</code>.
            </p>

            <form onSubmit={handleCustomJsonSubmit} className="space-y-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={8}
                className="w-full p-3 font-mono text-xs bg-[#f8f9fa] border border-[#e5e7eb] rounded-lg text-[#111111] focus:outline-hidden focus:border-[#111111]"
              />

              {jsonError && (
                <div className="text-xs text-[#ef4444] flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{jsonError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isResetting}
                className="w-full py-2.5 bg-[#111111] hover:bg-[#242424] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 text-[#34d399]" />
                <span>{isResetting ? 'Sending POST /reset...' : 'Execute Reset with JSON'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Slot Inventory (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#e5e7eb] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#e5e7eb] bg-[#fcfcfc] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm font-semibold text-[#111111]">
                Live Slot Inventory
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#6b7280] font-mono border border-[#e5e7eb]">
                {currentSlots.length}
              </span>
            </div>

            <button
              onClick={() => fetchLiveSlots()}
              disabled={isLoadingSlots}
              className="flex items-center space-x-1 text-xs text-[#6b7280] hover:text-[#111111] bg-white border border-[#e5e7eb] px-2.5 py-1.5 rounded-md hover:bg-[#f8f9fa] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSlots ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingSlots ? (
            <div className="py-20 text-center text-xs text-[#6b7280]">
              <div className="w-6 h-6 border-2 border-[#111111]/20 border-t-[#111111] rounded-full animate-spin mx-auto mb-3"></div>
              Refreshing slots table...
            </div>
          ) : currentSlots.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#6b7280] px-4">
              <Layers className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
              <p className="font-semibold text-[#111111] mb-1">Database has no slots</p>
              <p>Click "Full Schedule" or "Minimal Test Spec" on the left to seed slots.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] border-b border-[#e5e7eb] sticky top-0 z-10 text-[#6b7280] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Slot ID</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Start Time</th>
                    <th className="px-4 py-3">End Time</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {currentSlots.map((slot) => {
                    const startDate = formatFullDateTime(slot.start);
                    const endDate = formatTimeOnly(slot.end);

                    return (
                      <tr key={slot.id} className="hover:bg-[#fafafa]">
                        <td className="px-4 py-3 font-mono font-medium text-[#111111]">
                          {slot.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111111]">{slot.provider}</td>
                        <td className="px-4 py-3 text-[#374151]">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#6b7280]" />
                            <span>{startDate}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#374151]">{endDate}</td>
                        <td className="px-4 py-3">
                          {slot.available ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                              <span>Available</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#6b7280]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#9ca3af]"></span>
                              <span>Booked</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
