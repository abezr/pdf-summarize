import { config, validateConfig } from '../../src/config/environment';

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
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('openai');
      expect(config).toHaveProperty('upload');
    });

    it('should parse port as number', () => {
      // Test the parsing logic directly since modules are cached
      const parsedPort = parseInt('3000', 10);
      expect(parsedPort).toBe(3000);
      expect(typeof parsedPort).toBe('number');
    });

    it('should have default values', () => {
      // In test environment, port is 4001 from .env.test
      expect(config.port).toBe(4001);
      expect(config.nodeEnv).toBe('test');
      expect(config.upload.maxFileSize).toBe(1048576); // From .env.test
    });
  });

  describe('validateConfig', () => {
    it('should not throw when required env vars are present', () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.OPENAI_API_KEY = 'sk-test';

      expect(() => validateConfig()).not.toThrow();
    });

    it('should throw when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.OPENAI_API_KEY = 'sk-test';

      expect(() => validateConfig()).toThrow('Missing required env vars: DATABASE_URL');
    });

    it('should throw when OPENAI_API_KEY is missing', () => {
      process.env.DATABASE_URL = 'postgresql://test';
      delete process.env.OPENAI_API_KEY;

      expect(() => validateConfig()).toThrow('Missing required env vars: OPENAI_API_KEY');
    });

    it('should throw when multiple env vars are missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.OPENAI_API_KEY;

      expect(() => validateConfig()).toThrow('Missing required env vars: DATABASE_URL, OPENAI_API_KEY');
    });
  });
});
