// Environment configuration
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:4000',
  appName: import.meta.env.VITE_APP_NAME || 'PDF Summary AI',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
};
