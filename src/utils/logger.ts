/**
 * Simple logger utility
 * Replace with Winston or similar in production
 */

export const logger = {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  },

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  },

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta || '');
  },

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta || '');
  },
};
