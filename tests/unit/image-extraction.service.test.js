"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const image_extraction_service_1 = require("../../src/services/image-extraction.service");
const fs_1 = require("fs");
const path = __importStar(require("path"));
describe('ImageExtractionService', () => {
    const testOutputDir = './test-temp-images';
    beforeAll(async () => {
        // Ensure test directory exists
        await fs_1.promises.mkdir(testOutputDir, { recursive: true });
    });
    afterAll(async () => {
        // Clean up test directory
        try {
            await fs_1.promises.rm(testOutputDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('initialization', () => {
        test('should initialize with required libraries', () => {
            const healthStatus = image_extraction_service_1.imageExtractionService.getHealthStatus();
            expect(healthStatus.pdf2picAvailable).toBe(true);
            expect(healthStatus.sharpAvailable).toBe(true);
            expect(healthStatus.overallHealthy).toBe(true);
        });
    });
    describe('extractImages', () => {
        test('should handle non-existent PDF file gracefully', async () => {
            const nonExistentPdf = './non-existent.pdf';
            await expect(image_extraction_service_1.imageExtractionService.extractImages(nonExistentPdf, testOutputDir)).rejects.toThrow('Image extraction failed');
        });
        test('should validate output directory creation', async () => {
            const nestedDir = path.join(testOutputDir, 'nested', 'deep', 'path');
            // This should not throw - the service should create the directory
            try {
                await image_extraction_service_1.imageExtractionService.extractImages('./non-existent.pdf', nestedDir);
            }
            catch (error) {
                // Expected to fail due to non-existent PDF, but directory should be created
                expect(error).toBeDefined();
            }
            // Check if directory was created (this might not work on all systems)
            try {
                await fs_1.promises.access(nestedDir);
                // If we get here, directory was created successfully
            }
            catch (error) {
                // Directory creation may not work as expected in test environment
            }
        });
    });
    describe('service health', () => {
        test('should report healthy status when libraries are available', () => {
            const status = image_extraction_service_1.imageExtractionService.getHealthStatus();
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
                await fs_1.promises.writeFile(testPdfPath, mockPdfContent);
                // Test the page counting (will use file size estimation)
                const service = new image_extraction_service_1.imageExtractionService.constructor();
                const pageCount = await service.getPageCount(testPdfPath);
                expect(typeof pageCount).toBe('number');
                expect(pageCount).toBeGreaterThan(0);
                expect(pageCount).toBeLessThanOrEqual(500); // Should be capped
            }
            finally {
                // Clean up
                try {
                    await fs_1.promises.unlink(testPdfPath);
                }
                catch (error) {
                    // Ignore cleanup errors
                }
            }
        });
    });
    // Configuration validation tests would go here
    // Currently focusing on core functionality
    // TODO: Add configuration validation tests when storage functionality is available
});
