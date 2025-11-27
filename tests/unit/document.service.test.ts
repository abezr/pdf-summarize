import { DocumentService } from '../../src/services/document.service';
import { Document, DocumentStatus } from '../../src/models';

// Mock the database client
jest.mock('../../src/database/client', () => ({
  db: {
    query: jest.fn()
  }
}));

import { db } from '../../src/database/client';

describe('DocumentService', () => {
  let service: DocumentService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new DocumentService();
    mockQuery = db.query as jest.Mock;
    mockQuery.mockClear();
  });

  describe('createDocument', () => {
    test('should create a document successfully', async () => {
      const input = {
        filename: 'test.pdf',
        file_size: 1024,
        user_id: 'user123',
        metadata: { test: true }
      };

      const mockRow = {
        id: 'doc123',
        user_id: 'user123',
        filename: 'test.pdf',
        file_size: 1024,
        status: 'pending',
        pdf_url: null,
        graph_data: null,
        summary: null,
        metadata: { test: true },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.createDocument(input);

      expect(result.id).toBe('doc123');
      expect(result.filename).toBe('test.pdf');
      expect(result.status).toBe('pending');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documents'),
        expect.any(Array)
      );
    });

    test('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(service.createDocument({
        filename: 'test.pdf',
        file_size: 1024
      })).rejects.toThrow('Database error while creating document');
    });
  });

  describe('getDocumentById', () => {
    test('should return document when found', async () => {
      const mockRow = {
        id: 'doc123',
        filename: 'test.pdf',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.getDocumentById('doc123');

      expect(result?.id).toBe('doc123');
      expect(result?.filename).toBe('test.pdf');
    });

    test('should return null when document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getDocumentById('nonexistent');

      expect(result).toBeNull();
    });

    test('should filter by user ID', async () => {
      const mockRow = {
        id: 'doc123',
        user_id: 'user123',
        filename: 'test.pdf',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.getDocumentById('doc123', 'user123');

      expect(result?.user_id).toBe('user123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $2'),
        ['doc123', 'user123']
      );
    });
  });

  describe('getDocuments', () => {
    test('should return paginated documents', async () => {
      const mockRows = [
        {
          id: 'doc1',
          filename: 'test1.pdf',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'doc2',
          filename: 'test2.pdf',
          status: 'processing',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockRows }); // Select query

      const result = await service.getDocuments({
        limit: 20,
        offset: 0
      });

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    test('should apply filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getDocuments({
        userId: 'user123',
        status: 'completed',
        limit: 10
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1 AND status = $2'),
        ['user123', 'completed', 10, 0]
      );
    });
  });

  describe('updateDocument', () => {
    test('should update document successfully', async () => {
      const mockRow = {
        id: 'doc123',
        filename: 'test.pdf',
        status: 'completed',
        graph_data: { nodes: [], edges: [] },
        summary: 'Test summary',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.updateDocument('doc123', {
        status: 'completed',
        graph_data: { nodes: [], edges: [] },
        summary: 'Test summary'
      });

      expect(result.status).toBe('completed');
      expect(result.summary).toBe('Test summary');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE documents'),
        expect.any(Array)
      );
    });

    test('should throw error when document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.updateDocument('nonexistent', { status: 'completed' }))
        .rejects.toThrow('Document not found or access denied');
    });
  });

  describe('deleteDocument', () => {
    test('should delete document successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.deleteDocument('doc123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM documents'),
        ['doc123']
      );
    });

    test('should return false when document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.deleteDocument('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getDocumentStats', () => {
    test('should return document statistics', async () => {
      const statusRows = [
        { status: 'completed', count: '5' },
        { status: 'processing', count: '2' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: statusRows }) // Status query
        .mockResolvedValueOnce({ rows: [{ total_size: '10240' }] }) // Size query
        .mockResolvedValueOnce({ rows: [{ recent_count: '3' }] }); // Recent query

      const stats = await service.getDocumentStats();

      expect(stats.total).toBe(7);
      expect(stats.byStatus.completed).toBe(5);
      expect(stats.byStatus.processing).toBe(2);
      expect(stats.totalSize).toBe(10240);
      expect(stats.recentUploads).toBe(3);
    });
  });

  describe('updateDocumentStatus', () => {
    test('should update status successfully', async () => {
      const mockRow = {
        id: 'doc123',
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.updateDocumentStatus('doc123', 'completed');

      expect(result.status).toBe('completed');
    });

    test('should include error message for failed status', async () => {
      const mockRow = {
        id: 'doc123',
        status: 'failed',
        metadata: { error: 'Processing failed' },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.updateDocumentStatus(
        'doc123',
        'failed',
        'Processing failed'
      );

      expect(result.status).toBe('failed');
      expect(result.metadata?.error).toBe('Processing failed');
    });
  });

  describe('storeDocumentGraph', () => {
    test('should store graph data', async () => {
      const graphData = { nodes: [], edges: [] };
      const mockRow = {
        id: 'doc123',
        graph_data: graphData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.storeDocumentGraph('doc123', graphData);

      expect(result.graph_data).toEqual(graphData);
    });
  });

  describe('storeDocumentSummary', () => {
    test('should store summary', async () => {
      const summary = 'Document summary text';
      const mockRow = {
        id: 'doc123',
        summary,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.storeDocumentSummary('doc123', summary);

      expect(result.summary).toBe(summary);
    });
  });

  describe('validateDocumentAccess', () => {
    test('should return document when accessible', async () => {
      const mockRow = {
        id: 'doc123',
        filename: 'test.pdf',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.validateDocumentAccess('doc123');

      expect(result.id).toBe('doc123');
    });

    test('should throw error when document not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.validateDocumentAccess('nonexistent'))
        .rejects.toThrow('Document not found');
    });
  });
});
