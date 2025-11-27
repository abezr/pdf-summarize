import { Request, Response } from 'express';
import { db } from '../../src/database/client';
import { redis } from '../../src/database/redis';
import fs from 'fs/promises';
import path from 'path';

// Mock Express request/response
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
  ip: '127.0.0.1',
  get: jest.fn((header: string) => undefined),
  ...overrides
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    locals: {}
  };
  return res;
};

export const createMockNext = () => jest.fn();

// Database test helpers
export class DatabaseTestHelper {
  static async cleanDatabase(): Promise<void> {
    try {
      // Clean all tables (be careful with foreign key constraints)
      await db.query('TRUNCATE TABLE documents, summaries, users CASCADE');
    } catch (error) {
      // Tables might not exist yet, ignore
    }
  }

  static async closeConnection(): Promise<void> {
    await db.close();
  }
}

// Redis test helpers
export class RedisTestHelper {
  static async cleanRedis(): Promise<void> {
    await redis.connect();
    // Clear test database (database 1 in test config)
    await (redis as any).client.flushDb();
  }

  static async closeConnection(): Promise<void> {
    await redis.disconnect();
  }
}

// File system test helpers
export class FileSystemTestHelper {
  static async cleanTestUploads(): Promise<void> {
    const testUploadsDir = path.join(process.cwd(), 'tests', 'fixtures', 'uploads');

    try {
      const files = await fs.readdir(testUploadsDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(testUploadsDir, file)))
      );
    } catch (error) {
      // Directory might not exist, ignore
    }
  }

  static async createTestFile(filename: string, content: string | Buffer): Promise<string> {
    const testUploadsDir = path.join(process.cwd(), 'tests', 'fixtures', 'uploads');
    await fs.mkdir(testUploadsDir, { recursive: true });

    const filePath = path.join(testUploadsDir, filename);
    await fs.writeFile(filePath, content);
    return filePath;
  }
}

// API test helpers
export class ApiTestHelper {
  static async makeRequest(
    method: string,
    url: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      query?: Record<string, string>;
    } = {}
  ): Promise<{ status: number; body: any; headers: any }> {
    // This would be used with supertest in integration tests
    // For now, return mock response
    return {
      status: 200,
      body: { success: true },
      headers: {}
    };
  }
}

// LLM test helpers
export class LLMTestHelper {
  static mockOpenAIResponse(response: any) {
    return jest.fn().mockResolvedValue(response);
  }

  static mockGoogleResponse(response: any) {
    return jest.fn().mockResolvedValue(response);
  }

  static createMockLLMProvider(name: string) {
    return {
      name,
      supportedModels: ['test-model'],
      generateText: jest.fn(),
      analyzeImage: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
      calculateCost: jest.fn().mockReturnValue(0.001)
    };
  }
}

// General utilities
export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
};

export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};
