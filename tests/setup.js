"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load test environment variables
dotenv_1.default.config({ path: '.env.test' });
// Set test environment
process.env.NODE_ENV = 'test';
// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
    // Suppress console.error and console.warn during tests unless explicitly needed
    console.error = jest.fn();
    console.warn = jest.fn();
});
afterAll(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});
// Global test utilities
global.testUtils = {
    // Helper to wait for async operations
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    // Helper to create test timeouts
    withTimeout: (promise, timeoutMs = 5000) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs))
        ]);
    }
};
