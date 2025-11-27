/**
 * Document Service
 * Handles CRUD operations for PDF documents with graph and summary data
 */

import { db } from '../database/client';
import {
  Document,
  DocumentStatus,
  CreateDocumentInput,
  UpdateDocumentInput
} from '../models';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentQueryOptions {
  userId?: string;
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at' | 'filename';
  orderDirection?: 'asc' | 'desc';
}

export interface DocumentStats {
  total: number;
  byStatus: Record<DocumentStatus, number>;
  totalSize: number;
  recentUploads: number; // Last 24 hours
}

export class DocumentService {
  /**
   * Create a new document record
   */
  public async createDocument(input: CreateDocumentInput): Promise<Document> {
    try {
      logger.info('Creating document record', {
        filename: input.filename,
        fileSize: input.file_size,
        userId: input.user_id
      });

      const id = uuidv4();
      const now = new Date();

      const document: Document = {
        id,
        user_id: input.user_id,
        filename: input.filename,
        file_size: input.file_size,
        status: 'pending',
        pdf_url: input.pdf_url,
        metadata: input.metadata || {},
        created_at: now,
        updated_at: now
      };

      const query = `
        INSERT INTO documents (
          id, user_id, filename, file_size, status, pdf_url, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        document.id,
        document.user_id,
        document.filename,
        document.file_size,
        document.status,
        document.pdf_url,
        JSON.stringify(document.metadata),
        document.created_at,
        document.updated_at
      ];

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Failed to create document record', 500);
      }

      const createdDoc = this.mapRowToDocument(result.rows[0]);

      logger.info('Document record created', {
        id: createdDoc.id,
        filename: createdDoc.filename
      });

      return createdDoc;
    } catch (error: any) {
      logger.error('Failed to create document', {
        error: error.message,
        filename: input.filename
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Database error while creating document', 500, {
        originalError: error.message
      });
    }
  }

  /**
   * Get document by ID
   */
  public async getDocumentById(id: string, userId?: string): Promise<Document | null> {
    try {
      let query = 'SELECT * FROM documents WHERE id = $1';
      const values: any[] = [id];

      // Add user filter if specified
      if (userId) {
        query += ' AND user_id = $2';
        values.push(userId);
      }

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDocument(result.rows[0]);
    } catch (error: any) {
      logger.error('Failed to get document by ID', {
        id,
        error: error.message
      });
      throw new AppError('Database error while fetching document', 500);
    }
  }

  /**
   * Get documents with filtering and pagination
   */
  public async getDocuments(options: DocumentQueryOptions = {}): Promise<{
    documents: Document[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        userId,
        status,
        limit = 20,
        offset = 0,
        orderBy = 'created_at',
        orderDirection = 'desc'
      } = options;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        values.push(userId);
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM documents ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get documents with pagination
      const selectQuery = `
        SELECT * FROM documents
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);
      const result = await db.query(selectQuery, values);

      const documents = result.rows.map(row => this.mapRowToDocument(row));
      const hasMore = offset + limit < total;

      return {
        documents,
        total,
        hasMore
      };
    } catch (error: any) {
      logger.error('Failed to get documents', {
        options,
        error: error.message
      });
      throw new AppError('Database error while fetching documents', 500);
    }
  }

  /**
   * Update document
   */
  public async updateDocument(
    id: string,
    updates: UpdateDocumentInput,
    userId?: string
  ): Promise<Document> {
    try {
      logger.info('Updating document', { id, updates, userId });

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build update fields
      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.graph_data !== undefined) {
        updateFields.push(`graph_data = $${paramIndex++}`);
        values.push(JSON.stringify(updates.graph_data));
      }

      if (updates.summary !== undefined) {
        updateFields.push(`summary = $${paramIndex++}`);
        values.push(updates.summary);
      }

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      // Always update updated_at
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      if (updateFields.length === 1) {
        throw new AppError('No fields to update', 400);
      }

      // Add WHERE conditions
      let whereClause = `WHERE id = $${paramIndex++}`;
      values.push(id);

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex++}`;
        values.push(userId);
      }

      const query = `
        UPDATE documents
        SET ${updateFields.join(', ')}
        ${whereClause}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Document not found or access denied', 404);
      }

      const updatedDoc = this.mapRowToDocument(result.rows[0]);

      logger.info('Document updated', {
        id,
        status: updatedDoc.status,
        hasGraph: !!updatedDoc.graph_data,
        hasSummary: !!updatedDoc.summary
      });

      return updatedDoc;
    } catch (error: any) {
      logger.error('Failed to update document', {
        id,
        updates,
        error: error.message
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Database error while updating document', 500);
    }
  }

  /**
   * Delete document
   */
  public async deleteDocument(id: string, userId?: string): Promise<boolean> {
    try {
      logger.info('Deleting document', { id, userId });

      let query = 'DELETE FROM documents WHERE id = $1';
      const values: any[] = [id];

      if (userId) {
        query += ' AND user_id = $2';
        values.push(userId);
      }

      const result = await db.query(query, values);

      const deleted = result.rowCount > 0;

      if (deleted) {
        logger.info('Document deleted', { id });
      } else {
        logger.warn('Document not found for deletion', { id });
      }

      return deleted;
    } catch (error: any) {
      logger.error('Failed to delete document', {
        id,
        error: error.message
      });
      throw new AppError('Database error while deleting document', 500);
    }
  }

  /**
   * Get document statistics
   */
  public async getDocumentStats(userId?: string): Promise<DocumentStats> {
    try {
      let whereClause = '';
      const values: any[] = [];

      if (userId) {
        whereClause = 'WHERE user_id = $1';
        values.push(userId);
      }

      // Get status breakdown
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM documents
        ${whereClause}
        GROUP BY status
      `;

      const statusResult = await db.query(statusQuery, values);
      const byStatus: Record<DocumentStatus, number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };

      statusResult.rows.forEach(row => {
        byStatus[row.status as DocumentStatus] = parseInt(row.count);
      });

      const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

      // Get total file size
      const sizeQuery = `
        SELECT COALESCE(SUM(file_size), 0) as total_size
        FROM documents
        ${whereClause}
      `;

      const sizeResult = await db.query(sizeQuery, values);
      const totalSize = parseInt(sizeResult.rows[0].total_size);

      // Get recent uploads (last 24 hours)
      const recentQuery = `
        SELECT COUNT(*) as recent_count
        FROM documents
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ${userId ? 'AND user_id = $1' : ''}
      `;

      const recentResult = await db.query(recentQuery, userId ? [userId] : []);
      const recentUploads = parseInt(recentResult.rows[0].recent_count);

      return {
        total,
        byStatus,
        totalSize,
        recentUploads
      };
    } catch (error: any) {
      logger.error('Failed to get document stats', {
        userId,
        error: error.message
      });
      throw new AppError('Database error while fetching statistics', 500);
    }
  }

  /**
   * Update document status with automatic timestamp handling
   */
  public async updateDocumentStatus(
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
    userId?: string
  ): Promise<Document> {
    const updates: UpdateDocumentInput = { status };

    if (errorMessage && status === 'failed') {
      updates.metadata = { error: errorMessage };
    }

    return this.updateDocument(id, updates, userId);
  }

  /**
   * Store graph data for a document
   */
  public async storeDocumentGraph(
    id: string,
    graphData: any,
    userId?: string
  ): Promise<Document> {
    return this.updateDocument(id, { graph_data: graphData }, userId);
  }

  /**
   * Store summary for a document
   */
  public async storeDocumentSummary(
    id: string,
    summary: string,
    userId?: string
  ): Promise<Document> {
    return this.updateDocument(id, { summary }, userId);
  }

  /**
   * Map database row to Document interface
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      user_id: row.user_id,
      filename: row.filename,
      file_size: row.file_size,
      status: row.status,
      pdf_url: row.pdf_url,
      graph_data: row.graph_data,
      summary: row.summary,
      metadata: row.metadata || {},
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Validate document exists and user has access
   */
  public async validateDocumentAccess(
    id: string,
    userId?: string
  ): Promise<Document> {
    const document = await this.getDocumentById(id, userId);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return document;
  }
}

// Export singleton instance
export const documentService = new DocumentService();
