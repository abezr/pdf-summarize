module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Roots for test files
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Transform ES modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!uuid/.*)'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/server.ts', // Entry point
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Minimum coverage thresholds (disabled for initial setup)
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Handle module mocking
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
};
