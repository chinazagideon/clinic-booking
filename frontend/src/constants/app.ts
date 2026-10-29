export const APP_CONFIG = {
  name: 'clinical',
  version: 'v1.0',
  title: 'Clinic Booking',
  tagline: "Modern patient scheduling software",
  copyrightNotice: '© 2026 Clinic Booking Assessment',
  stackDescription: 'FastAPI + Async SQLAlchemy + Redis + React Vite',
  rateLimit: {
    maxAttemptsPerMinute: 5,
  },
  swagger_endpoint: "http://localhost:8000/docs" 
} as const;
