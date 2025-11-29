import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

// Initialize OpenTelemetry SDK
let sdk: NodeSDK | null = null;

export function initializeTracing(serviceName: string = 'pdf-summary-ai', serviceVersion: string = '1.0.0') {
  if (sdk) {
    return; // Already initialized
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'document-processing',
  });

  // Prometheus exporter for metrics
  const prometheusExporter = new PrometheusExporter({
    port: 9464, // Default Prometheus metrics port
  }, () => {
    console.log('Prometheus scrape endpoint: http://localhost:9464/metrics');
  });

  // Jaeger exporter for traces
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: jaegerExporter,
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Configure auto-instrumentations
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

// Get tracer instance
export function getTracer(name: string = 'pdf-summary-ai-tracer') {
  return trace.getTracer(name);
}

// Span helper functions
export const spanHelpers = {
  // Create a span for HTTP requests
  startHttpSpan(operation: string, method: string, url: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`${operation} ${method} ${url}`, {
      attributes: {
        'http.method': method,
        'http.url': url,
        'operation': operation,
      },
    });
    return span;
  },

  // Create a span for PDF processing
  startPdfProcessingSpan(operation: string, documentId?: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`pdf.${operation}`, {
      attributes: {
        'operation': operation,
        'document.id': documentId,
        'component': 'pdf-processor',
      },
    });
    return span;
  },

  // Create a span for LLM operations
  startLlmSpan(provider: string, model: string, operation: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`llm.${operation}`, {
      attributes: {
        'llm.provider': provider,
        'llm.model': model,
        'operation': operation,
        'component': 'llm-provider',
      },
    });
    return span;
  },

  // Create a span for graph operations
  startGraphSpan(operation: string, documentId?: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`graph.${operation}`, {
      attributes: {
        'operation': operation,
        'document.id': documentId,
        'component': 'graph-builder',
      },
    });
    return span;
  },

  // Create a span for database operations
  startDbSpan(operation: string, table?: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`db.${operation}`, {
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'component': 'database',
      },
    });
    return span;
  },

  // Create a span for cache operations
  startCacheSpan(operation: string, cacheType: string): Span {
    const tracer = getTracer();
    const span = tracer.startSpan(`cache.${operation}`, {
      attributes: {
        'cache.operation': operation,
        'cache.type': cacheType,
        'component': 'cache',
      },
    });
    return span;
  },

  // Helper to record errors on spans
  recordError(span: Span, error: Error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  },

  // Helper to add attributes to spans
  addAttributes(span: Span, attributes: Record<string, string | number | boolean>) {
    span.setAttributes(attributes);
  },

  // Helper to end span
  endSpan(span: Span) {
    span.end();
  },
};

// Context helpers for tracing
export const contextHelpers = {
  // Wrap a function with tracing
  withSpan<T>(
    spanName: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const tracer = getTracer();
    return tracer.startActiveSpan(spanName, async (span) => {
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  },

  // Wrap an async function with tracing
  async wrapAsync<T>(
    spanName: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    return contextHelpers.withSpan(spanName, async (span) => {
      if (attributes) {
        span.setAttributes(attributes);
      }
      return await fn();
    });
  },
};

export { Span, SpanStatusCode };
