export const APP_CONFIG = {
  name: 'Slotly',
  version: 'v1.0',
  title: 'Slotly - Clinic Booking',
  tagline: "Modern patient scheduling software",
  copyrightNotice: '© 2026 Slotly - Clinic Booking Assessment',
  stackDescription: 'FastAPI + Async SQLAlchemy + Redis + React Vite',
  rateLimit: {
    maxAttemptsPerMinute: 5,
  },
  swagger_endpoint: "http://localhost:8000/docs" 
} as const;
