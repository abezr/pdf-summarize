"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryAsync = exports.waitForCondition = exports.LLMTestHelper = exports.ApiTestHelper = exports.FileSystemTestHelper = exports.RedisTestHelper = exports.DatabaseTestHelper = exports.createMockNext = exports.createMockResponse = exports.createMockRequest = void 0;
const client_1 = require("../../src/database/client");
const redis_1 = require("../../src/database/redis");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Mock Express request/response
const createMockRequest = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/',
    ip: '127.0.0.1',
    get: jest.fn((header) => undefined),
    ...overrides
});
exports.createMockRequest = createMockRequest;
const createMockResponse = () => {
    const res = {
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
exports.createMockResponse = createMockResponse;
const createMockNext = () => jest.fn();
exports.createMockNext = createMockNext;
// Database test helpers
class DatabaseTestHelper {
    static async cleanDatabase() {
        try {
            // Clean all tables (be careful with foreign key constraints)
            await client_1.db.query('TRUNCATE TABLE documents, summaries, users CASCADE');
        }
        catch (error) {
            // Tables might not exist yet, ignore
        }
    }
    static async closeConnection() {
        await client_1.db.close();
    }
}
exports.DatabaseTestHelper = DatabaseTestHelper;
// Redis test helpers
class RedisTestHelper {
    static async cleanRedis() {
        await redis_1.redis.connect();
        // Clear test database (database 1 in test config)
        await redis_1.redis.client.flushDb();
    }
    static async closeConnection() {
        await redis_1.redis.disconnect();
    }
}
exports.RedisTestHelper = RedisTestHelper;
// File system test helpers
class FileSystemTestHelper {
    static async cleanTestUploads() {
        const testUploadsDir = path_1.default.join(process.cwd(), 'tests', 'fixtures', 'uploads');
        try {
            const files = await promises_1.default.readdir(testUploadsDir);
            await Promise.all(files.map(file => promises_1.default.unlink(path_1.default.join(testUploadsDir, file))));
        }
        catch (error) {
            // Directory might not exist, ignore
        }
    }
    static async createTestFile(filename, content) {
        const testUploadsDir = path_1.default.join(process.cwd(), 'tests', 'fixtures', 'uploads');
        await promises_1.default.mkdir(testUploadsDir, { recursive: true });
        const filePath = path_1.default.join(testUploadsDir, filename);
        await promises_1.default.writeFile(filePath, content);
        return filePath;
    }
}
exports.FileSystemTestHelper = FileSystemTestHelper;
// API test helpers
class ApiTestHelper {
    static async makeRequest(method, url, options = {}) {
        // This would be used with supertest in integration tests
        // For now, return mock response
        return {
            status: 200,
            body: { success: true },
            headers: {}
        };
    }
}
exports.ApiTestHelper = ApiTestHelper;
// LLM test helpers
class LLMTestHelper {
    static mockOpenAIResponse(response) {
        return jest.fn().mockResolvedValue(response);
    }
    static mockGoogleResponse(response) {
        return jest.fn().mockResolvedValue(response);
    }
    static createMockLLMProvider(name) {
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
exports.LLMTestHelper = LLMTestHelper;
// General utilities
const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
};
exports.waitForCondition = waitForCondition;
const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};
exports.retryAsync = retryAsync;
