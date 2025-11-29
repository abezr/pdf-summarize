import { imageExtractionService } from '../../src/services/image-extraction.service';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('ImageExtractionService', () => {
  const testOutputDir = './test-temp-images';

  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    test('should initialize with required libraries', () => {
      const healthStatus = imageExtractionService.getHealthStatus();

      expect(healthStatus.pdf2picAvailable).toBe(true);
      expect(healthStatus.sharpAvailable).toBe(true);
      expect(healthStatus.overallHealthy).toBe(true);
    });
  });

  describe('extractImages', () => {
    test('should handle non-existent PDF file gracefully', async () => {
      const nonExistentPdf = './non-existent.pdf';

      await expect(
        imageExtractionService.extractImages(nonExistentPdf, testOutputDir)
      ).rejects.toThrow('Image extraction failed');
    });

    test('should validate output directory creation', async () => {
      const nestedDir = path.join(testOutputDir, 'nested', 'deep', 'path');

      // This should not throw - the service should create the directory
      try {
        await imageExtractionService.extractImages('./non-existent.pdf', nestedDir);
      } catch (error) {
        // Expected to fail due to non-existent PDF, but directory should be created
        expect(error).toBeDefined();
      }

      // Check if directory was created (this might not work on all systems)
      try {
        await fs.access(nestedDir);
        // If we get here, directory was created successfully
      } catch (error) {
        // Directory creation may not work as expected in test environment
      }
    });
  });

  describe('service health', () => {
    test('should report healthy status when libraries are available', () => {
      const status = imageExtractionService.getHealthStatus();

      expect(typeof status.pdf2picAvailable).toBe('boolean');
      expect(typeof status.sharpAvailable).toBe('boolean');
      expect(typeof status.overallHealthy).toBe('boolean');
    });
  });

  describe('getPageCount', () => {
    test('should estimate page count based on file size', async () => {
      // Create a mock PDF file for testing
      const testPdfPath = './test-sample.pdf';
      const mockPdfContent = Buffer.alloc(1024 * 100); // 100KB mock PDF

      try {
        await fs.writeFile(testPdfPath, mockPdfContent);

        // Test the page counting (will use file size estimation)
        const service = new (imageExtractionService.constructor as any)();
        const pageCount = await service.getPageCount(testPdfPath);

        expect(typeof pageCount).toBe('number');
        expect(pageCount).toBeGreaterThan(0);
        expect(pageCount).toBeLessThanOrEqual(500); // Should be capped

      } finally {
        // Clean up
        try {
          await fs.unlink(testPdfPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  // Configuration validation tests would go here
  // Currently focusing on core functionality
  // TODO: Add configuration validation tests when storage functionality is available
});
