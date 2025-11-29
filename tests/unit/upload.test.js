"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_1 = require("../../src/api/middleware/upload");
const testHelpers_1 = require("../utils/testHelpers");
const mockData_1 = require("../fixtures/mockData");
describe('Upload Middleware', () => {
    describe('pdfFileFilter', () => {
        it('should accept valid PDF files', (done) => {
            const req = (0, testHelpers_1.createMockRequest)();
            const file = { ...mockData_1.mockMulterFiles.validPDF };
            const cb = jest.fn();
            (0, upload_1.pdfFileFilter)(req, file, cb);
            expect(cb).toHaveBeenCalledWith(null, true);
            done();
        });
        it('should reject non-PDF files', (done) => {
            const req = (0, testHelpers_1.createMockRequest)();
            const file = { ...mockData_1.mockMulterFiles.invalidFile };
            const cb = jest.fn();
            (0, upload_1.pdfFileFilter)(req, file, cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error));
            expect(cb.mock.calls[0][0].message).toBe('Only PDF files are allowed');
            done();
        });
    });
    describe('validateFileSize', () => {
        const fileSizeValidator = (0, upload_1.validateFileSize)(1024 * 1024); // 1MB limit
        it('should accept files within size limit', (done) => {
            const req = (0, testHelpers_1.createMockRequest)();
            const file = { ...mockData_1.mockMulterFiles.validPDF, size: 500000 }; // 500KB
            const cb = jest.fn();
            fileSizeValidator(req, file, cb);
            expect(cb).toHaveBeenCalledWith(null, true);
            done();
        });
        it('should reject files exceeding size limit', (done) => {
            const req = (0, testHelpers_1.createMockRequest)();
            const file = { ...mockData_1.mockMulterFiles.oversizedFile };
            const cb = jest.fn();
            fileSizeValidator(req, file, cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error));
            expect(cb.mock.calls[0][0].message).toContain('File size exceeds');
            done();
        });
    });
    describe('handleMulterError', () => {
        it('should handle file size limit errors', () => {
            // Create a proper MulterError
            const multer = require('multer');
            const error = new multer.MulterError('LIMIT_FILE_SIZE', 'file');
            const req = (0, testHelpers_1.createMockRequest)();
            const res = (0, testHelpers_1.createMockResponse)();
            const next = (0, testHelpers_1.createMockNext)();
            (0, upload_1.handleMulterError)(error, req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'UploadError',
                message: expect.stringContaining('File size exceeds'),
                timestamp: expect.any(String)
            });
            expect(next).not.toHaveBeenCalled();
        });
        it('should pass non-multer errors to next middleware', () => {
            const error = new Error('Some other error');
            const req = (0, testHelpers_1.createMockRequest)();
            const res = (0, testHelpers_1.createMockResponse)();
            const next = (0, testHelpers_1.createMockNext)();
            (0, upload_1.handleMulterError)(error, req, res, next);
            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});
