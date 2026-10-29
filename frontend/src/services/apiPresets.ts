import { Slot } from '../types/api';

export function generateDefaultSlots(): Slot[] {
  const slots: Slot[] = [];
  const providers = ['Dr Ade', 'Dr Smith', 'Dr Chen'];

  // Generate slots for today and next 2 days
  const now = new Date();

  providers.forEach((provider) => {
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);

      // Morning & Afternoon slots
      const times = [
        { startH: 9, startM: 0, endH: 9, endM: 30 },
        { startH: 10, startM: 0, endH: 10, endM: 30 },
        { startH: 11, startM: 0, endH: 11, endM: 30 },
        { startH: 14, startM: 0, endH: 14, endM: 30 },
        { startH: 15, startM: 30, endH: 16, endM: 0 },
      ];

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
    }
  });

  return slots;
}
