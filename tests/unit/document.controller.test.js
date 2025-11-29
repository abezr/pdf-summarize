"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_controller_1 = require("../../src/api/controllers/document.controller");
const document_service_1 = require("../../src/services/document.service");
// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-12345')
}));
// Mock services
jest.mock('../../src/services/document.service', () => ({
    documentService: {
        createDocument: jest.fn(),
        getDocuments: jest.fn(),
        validateDocumentAccess: jest.fn(),
        deleteDocument: jest.fn(),
        getDocumentStats: jest.fn(),
        updateDocumentStatus: jest.fn(),
        storeDocumentGraph: jest.fn()
    }
}));
jest.mock('../../src/services/pdf-parser.service', () => ({
    pdfParserService: {
        parsePDF: jest.fn()
    }
}));
jest.mock('../../src/services/graph/graph-builder', () => ({
    GraphBuilder: {
        buildGraph: jest.fn()
    }
}));
jest.mock('../../src/services/llm/summarization.service', () => ({
    summarizationService: {
        summarizeGraph: jest.fn()
    }
}));
describe('DocumentController', () => {
    let controller;
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        controller = new document_controller_1.DocumentController();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            headers: {}
        };
        mockResponse = {
            json: jsonMock,
            status: statusMock
        };
        jest.clearAllMocks();
        // Mock the private processDocumentAsync method to prevent async processing
        jest.spyOn(controller, 'processDocumentAsync').mockResolvedValue(undefined);
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
            mockRequest.file = mockFile;
            mockRequest.user = { id: 'user123' };
            document_service_1.documentService.createDocument.mockResolvedValue(mockDocument);
            await controller.uploadDocument(mockRequest, mockResponse);
            expect(document_service_1.documentService.createDocument).toHaveBeenCalledWith({
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
            await controller.uploadDocument(mockRequest, mockResponse);
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
            mockRequest.user = { id: 'user123' };
            mockRequest.validatedQuery = {
                limit: 20,
                offset: 0,
                order_by: 'created_at',
                order_direction: 'desc'
            };
            document_service_1.documentService.getDocuments.mockResolvedValue({
                documents: mockDocuments,
                total: 1,
                hasMore: false
            });
            await controller.getDocuments(mockRequest, mockResponse);
            expect(document_service_1.documentService.getDocuments).toHaveBeenCalled();
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
            mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Valid UUID
            mockRequest.user = { id: 'user123' };
            document_service_1.documentService.validateDocumentAccess.mockResolvedValue(mockDocument);
            await controller.getDocumentById(mockRequest, mockResponse);
            expect(document_service_1.documentService.validateDocumentAccess).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', 'user123');
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: { document: mockDocument },
                timestamp: expect.any(String)
            });
        });
        test('should handle document not found', async () => {
            mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Valid UUID
            mockRequest.user = { id: 'user123' };
            document_service_1.documentService.validateDocumentAccess.mockRejectedValue(new Error('Document not found'));
            await controller.getDocumentById(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404); // Error handling returns 404 for 'not found' errors
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
            mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Valid UUID
            mockRequest.user = { id: 'user123' };
            document_service_1.documentService.validateDocumentAccess.mockResolvedValue({});
            document_service_1.documentService.deleteDocument.mockResolvedValue(true);
            await controller.deleteDocument(mockRequest, mockResponse);
            expect(document_service_1.documentService.validateDocumentAccess).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', 'user123');
            expect(document_service_1.documentService.deleteDocument).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', 'user123');
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
            mockRequest.user = { id: 'user123' };
            document_service_1.documentService.getDocumentStats.mockResolvedValue(mockStats);
            await controller.getDocumentStats(mockRequest, mockResponse);
            expect(document_service_1.documentService.getDocumentStats).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith({
                success: true,
                data: {
                    total: 10,
                    by_status: { completed: 8, processing: 2 },
                    total_size: 10240,
                    recent_uploads: 3
                },
                timestamp: expect.any(String)
            });
        });
    });
});
