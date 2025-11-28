import { register } from './metrics/metrics';
import { initializeTracing, getTracer, spanHelpers, contextHelpers } from './tracing/tracer';
import { logger } from '../utils/logger';
import { shouldSkipObservability } from '../utils/runtime';

// Initialize observability stack
export function initializeObservability(
  serviceName: string = 'pdf-summary-ai',
  serviceVersion: string = '1.0.0'
) {
  if (shouldSkipObservability()) {
    logger.info('Observability initialization skipped', {
      reason: process.env.DISABLE_OBSERVABILITY ? 'env_override' : 'lazy_init',
      serviceName,
      serviceVersion,
    });

    return {
      success: true,
      skipped: true,
    };
  }

  try {
    // Initialize OpenTelemetry tracing
    initializeTracing(serviceName, serviceVersion);

    logger.info('Observability stack initialized', {
      serviceName,
      serviceVersion,
      prometheusEndpoint: 'http://localhost:9464/metrics',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    return {
      success: true,
      prometheusEndpoint: 'http://localhost:9464/metrics',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    };
  } catch (error) {
    logger.error('Failed to initialize observability stack', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

// Health check endpoint for metrics
export function createMetricsEndpoint() {
  return async (req: any, res: any) => {
    try {
      const metrics = await register.metrics();
      res.set('Content-Type', register.contentType);
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to serve metrics', { error: error.message });
      res.status(500).send('Error generating metrics');
    }
  };
}

// Export all observability components
export {
  // Metrics
  register as metricsRegister,

  // Tracing
  getTracer,
  spanHelpers,
  contextHelpers,

  // Logger (re-export for convenience)
  logger,
};

// Type exports
export type { Span, SpanStatusCode } from './tracing/tracer';
