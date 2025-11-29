import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'all.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),

  // File transport for error logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),
];

// Create the logger instance
const winstonLogger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Enhanced logger with structured logging support
export const logger = {
  info(message: string, meta?: Record<string, any>): void {
    winstonLogger.info(message, meta);
  },

  warn(message: string, meta?: Record<string, any>): void {
    winstonLogger.warn(message, meta);
  },

  error(message: string, meta?: Record<string, any>): void {
    winstonLogger.error(message, meta);
  },

  debug(message: string, meta?: Record<string, any>): void {
    winstonLogger.debug(message, meta);
  },

  http(message: string, meta?: Record<string, any>): void {
    winstonLogger.http(message, meta);
  },

  // Structured logging helpers
  withContext(context: Record<string, any>) {
    return {
      info: (message: string, meta?: Record<string, any>) =>
        winstonLogger.info(message, { ...context, ...meta }),
      warn: (message: string, meta?: Record<string, any>) =>
        winstonLogger.warn(message, { ...context, ...meta }),
      error: (message: string, meta?: Record<string, any>) =>
        winstonLogger.error(message, { ...context, ...meta }),
      debug: (message: string, meta?: Record<string, any>) =>
        winstonLogger.debug(message, { ...context, ...meta }),
      http: (message: string, meta?: Record<string, any>) =>
        winstonLogger.http(message, { ...context, ...meta }),
    };
  },

  // Performance logging
  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      winstonLogger.info(`Operation completed: ${operation}`, {
        operation,
        duration,
        unit: 'ms'
      });
    };
  },

  // Request logging middleware helper
  logRequest(req: any, res: any, next: any): void {
    const start = Date.now();
    const { method, url, ip } = req;

    winstonLogger.http(`Request: ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;

      winstonLogger.http(`Response: ${method} ${url} ${statusCode}`, {
        method,
        url,
        statusCode,
        duration,
        unit: 'ms'
      });
    });

    next();
  }
};

// Export winston instance for advanced usage
export { winstonLogger };
