/**
 * API Input Validation Schemas using Zod
 * Comprehensive validation for all API endpoints
 */

import { z } from 'zod';

// Document status enum
export const DocumentStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

// Base document schema
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().optional(),
  filename: z.string().min(1).max(255),
  file_size: z.number().int().positive(),
  status: DocumentStatusSchema,
  pdf_url: z.string().url().optional(),
  graph_data: z.any().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

// Create document input schema
export const CreateDocumentSchema = z.object({
  user_id: z.string().optional(),
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/\.(pdf|PDF)$/, 'Filename must end with .pdf'),
  file_size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024), // 50MB max
  pdf_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

// Update document input schema
export const UpdateDocumentSchema = z.object({
  status: DocumentStatusSchema.optional(),
  graph_data: z.any().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Document query parameters schema
export const DocumentQuerySchema = z.object({
  user_id: z.string().optional(),
  status: DocumentStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  order_by: z
    .enum(['created_at', 'updated_at', 'filename'])
    .default('created_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc'),
});

// Document ID parameter schema
export const DocumentIdParamSchema = z.object({
  id: z.string().uuid('Invalid document ID format'),
});

// Summarization options schema
export const SummarizationOptionsSchema = z.object({
  type: z
    .enum([
      'executive',
      'detailed',
      'chapter',
      'bullet-points',
      'narrative',
      'technical',
    ])
    .default('executive'),
  max_length: z.number().int().min(50).max(5000).default(500),
  focus: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  style: z.enum(['formal', 'casual', 'technical']).default('formal'),
  model: z.string().optional(),
  provider: z.enum(['openai', 'google', 'auto']).default('auto'),
});

// File upload schema (for multipart/form-data validation)
export const FileUploadSchema = z.object({
  file: z
    .any()
    .refine((file) => {
      if (!file) return false;
      // Check if it's a file object with required properties
      return (
        file &&
        typeof file === 'object' &&
        file.originalname &&
        file.mimetype &&
        file.size !== undefined
      );
    }, 'Valid file is required')
    .refine((file) => {
      // Check file type
      return file.mimetype === 'application/pdf';
    }, 'Only PDF files are allowed')
    .refine((file) => {
      // Check file size (50MB max)
      return file.size <= 50 * 1024 * 1024;
    }, 'File size must be less than 50MB')
    .refine((file) => {
      // Check filename
      return file.originalname && file.originalname.match(/\.(pdf|PDF)$/);
    }, 'Filename must end with .pdf'),
});

// User ID from headers or query params
export const UserIdSchema = z.object({
  user_id: z.string().optional(),
});

// API Response schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().int().min(0),
      limit: z.number().int().positive(),
      offset: z.number().int().min(0),
      has_more: z.boolean(),
    }),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.string().datetime(),
});

// Health check response
export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  uptime: z.number().positive(),
  services: z.record(z.enum(['healthy', 'unhealthy'])),
});

// Statistics response
export const DocumentStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number().int().min(0),
    by_status: z.record(DocumentStatusSchema, z.number().int().min(0)),
    total_size: z.number().int().min(0),
    recent_uploads: z.number().int().min(0),
  }),
  timestamp: z.string().datetime(),
});

// Summarization response
export const SummarizationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: z.string(),
    type: z.enum([
      'executive',
      'detailed',
      'chapter',
      'bullet-points',
      'narrative',
      'technical',
    ]),
    model: z.string(),
    provider: z.string(),
    tokens_used: z.object({
      prompt: z.number().int().min(0),
      completion: z.number().int().min(0),
      total: z.number().int().min(0),
    }),
    cost: z.number().min(0),
    processing_time: z.number().positive(),
    graph_stats: z.object({
      nodes_processed: z.number().int().min(0),
      sections_found: z.number().int().min(0),
      total_content_length: z.number().int().min(0),
    }),
  }),
  timestamp: z.string().datetime(),
});

// Type exports for use in controllers
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
export type DocumentQueryParams = z.infer<typeof DocumentQuerySchema>;
export type DocumentIdParams = z.infer<typeof DocumentIdParamSchema>;
export type SummarizationOptions = z.infer<typeof SummarizationOptionsSchema>;
export type FileUploadData = z.infer<typeof FileUploadSchema>;

// Validation helper functions
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage = 'Validation failed'
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      throw new Error(`${errorMessage}: ${JSON.stringify(details, null, 2)}`);
    }
    throw new Error(errorMessage);
  }
}

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, unknown>
): T {
  return validateAndParse(schema, query, 'Invalid query parameters');
}

export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): T {
  return validateAndParse(schema, body, 'Invalid request body');
}

export function validatePathParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string>
): T {
  return validateAndParse(schema, params, 'Invalid path parameters');
}

// Middleware helper for Express
export function createValidationMiddleware(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      if (schema === FileUploadSchema) {
        // Special handling for file uploads
        validateAndParse(schema, { file: req.file }, 'Invalid file upload');
      } else if (req.method === 'GET') {
        // Validate query params for GET requests
        req.validatedQuery = validateQueryParams(schema, req.query);
      } else {
        // Validate body for other requests
        req.validatedBody = validateRequestBody(schema, req.body);
      }
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
}
