import { Slot } from '../types/api';

interface ShiftTime {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

const PROVIDER_SHIFTS: { provider: string; times: ShiftTime[] }[] = [
  {
    provider: 'Dr Ade',
    times: [
      { startH: 8, startM: 0, endH: 8, endM: 30 },
      { startH: 8, startM: 30, endH: 9, endM: 0 },
      { startH: 9, startM: 0, endH: 9, endM: 30 },
      { startH: 9, startM: 30, endH: 10, endM: 0 },
      { startH: 10, startM: 0, endH: 10, endM: 30 },
    ],
  },
  {
    provider: 'Dr Smith',
    times: [
      { startH: 11, startM: 0, endH: 11, endM: 30 },
      { startH: 11, startM: 30, endH: 12, endM: 0 },
      { startH: 12, startM: 0, endH: 12, endM: 30 },
      { startH: 12, startM: 30, endH: 13, endM: 0 },
      { startH: 13, startM: 0, endH: 13, endM: 30 },
    ],
  },
  {
    provider: 'Dr Chen',
    times: [
      { startH: 14, startM: 0, endH: 14, endM: 30 },
      { startH: 14, startM: 30, endH: 15, endM: 0 },
      { startH: 15, startM: 0, endH: 15, endM: 30 },
      { startH: 15, startM: 30, endH: 16, endM: 0 },
      { startH: 16, startM: 0, endH: 16, endM: 30 },
    ],
  },
];

export function generateDefaultSlots(): Slot[] {
  const slots: Slot[] = [];

  // Generate globally unique, non-overlapping future slots for the next 3 days
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    PROVIDER_SHIFTS.forEach(({ provider, times }) => {
      times.forEach((t, tIdx) => {
        const start = new Date(date);
        start.setHours(t.startH, t.startM, 0, 0);

        const end = new Date(date);
        end.setHours(t.endH, t.endM, 0, 0);

        const id = `slot-${provider.toLowerCase().replace(/[^a-z]/g, '')}-d${dayOffset}-t${tIdx + 1}`;
        slots.push({
          id,
          provider,
          start: start.toISOString(),
          end: end.toISOString(),
        });
      });
    });
  }

  return slots;
}
