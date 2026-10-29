export const APP_CONFIG = {
  name: 'Slotly',
  version: 'v1.0',
  title: 'Slotly - Clinic Booking',
  tagline: "Modern patient scheduling software",
  copyrightNotice: '© 2026 Slotly ',
  stackDescription: 'Modern Clinic Booking System',
  rateLimit: {
    maxAttemptsPerMinute: 5,
  },
  swagger_endpoint: `${(import.meta.env.VITE_BACKEND_URL as string) ?? ''}/docs`,
} as const;
