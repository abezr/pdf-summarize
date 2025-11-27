import { Request, Response } from 'express';
import { DocumentController } from '../../src/api/controllers/document.controller';
import { documentService } from '../../src/services/document.service';

// Mock services
jest.mock('../../src/services/document.service');
jest.mock('../../src/services/pdf-parser.service');
jest.mock('../../src/services/graph/graph-builder');
jest.mock('../../src/services/llm/summarization.service');

describe('DocumentController', () => {
  let controller: DocumentController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new DocumentController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {};
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };

    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    test('should upload document successfully', async () => {
      const mockFile = {
        filename: 'test.pdf',
        originalname: 'original.pdf',
        size: 1024,
        mimetype: 'application/pdf'
      };

      const mockDocument = {
        id: 'doc123',
        filename: 'original.pdf',
        status: 'pending',
        created_at: new Date()
      };

      mockRequest.file = mockFile as any;
      mockRequest.user = { id: 'user123' };

      (documentService.createDocument as jest.Mock).mockResolvedValue(mockDocument);

      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(documentService.createDocument).toHaveBeenCalledWith({
        filename: 'original.pdf',
        file_size: 1024,
        pdf_url: '/uploads/test.pdf',
        user_id: 'user123',
        metadata: expect.objectContaining({
          original_filename: 'original.pdf',
          mimetype: 'application/pdf'
        })
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          document: {
            id: 'doc123',
            filename: 'original.pdf',
            status: 'pending',
            created_at: expect.any(Date)
          }
        },
        message: 'Document uploaded successfully. Processing started.',
        timestamp: expect.any(String)
      });
    });

    test('should handle missing file', async () => {
      await controller.uploadDocument(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
        timestamp: expect.any(String)
      });
    });
  });

  describe('getDocuments', () => {
    test('should return documents list', async () => {
      const mockDocuments = [
        {
          id: 'doc1',
          filename: 'test1.pdf',
          file_size: 1024,
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockRequest.validatedQuery = {
        limit: 20,
        offset: 0,
        order_by: 'created_at',
        order_direction: 'desc'
      };

      (documentService.getDocuments as jest.Mock).mockResolvedValue({
        documents: mockDocuments,
        total: 1,
        hasMore: false
      });

      await controller.getDocuments(mockRequest as Request, mockResponse as Response);

      expect(documentService.getDocuments).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          documents: expect.any(Array),
          total: 1,
          has_more: false
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('getDocumentById', () => {
    test('should return document by ID', async () => {
      const mockDocument = {
        id: 'doc123',
        filename: 'test.pdf',
        file_size: 1024,
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRequest.params = { id: 'doc123' };

      (documentService.validateDocumentAccess as jest.Mock).mockResolvedValue(mockDocument);

      await controller.getDocumentById(mockRequest as Request, mockResponse as Response);

      expect(documentService.validateDocumentAccess).toHaveBeenCalledWith('doc123', undefined);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { document: mockDocument },
        timestamp: expect.any(String)
      });
    });

    test('should handle document not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (documentService.validateDocumentAccess as jest.Mock).mockRejectedValue(
        new Error('Document not found')
      );

      await controller.getDocumentById(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          message: 'Document not found'
        }),
        timestamp: expect.any(String)
      });
    });
  });

  describe('deleteDocument', () => {
    test('should delete document successfully', async () => {
      mockRequest.params = { id: 'doc123' };

      (documentService.validateDocumentAccess as jest.Mock).mockResolvedValue({});
      (documentService.deleteDocument as jest.Mock).mockResolvedValue(true);

      await controller.deleteDocument(mockRequest as Request, mockResponse as Response);

      expect(documentService.validateDocumentAccess).toHaveBeenCalledWith('doc123', undefined);
      expect(documentService.deleteDocument).toHaveBeenCalledWith('doc123', undefined);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { deleted: true },
        message: 'Document deleted successfully',
        timestamp: expect.any(String)
      });
    });
  });

  describe('getDocumentStats', () => {
    test('should return document statistics', async () => {
      const mockStats = {
        total: 10,
        byStatus: { completed: 8, processing: 2 },
        totalSize: 10240,
        recentUploads: 3
      };

      (documentService.getDocumentStats as jest.Mock).mockResolvedValue(mockStats);

      await controller.getDocumentStats(mockRequest as Request, mockResponse as Response);

      expect(documentService.getDocumentStats).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        timestamp: expect.any(String)
      });
    });
  });
});
