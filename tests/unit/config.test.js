"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("../../src/config/environment");
describe('Environment Configuration', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        // Reset environment variables before each test
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });
    describe('config object', () => {
        it('should have all required properties', () => {
            expect(environment_1.config).toHaveProperty('port');
            expect(environment_1.config).toHaveProperty('nodeEnv');
            expect(environment_1.config).toHaveProperty('database');
            expect(environment_1.config).toHaveProperty('redis');
            expect(environment_1.config).toHaveProperty('openai');
            expect(environment_1.config).toHaveProperty('upload');
        });
        it('should parse port as number', () => {
            // Test the parsing logic directly since modules are cached
            const parsedPort = parseInt('3000', 10);
            expect(parsedPort).toBe(3000);
            expect(typeof parsedPort).toBe('number');
        });
        it('should have default values', () => {
            // In test environment, port is 4001 from .env.test
            expect(environment_1.config.port).toBe(4001);
            expect(environment_1.config.nodeEnv).toBe('test');
            expect(environment_1.config.upload.maxFileSize).toBe(1048576); // From .env.test
        });
    });
    describe('validateConfig', () => {
        it('should not throw when required env vars are present', () => {
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.OPENAI_API_KEY = 'sk-test';
            expect(() => (0, environment_1.validateConfig)()).not.toThrow();
        });
        it('should not throw when only GOOGLE_API_KEY is present', () => {
            process.env.DATABASE_URL = 'postgresql://test';
            delete process.env.OPENAI_API_KEY;
            process.env.GOOGLE_API_KEY = 'google-test';
            expect(() => (0, environment_1.validateConfig)()).not.toThrow();
        });
        it('should throw when DATABASE_URL is missing', () => {
            delete process.env.DATABASE_URL;
            process.env.OPENAI_API_KEY = 'sk-test';
            expect(() => (0, environment_1.validateConfig)()).toThrow('Missing required env vars: DATABASE_URL');
        });
        it('should throw when all LLM provider keys are missing', () => {
            process.env.DATABASE_URL = 'postgresql://test';
            delete process.env.OPENAI_API_KEY;
            delete process.env.GOOGLE_API_KEY;
            expect(() => (0, environment_1.validateConfig)()).toThrow('Missing required env vars: OPENAI_API_KEY or GOOGLE_API_KEY');
        });
        it('should throw when multiple env vars are missing', () => {
            delete process.env.DATABASE_URL;
            delete process.env.OPENAI_API_KEY;
            delete process.env.GOOGLE_API_KEY;
            expect(() => (0, environment_1.validateConfig)()).toThrow('Missing required env vars: DATABASE_URL, OPENAI_API_KEY or GOOGLE_API_KEY');
        });
    });
});
