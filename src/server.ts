import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config, validateConfig } from './config/environment';
import { db } from './database/client';
import { redis } from './database/redis';
import { logger } from './utils/logger';
import { handleMulterError, uploadSinglePDF } from './api/middleware/upload';

// Validate configuration before starting
validateConfig();

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : true, // Allow all in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Compression middleware
app.use(
  compression({
    level: 6, // Good balance between compression and speed
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with this request header
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter function
      return compression.filter(req, res);
    },
  })
);

// Body parsing middleware
app.use(
  express.json({
    limit: '10mb',
    strict: true,
    verify: (req, res, buf) => {
      // Raw body for webhook verification if needed
      (req as any).rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;

  logger.info('Request received', {
    method,
    url,
    ip: ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    logger.info('Request completed', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // Test database connectivity
    try {
      await db.query('SELECT 1');
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Test Redis connectivity
    try {
      await redis.connect();
      await redis.set('health-check', 'ok', 10); // 10 second TTL
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// Import API routes
import documentRoutes from './api/routes/documents';

// Mount API routes
app.use('/api/documents', documentRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'PDF Summary AI',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      documents: {
        upload: 'POST /api/documents/upload',
        list: 'GET /api/documents',
        stats: 'GET /api/documents/stats',
        get: 'GET /api/documents/:id',
        summarize: 'POST /api/documents/:id/summarize',
        delete: 'DELETE /api/documents/:id',
      },
    },
  });
});

// Test upload endpoint
app.post('/api/upload/pdf', uploadSinglePDF, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a PDF file',
    });
  }

  logger.info('File uploaded successfully', {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: req.file.path,
  });

  res.json({
    message: 'File uploaded successfully',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
    },
  });
});

// 404 handler for unmatched routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Multer error handling
app.use(handleMulterError);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Don't leak error details in production
  const isDevelopment = config.nodeEnv === 'development';

  res.status(error.statusCode || 500).json({
    error: error.name || 'InternalServerError',
    message: isDevelopment ? error.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  try {
    // Close database connections
    await db.close();
    await redis.disconnect();

    logger.info('Database and Redis connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 PDF Summary AI server running`, {
    port: config.port,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind =
    typeof config.port === 'string'
      ? 'Pipe ' + config.port
      : 'Port ' + config.port;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

export default app;
