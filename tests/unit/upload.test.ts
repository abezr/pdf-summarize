import { pdfFileFilter, validateFileSize, handleMulterError } from '../../src/api/middleware/upload';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/testHelpers';
import { mockMulterFiles } from '../fixtures/mockData';

describe('Upload Middleware', () => {
  describe('pdfFileFilter', () => {
    it('should accept valid PDF files', (done) => {
      const req = createMockRequest();
      const file = { ...mockMulterFiles.validPDF };
      const cb = jest.fn();

      pdfFileFilter(req as any, file as any, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
      done();
    });

    it('should reject non-PDF files', (done) => {
      const req = createMockRequest();
      const file = { ...mockMulterFiles.invalidFile };
      const cb = jest.fn();

      pdfFileFilter(req as any, file as any, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      expect(cb.mock.calls[0][0].message).toBe('Only PDF files are allowed');
      done();
    });
  });

  describe('validateFileSize', () => {
    const fileSizeValidator = validateFileSize(1024 * 1024); // 1MB limit

    it('should accept files within size limit', (done) => {
      const req = createMockRequest();
      const file = { ...mockMulterFiles.validPDF, size: 500000 }; // 500KB
      const cb = jest.fn();

      fileSizeValidator(req as any, file as any, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
      done();
    });

    it('should reject files exceeding size limit', (done) => {
      const req = createMockRequest();
      const file = { ...mockMulterFiles.oversizedFile };
      const cb = jest.fn();

      fileSizeValidator(req as any, file as any, cb);

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
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      handleMulterError(error, req as any, res as any, next);

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
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      handleMulterError(error, req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
