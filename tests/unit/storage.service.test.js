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
const storage_service_1 = require("../../src/services/storage.service");
const fs_1 = require("fs");
const path = __importStar(require("path"));
describe('StorageService', () => {
    const testStorageDir = './test-storage';
    beforeAll(async () => {
        // Ensure test directory exists
        await fs_1.promises.mkdir(testStorageDir, { recursive: true });
    });
    afterAll(async () => {
        // Clean up test directory
        try {
            await fs_1.promises.rm(testStorageDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    });
    describe('LocalStorageBackend', () => {
        let backend;
        beforeEach(() => {
            backend = new storage_service_1.LocalStorageBackend(testStorageDir);
        });
        test('should save a file successfully', async () => {
            const testBuffer = Buffer.from('test file content');
            const fileName = 'test.txt';
            const result = await backend.save(testBuffer, fileName);
            expect(result).toBeDefined();
            expect(result.fileName).toContain('test_'); // Uses timestamp naming
            expect(result.fileName).toContain('.txt');
            expect(result.size).toBe(testBuffer.length);
            expect(result.mimeType).toBe('text/plain');
            expect(await backend.exists(result.id)).toBe(true);
        });
        test('should handle different naming strategies', async () => {
            const testBuffer = Buffer.from('test');
            const fileName = 'test.png';
            // Test timestamp strategy
            const result1 = await backend.save(testBuffer, fileName, { namingStrategy: 'timestamp' });
            expect(result1.fileName).toContain('test_');
            expect(result1.fileName).toContain('.png');
            // Test original strategy
            const result2 = await backend.save(testBuffer, fileName, { namingStrategy: 'original' });
            expect(result2.fileName).toBe(fileName);
        });
        test('should create subdirectories when requested', async () => {
            const testBuffer = Buffer.from('test');
            const fileName = 'test.jpg';
            const result = await backend.save(testBuffer, fileName, { createSubdirs: true });
            // Check that file exists in a subdirectory structure
            expect(await backend.exists(result.id)).toBe(true);
            // Verify the path contains date-based subdirs
            const date = new Date();
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            expect(result.filePath).toContain(path.join(year, month));
        });
        test('should retrieve a saved file', async () => {
            const testBuffer = Buffer.from('retrieve test content');
            const fileName = 'retrieve.txt';
            const saveResult = await backend.save(testBuffer, fileName);
            const retrievedBuffer = await backend.get(saveResult.id);
            expect(Buffer.compare(retrievedBuffer, testBuffer)).toBe(0);
        });
        test('should delete a file', async () => {
            const testBuffer = Buffer.from('delete test');
            const fileName = 'delete.txt';
            const saveResult = await backend.save(testBuffer, fileName);
            expect(await backend.exists(saveResult.id)).toBe(true);
            await backend.delete(saveResult.id);
            expect(await backend.exists(saveResult.id)).toBe(false);
        });
        test('should throw error when deleting non-existent file', async () => {
            await expect(backend.delete('non-existent.txt')).rejects.toThrow('File not found');
        });
        test('should throw error when getting non-existent file', async () => {
            await expect(backend.get('non-existent.txt')).rejects.toThrow('File not found');
        });
        test('should report healthy status', () => {
            const status = backend.getHealthStatus();
            expect(status.healthy).toBe(true);
            expect(status.message).toContain(testStorageDir);
        });
    });
    describe('StorageService', () => {
        let service;
        beforeEach(() => {
            service = new storage_service_1.StorageService(new storage_service_1.LocalStorageBackend(testStorageDir));
        });
        test('should save a file using service', async () => {
            const testBuffer = Buffer.from('service test');
            const fileName = 'service.txt';
            const result = await service.save(testBuffer, fileName);
            expect(result).toBeDefined();
            expect(result.fileName).toContain('service_'); // Uses timestamp naming
            expect(result.fileName).toContain('.txt');
            expect(result.size).toBe(testBuffer.length);
        });
        test('should save an image with optimized settings', async () => {
            const testBuffer = Buffer.from('fake image data');
            const fileName = 'test.png';
            const result = await service.saveImage(testBuffer, fileName);
            expect(result).toBeDefined();
            expect(result.fileName).toContain('test_'); // Uses timestamp naming
            expect(result.fileName).toContain('.png');
            expect(result.mimeType).toBe('image/png');
            // Should create subdirectories for images
            const date = new Date();
            const year = date.getFullYear().toString();
            expect(result.filePath).toContain(year);
        });
        test('should check file existence', async () => {
            const testBuffer = Buffer.from('existence test');
            const fileName = 'existence.txt';
            const result = await service.save(testBuffer, fileName);
            expect(await service.exists(result.id)).toBe(true);
            expect(await service.exists('non-existent')).toBe(false);
        });
    });
    describe('singleton storageService', () => {
        test('should be available and functional', () => {
            const status = storage_service_1.storageService.getHealthStatus();
            expect(status).toBeDefined();
            expect(typeof status.healthy).toBe('boolean');
        });
    });
});
