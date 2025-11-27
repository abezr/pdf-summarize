# Example Code for Critical Tasks

This document provides production-ready code examples for critical tasks in the PDF Summary AI implementation. These examples follow best practices and can be used as references during implementation.

---

## Table of Contents

1. [Phase 1: Foundation Examples](#phase-1-foundation-examples)
   - [T1.1: Project Setup](#t11-project-setup)
   - [T1.4: Database Schema](#t14-database-schema)
   - [T1.10: File Upload Service](#t110-file-upload-service)
2. [Phase 2: Core Features Examples](#phase-2-core-features-examples)
   - [T2.1: PDF Parser](#t21-pdf-parser)
   - [T2.4: Graph Data Structure](#t24-graph-data-structure)
   - [T2.10: OpenAI Integration](#t210-openai-integration)
3. [Phase 3: Advanced Features Examples](#phase-3-advanced-features-examples)
   - [T3.10: MCP Context Retrieval](#t310-mcp-context-retrieval)
   - [T3.20: Evaluation Service](#t320-evaluation-service)
   - [T3.30: Observability](#t330-observability)
4. [Testing Examples](#testing-examples)
5. [Docker Configuration](#docker-configuration)

---

## Phase 1: Foundation Examples

### T1.1: Project Setup

#### `package.json`
```json
{
  "name": "pdf-summary-ai",
  "version": "1.0.0",
  "description": "Document-aware PDF summarization with Knowledge Graph architecture",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && tsc-alias",
    "start": "node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3",
    "redis": "^4.6.12",
    "pdf-parse": "^1.1.1",
    "pdfjs-dist": "^4.0.379",
    "openai": "^4.24.1",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "prom-client": "^15.1.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/multer": "^1.4.11",
    "@types/pg": "^8.10.9",
    "@types/jest": "^29.5.11",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@playwright/test": "^1.40.1",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.17.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "prettier": "^3.1.1",
    "tsc-alias": "^1.8.8"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"],
      "@services/*": ["./src/services/*"],
      "@models/*": ["./src/models/*"],
      "@utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### `.env.example`
```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pdf_summary_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pdf_summary_ai
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_MIME_TYPES=application/pdf
UPLOAD_DIR=./uploads

# Observability
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
```

---

### T1.4: Database Schema

#### `src/database/schema.sql`
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    page_count INTEGER,
    storage_path TEXT NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    CONSTRAINT valid_upload_status CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Summaries table
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Grounding data
    source_nodes JSONB DEFAULT '[]'::jsonb,
    
    -- Evaluation scores
    evaluation_scores JSONB,
    
    -- Indexes
    CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Graph nodes table
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL,
    content TEXT,
    page_number INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536), -- For pgvector extension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_node_type CHECK (node_type IN ('TEXT', 'TABLE', 'IMAGE', 'HEADING', 'LIST'))
);

-- Graph edges table
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL,
    weight DECIMAL(5,4) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_edge_type CHECK (edge_type IN ('SEQUENTIAL', 'REFERENCE', 'SEMANTIC', 'HIERARCHY'))
);

-- Indexes for performance
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_upload_status ON documents(upload_status);
CREATE INDEX idx_summaries_document_id ON summaries(document_id);
CREATE INDEX idx_graph_nodes_document_id ON graph_nodes(document_id);
CREATE INDEX idx_graph_nodes_type ON graph_nodes(node_type);
CREATE INDEX idx_graph_edges_document_id ON graph_edges(document_id);
CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id);

-- GIN indexes for JSONB
CREATE INDEX idx_documents_metadata ON documents USING GIN (metadata);
CREATE INDEX idx_summaries_source_nodes ON summaries USING GIN (source_nodes);
CREATE INDEX idx_graph_nodes_metadata ON graph_nodes USING GIN (metadata);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### `src/database/connection.ts`
```typescript
import { Pool, PoolClient } from 'pg';
import { logger } from '@utils/logger';

class Database {
  private pool: Pool;
  private static instance: Database;

  private constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pdf_summary_ai',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query<T>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result.rows;
    } catch (error) {
      logger.error('Database query error', { text, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }
}

export const db = Database.getInstance();
```

---

### T1.10: File Upload Service

#### `src/services/upload/UploadService.ts`
```typescript
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

class UploadService {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
    this.allowedMimeTypes = (process.env.ALLOWED_MIME_TYPES || 'application/pdf').split(',');
  }

  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info('Upload directory initialized', { path: this.uploadDir });
    } catch (error) {
      logger.error('Failed to create upload directory', { error });
      throw new AppError('Failed to initialize upload service', 500);
    }
  }

  public getMulterConfig(): multer.Options {
    return {
      storage: multer.diskStorage({
        destination: async (req, file, cb) => {
          cb(null, this.uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueId = crypto.randomUUID();
          const ext = path.extname(file.originalname);
          const filename = `${uniqueId}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: this.maxFileSize,
        files: 1,
      },
      fileFilter: this.fileFilter.bind(this),
    };
  }

  private fileFilter(
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      logger.warn('Invalid file type uploaded', { mimetype: file.mimetype });
      cb(new AppError(`Invalid file type. Allowed: ${this.allowedMimeTypes.join(', ')}`, 400));
      return;
    }
    cb(null, true);
  }

  public async validateFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile() && stats.size > 0 && stats.size <= this.maxFileSize;
    } catch (error) {
      logger.error('File validation failed', { filePath, error });
      return false;
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info('File deleted', { filePath });
    } catch (error) {
      logger.error('Failed to delete file', { filePath, error });
      throw new AppError('Failed to delete file', 500);
    }
  }

  public async getFileInfo(filePath: string): Promise<UploadedFile> {
    try {
      const stats = await fs.stat(filePath);
      return {
        id: path.basename(filePath, path.extname(filePath)),
        originalName: path.basename(filePath),
        filename: path.basename(filePath),
        path: filePath,
        size: stats.size,
        mimetype: 'application/pdf',
      };
    } catch (error) {
      logger.error('Failed to get file info', { filePath, error });
      throw new AppError('File not found', 404);
    }
  }
}

export const uploadService = new UploadService();
```

---

## Phase 2: Core Features Examples

### T2.1: PDF Parser

#### `src/services/pdf/PDFParser.ts`
```typescript
import * as pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';

export interface ParsedPage {
  pageNumber: number;
  text: string;
  metadata?: Record<string, any>;
}

export interface ParsedPDF {
  text: string;
  pages: ParsedPage[];
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

class PDFParser {
  public async parse(filePath: string): Promise<ParsedPDF> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting PDF parsing', { filePath });

      // Read PDF file
      const dataBuffer = await fs.readFile(filePath);

      // Parse PDF with page-level extraction
      const pdfData = await pdfParse(dataBuffer, {
        pagerender: this.renderPage.bind(this),
      });

      // Extract pages
      const pages = await this.extractPages(dataBuffer, pdfData.numpages);

      const result: ParsedPDF = {
        text: pdfData.text,
        pages,
        pageCount: pdfData.numpages,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          keywords: pdfData.info?.Keywords,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate,
          modificationDate: pdfData.info?.ModDate,
        },
      };

      const duration = Date.now() - startTime;
      logger.info('PDF parsing completed', { 
        filePath, 
        pageCount: result.pageCount,
        textLength: result.text.length,
        duration 
      });

      return result;
    } catch (error) {
      logger.error('PDF parsing failed', { filePath, error });
      throw new AppError('Failed to parse PDF', 500, { originalError: error });
    }
  }

  private async renderPage(pageData: any): Promise<string> {
    // Custom page rendering logic
    const renderOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    };

    try {
      const textContent = await pageData.getTextContent(renderOptions);
      let lastY = null;
      let text = '';

      for (const item of textContent.items) {
        // Add line break if Y position changed significantly
        if (lastY !== null && lastY !== item.transform[5]) {
          text += '\n';
        }
        text += item.str;
        lastY = item.transform[5];
      }

      return text;
    } catch (error) {
      logger.error('Page rendering failed', { error });
      return '';
    }
  }

  private async extractPages(dataBuffer: Buffer, pageCount: number): Promise<ParsedPage[]> {
    const pages: ParsedPage[] = [];

    try {
      const pdfDoc = await pdfParse(dataBuffer);
      const fullText = pdfDoc.text;
      
      // Split text by form feed character (page separator)
      const pageTexts = fullText.split('\f');

      for (let i = 0; i < pageCount; i++) {
        pages.push({
          pageNumber: i + 1,
          text: pageTexts[i] || '',
          metadata: {},
        });
      }

      return pages;
    } catch (error) {
      logger.error('Page extraction failed', { error });
      throw error;
    }
  }

  public async extractMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.info || {};
    } catch (error) {
      logger.error('Metadata extraction failed', { filePath, error });
      return {};
    }
  }

  public validatePDFStructure(parsed: ParsedPDF): boolean {
    return (
      parsed.pageCount > 0 &&
      parsed.pages.length === parsed.pageCount &&
      parsed.text.length > 0
    );
  }
}

export const pdfParser = new PDFParser();
```

---

### T2.4: Graph Data Structure

#### `src/models/graph/GraphNode.ts`
```typescript
export type NodeType = 'TEXT' | 'TABLE' | 'IMAGE' | 'HEADING' | 'LIST';

export interface IGraphNode {
  id: string;
  type: NodeType;
  content: string;
  pageNumber?: number;
  metadata: Record<string, any>;
  embedding?: number[];
  edges: string[]; // IDs of connected nodes
}

export class GraphNode implements IGraphNode {
  public id: string;
  public type: NodeType;
  public content: string;
  public pageNumber?: number;
  public metadata: Record<string, any>;
  public embedding?: number[];
  public edges: string[];

  constructor(
    id: string,
    type: NodeType,
    content: string,
    pageNumber?: number,
    metadata: Record<string, any> = {}
  ) {
    this.id = id;
    this.type = type;
    this.content = content;
    this.pageNumber = pageNumber;
    this.metadata = metadata;
    this.edges = [];
  }

  public addEdge(nodeId: string): void {
    if (!this.edges.includes(nodeId)) {
      this.edges.push(nodeId);
    }
  }

  public removeEdge(nodeId: string): void {
    this.edges = this.edges.filter(id => id !== nodeId);
  }

  public hasEdge(nodeId: string): boolean {
    return this.edges.includes(nodeId);
  }

  public getNeighborCount(): number {
    return this.edges.length;
  }

  public toJSON(): IGraphNode {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      pageNumber: this.pageNumber,
      metadata: this.metadata,
      embedding: this.embedding,
      edges: this.edges,
    };
  }

  public static fromJSON(data: IGraphNode): GraphNode {
    const node = new GraphNode(
      data.id,
      data.type,
      data.content,
      data.pageNumber,
      data.metadata
    );
    node.edges = data.edges || [];
    node.embedding = data.embedding;
    return node;
  }
}
```

#### `src/models/graph/DocumentGraph.ts`
```typescript
import { GraphNode, NodeType, IGraphNode } from './GraphNode';
import { GraphEdge, EdgeType, IGraphEdge } from './GraphEdge';
import { logger } from '@utils/logger';

export interface IDocumentGraph {
  documentId: string;
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  metadata: Record<string, any>;
}

export class DocumentGraph {
  public documentId: string;
  public nodes: Map<string, GraphNode>;
  public edges: Map<string, GraphEdge>;
  public metadata: Record<string, any>;

  constructor(documentId: string) {
    this.documentId = documentId;
    this.nodes = new Map();
    this.edges = new Map();
    this.metadata = {};
  }

  // Node operations
  public addNode(node: GraphNode): void {
    if (this.nodes.has(node.id)) {
      logger.warn('Node already exists', { nodeId: node.id });
      return;
    }
    this.nodes.set(node.id, node);
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  public removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all edges connected to this node
    for (const edgeId of node.edges) {
      this.removeEdge(edgeId);
    }

    this.nodes.delete(nodeId);
  }

  public getNodesByType(type: NodeType): GraphNode[] {
    return Array.from(this.nodes.values()).filter(node => node.type === type);
  }

  public getNodesByPage(pageNumber: number): GraphNode[] {
    return Array.from(this.nodes.values()).filter(
      node => node.pageNumber === pageNumber
    );
  }

  // Edge operations
  public addEdge(edge: GraphEdge): void {
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) {
      logger.error('Cannot add edge: nodes not found', {
        sourceId: edge.sourceId,
        targetId: edge.targetId,
      });
      return;
    }

    this.edges.set(edge.id, edge);

    // Update node edges
    const sourceNode = this.nodes.get(edge.sourceId)!;
    const targetNode = this.nodes.get(edge.targetId)!;
    sourceNode.addEdge(targetNode.id);
    targetNode.addEdge(sourceNode.id);
  }

  public getEdge(edgeId: string): GraphEdge | undefined {
    return this.edges.get(edgeId);
  }

  public removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) return;

    // Update node edges
    const sourceNode = this.nodes.get(edge.sourceId);
    const targetNode = this.nodes.get(edge.targetId);
    
    if (sourceNode) sourceNode.removeEdge(edge.targetId);
    if (targetNode) targetNode.removeEdge(edge.sourceId);

    this.edges.delete(edgeId);
  }

  public getEdgesByType(type: EdgeType): GraphEdge[] {
    return Array.from(this.edges.values()).filter(edge => edge.type === type);
  }

  // Graph traversal
  public getNeighbors(nodeId: string, depth: number = 1): GraphNode[] {
    const visited = new Set<string>();
    const neighbors: GraphNode[] = [];
    
    const traverse = (currentId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      
      visited.add(currentId);
      const node = this.nodes.get(currentId);
      if (!node) return;

      if (currentId !== nodeId) {
        neighbors.push(node);
      }

      for (const edgeNodeId of node.edges) {
        traverse(edgeNodeId, currentDepth + 1);
      }
    };

    traverse(nodeId, 0);
    return neighbors;
  }

  public getConnectedComponent(nodeId: string): GraphNode[] {
    const visited = new Set<string>();
    const component: GraphNode[] = [];

    const dfs = (currentId: string) => {
      if (visited.has(currentId)) return;

      visited.add(currentId);
      const node = this.nodes.get(currentId);
      if (!node) return;

      component.push(node);

      for (const edgeNodeId of node.edges) {
        dfs(edgeNodeId);
      }
    };

    dfs(nodeId);
    return component;
  }

  // Statistics
  public getStatistics() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType: {
        TEXT: this.getNodesByType('TEXT').length,
        TABLE: this.getNodesByType('TABLE').length,
        IMAGE: this.getNodesByType('IMAGE').length,
        HEADING: this.getNodesByType('HEADING').length,
        LIST: this.getNodesByType('LIST').length,
      },
      edgesByType: {
        SEQUENTIAL: this.getEdgesByType('SEQUENTIAL').length,
        REFERENCE: this.getEdgesByType('REFERENCE').length,
        SEMANTIC: this.getEdgesByType('SEMANTIC').length,
        HIERARCHY: this.getEdgesByType('HIERARCHY').length,
      },
      averageDegree: this.calculateAverageDegree(),
    };
  }

  private calculateAverageDegree(): number {
    if (this.nodes.size === 0) return 0;
    const totalDegree = Array.from(this.nodes.values()).reduce(
      (sum, node) => sum + node.getNeighborCount(),
      0
    );
    return totalDegree / this.nodes.size;
  }

  // Serialization
  public toJSON(): any {
    return {
      documentId: this.documentId,
      nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
      edges: Array.from(this.edges.values()).map(edge => edge.toJSON()),
      metadata: this.metadata,
      statistics: this.getStatistics(),
    };
  }

  public static fromJSON(data: any): DocumentGraph {
    const graph = new DocumentGraph(data.documentId);
    
    // Add nodes
    for (const nodeData of data.nodes) {
      const node = GraphNode.fromJSON(nodeData);
      graph.nodes.set(node.id, node);
    }

    // Add edges
    for (const edgeData of data.edges) {
      const edge = GraphEdge.fromJSON(edgeData);
      graph.edges.set(edge.id, edge);
    }

    graph.metadata = data.metadata || {};
    return graph;
  }
}
```

#### `src/models/graph/GraphEdge.ts`
```typescript
export type EdgeType = 'SEQUENTIAL' | 'REFERENCE' | 'SEMANTIC' | 'HIERARCHY';

export interface IGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number;
  metadata: Record<string, any>;
}

export class GraphEdge implements IGraphEdge {
  public id: string;
  public sourceId: string;
  public targetId: string;
  public type: EdgeType;
  public weight: number;
  public metadata: Record<string, any>;

  constructor(
    id: string,
    sourceId: string,
    targetId: string,
    type: EdgeType,
    weight: number = 1.0,
    metadata: Record<string, any> = {}
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type;
    this.weight = weight;
    this.metadata = metadata;
  }

  public toJSON(): IGraphEdge {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
      weight: this.weight,
      metadata: this.metadata,
    };
  }

  public static fromJSON(data: IGraphEdge): GraphEdge {
    return new GraphEdge(
      data.id,
      data.sourceId,
      data.targetId,
      data.type,
      data.weight,
      data.metadata
    );
  }
}
```

---

### T2.10: OpenAI Integration

#### `src/services/ai/OpenAIService.ts`
```typescript
import OpenAI from 'openai';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';
import { metricsCollector } from '@services/observability/MetricsCollector';

export interface SummaryRequest {
  documentId: string;
  content: string;
  context?: string[];
  maxTokens?: number;
}

export interface SummaryResponse {
  summary: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime: number;
}

class OpenAIService {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');
  }

  public async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    const startTime = Date.now();

    try {
      logger.info('Generating summary with OpenAI', {
        documentId: request.documentId,
        model: this.model,
        contentLength: request.content.length,
      });

      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: 0.3,
        top_p: 0.9,
      });

      const processingTime = Date.now() - startTime;

      const response: SummaryResponse = {
        summary: completion.choices[0]?.message?.content || '',
        model: completion.model,
        tokensUsed: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
        processingTime,
      };

      // Record metrics
      metricsCollector.recordLLMTokens(
        this.model,
        response.tokensUsed.total
      );

      logger.info('Summary generated successfully', {
        documentId: request.documentId,
        tokensUsed: response.tokensUsed.total,
        processingTime,
      });

      return response;
    } catch (error: any) {
      logger.error('OpenAI summary generation failed', {
        documentId: request.documentId,
        error: error.message,
      });
      
      if (error.status === 429) {
        throw new AppError('OpenAI rate limit exceeded', 429);
      }
      if (error.status === 401) {
        throw new AppError('Invalid OpenAI API key', 401);
      }
      
      throw new AppError('Failed to generate summary', 500, { originalError: error });
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert document summarizer with access to a knowledge graph of the document structure.

Your task is to generate comprehensive, accurate summaries that:
1. Capture the main ideas and key points
2. Maintain logical flow and coherence
3. Reference specific sections when important (e.g., "As mentioned in Section 3...")
4. Include relevant data from tables and figures when provided
5. Ground statements in the source material

When you reference a specific piece of information, use the format: [Node: node_id]
This allows us to trace your summary back to the source material.

Be concise but thorough. Prioritize clarity and accuracy over length.`;
  }

  private buildUserPrompt(request: SummaryRequest): string {
    let prompt = `Please summarize the following document:\n\n${request.content}`;

    if (request.context && request.context.length > 0) {
      prompt += `\n\n--- Additional Context ---\n`;
      prompt += request.context.join('\n\n');
    }

    return prompt;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      logger.error('Embedding generation failed', { error: error.message });
      throw new AppError('Failed to generate embedding', 500);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI health check failed', { error });
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
```

---

## Phase 3: Advanced Features Examples

### T3.10: MCP Context Retrieval

#### `src/services/mcp/MCPService.ts`
```typescript
import { DocumentGraph } from '@models/graph/DocumentGraph';
import { GraphNode } from '@models/graph/GraphNode';
import { logger } from '@utils/logger';
import { metricsCollector } from '@services/observability/MetricsCollector';

export interface MCPContext {
  mainNode: GraphNode;
  relatedNodes: GraphNode[];
  depth: number;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

class MCPService {
  private tools: MCPTool[];

  constructor() {
    this.tools = this.initializeTools();
  }

  private initializeTools(): MCPTool[] {
    return [
      {
        name: 'get_related_node',
        description: 'Retrieve a related node from the document graph by reference (e.g., "Table 1", "Figure 2")',
        parameters: {
          type: 'object',
          properties: {
            reference: {
              type: 'string',
              description: 'The reference to look up (e.g., "Table 1", "Section 3")',
            },
            documentId: {
              type: 'string',
              description: 'The document ID',
            },
          },
          required: ['reference', 'documentId'],
        },
      },
      {
        name: 'get_neighborhood',
        description: 'Get the neighborhood of nodes around a specific node',
        parameters: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'The ID of the central node',
            },
            depth: {
              type: 'number',
              description: 'How many hops away to retrieve (default: 1)',
              default: 1,
            },
          },
          required: ['nodeId'],
        },
      },
      {
        name: 'get_context_for_summary',
        description: 'Get relevant context nodes for generating a summary',
        parameters: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The document ID',
            },
            focus: {
              type: 'string',
              description: 'Optional focus area (e.g., "methodology", "results")',
            },
          },
          required: ['documentId'],
        },
      },
    ];
  }

  public getTools(): MCPTool[] {
    return this.tools;
  }

  public async executeToolCall(
    toolName: string,
    parameters: Record<string, any>,
    graph: DocumentGraph
  ): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('Executing MCP tool call', { toolName, parameters });

      let result: any;

      switch (toolName) {
        case 'get_related_node':
          result = await this.getRelatedNode(parameters.reference, graph);
          break;
        case 'get_neighborhood':
          result = await this.getNeighborhood(parameters.nodeId, parameters.depth || 1, graph);
          break;
        case 'get_context_for_summary':
          result = await this.getContextForSummary(parameters.documentId, parameters.focus, graph);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      const duration = Date.now() - startTime;

      // Record metrics
      metricsCollector.recordMCPToolCall(toolName, 'success');

      logger.info('MCP tool call completed', {
        toolName,
        duration,
        resultSize: JSON.stringify(result).length,
      });

      return result;
    } catch (error: any) {
      metricsCollector.recordMCPToolCall(toolName, 'error');
      logger.error('MCP tool call failed', {
        toolName,
        error: error.message,
      });
      throw error;
    }
  }

  private async getRelatedNode(reference: string, graph: DocumentGraph): Promise<GraphNode | null> {
    // Parse reference (e.g., "Table 1", "Figure 2", "Section 3")
    const pattern = /^(Table|Figure|Section|Appendix)\s+(\d+|[A-Z])$/i;
    const match = reference.match(pattern);

    if (!match) {
      logger.warn('Invalid reference format', { reference });
      return null;
    }

    const [, type, number] = match;

    // Search for node with matching metadata
    const nodes = Array.from(graph.nodes.values());
    const matchingNode = nodes.find(node => {
      const nodeRef = node.metadata.reference;
      return nodeRef && nodeRef.toLowerCase() === reference.toLowerCase();
    });

    if (matchingNode) {
      logger.info('Related node found', {
        reference,
        nodeId: matchingNode.id,
        type: matchingNode.type,
      });
    } else {
      logger.warn('Related node not found', { reference });
    }

    return matchingNode || null;
  }

  private async getNeighborhood(
    nodeId: string,
    depth: number,
    graph: DocumentGraph
  ): Promise<MCPContext> {
    const mainNode = graph.getNode(nodeId);
    if (!mainNode) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const relatedNodes = graph.getNeighbors(nodeId, depth);

    return {
      mainNode,
      relatedNodes,
      depth,
    };
  }

  private async getContextForSummary(
    documentId: string,
    focus: string | undefined,
    graph: DocumentGraph
  ): Promise<GraphNode[]> {
    // Get important nodes for summary
    const headings = graph.getNodesByType('HEADING');
    const tables = graph.getNodesByType('TABLE');
    const highlyConnected = this.getHighlyConnectedNodes(graph, 3);

    const contextNodes = [...headings, ...tables, ...highlyConnected];

    // Filter by focus if provided
    if (focus) {
      return contextNodes.filter(node => 
        node.content.toLowerCase().includes(focus.toLowerCase())
      );
    }

    return contextNodes;
  }

  private getHighlyConnectedNodes(graph: DocumentGraph, minDegree: number): GraphNode[] {
    return Array.from(graph.nodes.values())
      .filter(node => node.getNeighborCount() >= minDegree)
      .sort((a, b) => b.getNeighborCount() - a.getNeighborCount())
      .slice(0, 10); // Top 10 most connected
  }

  public formatContextForLLM(context: MCPContext): string {
    let formatted = `--- Main Content ---\n`;
    formatted += `[Node: ${context.mainNode.id}] (Page ${context.mainNode.pageNumber})\n`;
    formatted += context.mainNode.content;

    if (context.relatedNodes.length > 0) {
      formatted += `\n\n--- Related Content ---\n`;
      context.relatedNodes.forEach(node => {
        formatted += `\n[Node: ${node.id}] (${node.type}, Page ${node.pageNumber})\n`;
        formatted += node.content.substring(0, 500); // Truncate long content
        if (node.content.length > 500) formatted += '...';
      });
    }

    return formatted;
  }
}

export const mcpService = new MCPService();
```

---

### T3.20: Evaluation Service

#### `src/services/evaluation/EvaluationService.ts`
```typescript
import { DocumentGraph } from '@models/graph/DocumentGraph';
import { logger } from '@utils/logger';
import { metricsCollector } from '@services/observability/MetricsCollector';

export interface EvaluationMetrics {
  ragas: {
    faithfulness: number;
    answerRelevancy: number;
    contextRecall: number;
    contextPrecision: number;
  };
  custom: {
    groundingScore: number;
    coverageScore: number;
    graphUtilization: number;
    tableImageAccuracy: number;
  };
  overall: number;
}

export interface EvaluationResult {
  documentId: string;
  summaryId: string;
  metrics: EvaluationMetrics;
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  grade: string;
  timestamp: Date;
}

class EvaluationService {
  private readonly PASS_THRESHOLD = 0.7;
  private readonly WEIGHTS = {
    faithfulness: 0.25,
    answerRelevancy: 0.20,
    contextRecall: 0.15,
    contextPrecision: 0.15,
    groundingScore: 0.15,
    coverageScore: 0.10,
  };

  public async evaluateSummary(
    documentId: string,
    summaryId: string,
    summaryText: string,
    graph: DocumentGraph,
    sourceNodes: string[]
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting summary evaluation', {
        documentId,
        summaryId,
      });

      // Calculate all metrics
      const ragas = await this.calculateRAGASMetrics(summaryText, graph, sourceNodes);
      const custom = await this.calculateCustomMetrics(summaryText, graph, sourceNodes);

      // Calculate overall score
      const overall = this.calculateOverallScore(ragas, custom);

      // Determine decision and grade
      const decision = this.makeDecision(overall);
      const grade = this.assignGrade(overall);

      const result: EvaluationResult = {
        documentId,
        summaryId,
        metrics: { ragas, custom, overall },
        decision,
        grade,
        timestamp: new Date(),
      };

      // Record metrics for observability
      this.recordMetricsForObservability(documentId, result.metrics);

      const duration = Date.now() - startTime;
      logger.info('Summary evaluation completed', {
        documentId,
        summaryId,
        overall,
        decision,
        grade,
        duration,
      });

      return result;
    } catch (error: any) {
      logger.error('Summary evaluation failed', {
        documentId,
        summaryId,
        error: error.message,
      });
      throw error;
    }
  }

  private async calculateRAGASMetrics(
    summary: string,
    graph: DocumentGraph,
    sourceNodes: string[]
  ): Promise<EvaluationMetrics['ragas']> {
    // Extract context from graph
    const contextNodes = sourceNodes
      .map(nodeId => graph.getNode(nodeId))
      .filter(node => node !== undefined);

    const context = contextNodes.map(node => node!.content).join('\n\n');

    // Calculate RAGAS metrics
    const faithfulness = this.calculateFaithfulness(summary, context);
    const answerRelevancy = this.calculateAnswerRelevancy(summary, context);
    const contextRecall = this.calculateContextRecall(summary, context);
    const contextPrecision = this.calculateContextPrecision(summary, context);

    return {
      faithfulness,
      answerRelevancy,
      contextRecall,
      contextPrecision,
    };
  }

  private calculateFaithfulness(summary: string, context: string): number {
    // Simplified faithfulness: Check if summary statements are supported by context
    const summaryStatements = summary.split('.').filter(s => s.trim().length > 0);
    const contextLower = context.toLowerCase();

    let supportedCount = 0;
    for (const statement of summaryStatements) {
      const words = statement.toLowerCase().split(' ').filter(w => w.length > 3);
      const supportedWords = words.filter(word => contextLower.includes(word));
      if (supportedWords.length / words.length > 0.5) {
        supportedCount++;
      }
    }

    return summaryStatements.length > 0 ? supportedCount / summaryStatements.length : 0;
  }

  private calculateAnswerRelevancy(summary: string, context: string): number {
    // Simplified relevancy: Check overlap between summary and context
    const summaryWords = new Set(
      summary.toLowerCase().split(' ').filter(w => w.length > 3)
    );
    const contextWords = new Set(
      context.toLowerCase().split(' ').filter(w => w.length > 3)
    );

    const intersection = new Set(
      [...summaryWords].filter(word => contextWords.has(word))
    );

    return summaryWords.size > 0 ? intersection.size / summaryWords.size : 0;
  }

  private calculateContextRecall(summary: string, context: string): number {
    // Check how much of the important context is recalled in the summary
    const contextSentences = context.split('.').filter(s => s.trim().length > 0);
    const summaryLower = summary.toLowerCase();

    let recalledCount = 0;
    for (const sentence of contextSentences) {
      const words = sentence.toLowerCase().split(' ').filter(w => w.length > 3);
      const recalledWords = words.filter(word => summaryLower.includes(word));
      if (recalledWords.length / words.length > 0.4) {
        recalledCount++;
      }
    }

    return contextSentences.length > 0 ? recalledCount / contextSentences.length : 0;
  }

  private calculateContextPrecision(summary: string, context: string): number {
    // Check precision of context usage
    const summaryStatements = summary.split('.').filter(s => s.trim().length > 0);
    const contextLower = context.toLowerCase();

    let preciseCount = 0;
    for (const statement of summaryStatements) {
      const words = statement.toLowerCase().split(' ').filter(w => w.length > 3);
      const contextWords = words.filter(word => contextLower.includes(word));
      if (contextWords.length / words.length > 0.6) {
        preciseCount++;
      }
    }

    return summaryStatements.length > 0 ? preciseCount / summaryStatements.length : 0;
  }

  private async calculateCustomMetrics(
    summary: string,
    graph: DocumentGraph,
    sourceNodes: string[]
  ): Promise<EvaluationMetrics['custom']> {
    const groundingScore = this.calculateGroundingScore(summary, sourceNodes);
    const coverageScore = this.calculateCoverageScore(graph, sourceNodes);
    const graphUtilization = this.calculateGraphUtilization(graph, sourceNodes);
    const tableImageAccuracy = this.calculateTableImageAccuracy(graph, sourceNodes);

    return {
      groundingScore,
      coverageScore,
      graphUtilization,
      tableImageAccuracy,
    };
  }

  private calculateGroundingScore(summary: string, sourceNodes: string[]): number {
    // Check for [Node: xxx] references in summary
    const nodeReferencePattern = /\[Node:\s*([^\]]+)\]/g;
    const matches = summary.match(nodeReferencePattern) || [];
    
    const summaryStatements = summary.split('.').filter(s => s.trim().length > 0);
    const groundedStatements = matches.length;

    return summaryStatements.length > 0 ? groundedStatements / summaryStatements.length : 0;
  }

  private calculateCoverageScore(graph: DocumentGraph, sourceNodes: string[]): number {
    // Calculate what percentage of important nodes were used
    const importantNodes = [
      ...graph.getNodesByType('HEADING'),
      ...graph.getNodesByType('TABLE'),
      ...graph.getNodesByType('IMAGE'),
    ];

    const usedImportantNodes = importantNodes.filter(node => 
      sourceNodes.includes(node.id)
    );

    return importantNodes.length > 0 ? usedImportantNodes.length / importantNodes.length : 0;
  }

  private calculateGraphUtilization(graph: DocumentGraph, sourceNodes: string[]): number {
    // Check how many edges were traversed
    const stats = graph.getStatistics();
    const usedNodes = new Set(sourceNodes);
    
    let traversedEdges = 0;
    for (const edge of graph.edges.values()) {
      if (usedNodes.has(edge.sourceId) && usedNodes.has(edge.targetId)) {
        traversedEdges++;
      }
    }

    return stats.edgeCount > 0 ? traversedEdges / stats.edgeCount : 0;
  }

  private calculateTableImageAccuracy(graph: DocumentGraph, sourceNodes: string[]): number {
    // Check if tables/images were properly referenced
    const tableImageNodes = [
      ...graph.getNodesByType('TABLE'),
      ...graph.getNodesByType('IMAGE'),
    ];

    if (tableImageNodes.length === 0) return 1.0;

    const referencedTableImages = tableImageNodes.filter(node => 
      sourceNodes.includes(node.id)
    );

    return referencedTableImages.length / tableImageNodes.length;
  }

  private calculateOverallScore(
    ragas: EvaluationMetrics['ragas'],
    custom: EvaluationMetrics['custom']
  ): number {
    const score =
      ragas.faithfulness * this.WEIGHTS.faithfulness +
      ragas.answerRelevancy * this.WEIGHTS.answerRelevancy +
      ragas.contextRecall * this.WEIGHTS.contextRecall +
      ragas.contextPrecision * this.WEIGHTS.contextPrecision +
      custom.groundingScore * this.WEIGHTS.groundingScore +
      custom.coverageScore * this.WEIGHTS.coverageScore;

    return Math.min(Math.max(score, 0), 1);
  }

  private makeDecision(overallScore: number): 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW' {
    if (overallScore >= this.PASS_THRESHOLD) {
      return 'APPROVED';
    } else if (overallScore >= 0.5) {
      return 'NEEDS_REVIEW';
    } else {
      return 'REJECTED';
    }
  }

  private assignGrade(overallScore: number): string {
    if (overallScore >= 0.9) return 'A - Excellent';
    if (overallScore >= 0.8) return 'B - Good';
    if (overallScore >= 0.7) return 'C - Satisfactory';
    if (overallScore >= 0.6) return 'D - Needs Improvement';
    return 'F - Poor';
  }

  private recordMetricsForObservability(documentId: string, metrics: EvaluationMetrics): void {
    // Record RAGAS metrics
    metricsCollector.recordEvaluationScore('faithfulness', documentId, metrics.ragas.faithfulness);
    metricsCollector.recordEvaluationScore('answer_relevancy', documentId, metrics.ragas.answerRelevancy);
    metricsCollector.recordEvaluationScore('context_recall', documentId, metrics.ragas.contextRecall);
    metricsCollector.recordEvaluationScore('context_precision', documentId, metrics.ragas.contextPrecision);

    // Record custom metrics
    metricsCollector.recordEvaluationScore('grounding_score', documentId, metrics.custom.groundingScore);
    metricsCollector.recordEvaluationScore('coverage_score', documentId, metrics.custom.coverageScore);
    metricsCollector.recordEvaluationScore('graph_utilization', documentId, metrics.custom.graphUtilization);

    // Record overall score
    metricsCollector.recordEvaluationScore('overall_score', documentId, metrics.overall);
  }
}

export const evaluationService = new EvaluationService();
```

---

### T3.30: Observability

#### `src/services/observability/MetricsCollector.ts`
```typescript
import { Counter, Histogram, Gauge, register } from 'prom-client';
import { logger } from '@utils/logger';

class MetricsCollector {
  // Counters
  private documentsProcessed: Counter;
  private mcpToolCalls: Counter;

  // Histograms
  private processingDuration: Histogram;
  private graphNodesCount: Histogram;
  private graphEdgesCount: Histogram;
  private llmTokensUsed: Histogram;

  // Gauges
  private activeJobs: Gauge;
  private evaluationScore: Gauge;

  constructor() {
    // Initialize counters
    this.documentsProcessed = new Counter({
      name: 'pdf_documents_processed_total',
      help: 'Total number of PDF documents processed',
      labelNames: ['status'],
    });

    this.mcpToolCalls = new Counter({
      name: 'mcp_tool_calls_total',
      help: 'Total number of MCP tool calls',
      labelNames: ['tool_name', 'status'],
    });

    // Initialize histograms
    this.processingDuration = new Histogram({
      name: 'pdf_processing_duration_seconds',
      help: 'PDF processing duration in seconds',
      labelNames: ['stage'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    });

    this.graphNodesCount = new Histogram({
      name: 'document_graph_nodes_count',
      help: 'Number of nodes in document graph',
      buckets: [10, 50, 100, 500, 1000, 5000],
    });

    this.graphEdgesCount = new Histogram({
      name: 'document_graph_edges_count',
      help: 'Number of edges in document graph',
      buckets: [10, 50, 100, 500, 1000, 10000],
    });

    this.llmTokensUsed = new Histogram({
      name: 'llm_tokens_used',
      help: 'Number of tokens used by LLM',
      labelNames: ['model'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
    });

    // Initialize gauges
    this.activeJobs = new Gauge({
      name: 'pdf_processing_jobs_active',
      help: 'Number of active PDF processing jobs',
    });

    this.evaluationScore = new Gauge({
      name: 'summary_evaluation_score',
      help: 'Summary evaluation score',
      labelNames: ['metric_name', 'document_id'],
    });

    logger.info('Metrics collector initialized');
  }

  // Counter methods
  public recordDocumentProcessed(status: 'success' | 'failure'): void {
    this.documentsProcessed.inc({ status });
  }

  public recordMCPToolCall(toolName: string, status: 'success' | 'error'): void {
    this.mcpToolCalls.inc({ tool_name: toolName, status });
  }

  // Histogram methods
  public recordProcessingDuration(stage: string, durationSeconds: number): void {
    this.processingDuration.observe({ stage }, durationSeconds);
  }

  public recordGraphSize(nodeCount: number, edgeCount: number): void {
    this.graphNodesCount.observe(nodeCount);
    this.graphEdgesCount.observe(edgeCount);
  }

  public recordLLMTokens(model: string, tokensUsed: number): void {
    this.llmTokensUsed.observe({ model }, tokensUsed);
  }

  // Gauge methods
  public incrementActiveJobs(): void {
    this.activeJobs.inc();
  }

  public decrementActiveJobs(): void {
    this.activeJobs.dec();
  }

  public recordEvaluationScore(metricName: string, documentId: string, score: number): void {
    this.evaluationScore.set({ metric_name: metricName, document_id: documentId }, score);
  }

  // Export metrics
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getContentType(): string {
    return register.contentType;
  }
}

export const metricsCollector = new MetricsCollector();
```

---

## Testing Examples

### Unit Test Example

#### `src/models/graph/__tests__/GraphNode.test.ts`
```typescript
import { GraphNode } from '../GraphNode';

describe('GraphNode', () => {
  describe('constructor', () => {
    it('should create a TEXT node with required properties', () => {
      const node = new GraphNode('node-1', 'TEXT', 'Sample content', 1);
      
      expect(node.id).toBe('node-1');
      expect(node.type).toBe('TEXT');
      expect(node.content).toBe('Sample content');
      expect(node.pageNumber).toBe(1);
      expect(node.edges).toEqual([]);
      expect(node.metadata).toEqual({});
    });

    it('should create node with metadata', () => {
      const metadata = { author: 'John Doe', section: 'Introduction' };
      const node = new GraphNode('node-2', 'HEADING', 'Chapter 1', 1, metadata);
      
      expect(node.metadata).toEqual(metadata);
    });
  });

  describe('edge management', () => {
    let node: GraphNode;

    beforeEach(() => {
      node = new GraphNode('node-1', 'TEXT', 'Content');
    });

    it('should add edge to another node', () => {
      node.addEdge('node-2');
      
      expect(node.edges).toContain('node-2');
      expect(node.getNeighborCount()).toBe(1);
    });

    it('should not add duplicate edges', () => {
      node.addEdge('node-2');
      node.addEdge('node-2');
      
      expect(node.edges).toEqual(['node-2']);
      expect(node.getNeighborCount()).toBe(1);
    });

    it('should remove edge', () => {
      node.addEdge('node-2');
      node.addEdge('node-3');
      node.removeEdge('node-2');
      
      expect(node.edges).toEqual(['node-3']);
      expect(node.getNeighborCount()).toBe(1);
    });

    it('should check if edge exists', () => {
      node.addEdge('node-2');
      
      expect(node.hasEdge('node-2')).toBe(true);
      expect(node.hasEdge('node-3')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const node = new GraphNode('node-1', 'TEXT', 'Content', 1, { key: 'value' });
      node.addEdge('node-2');
      
      const json = node.toJSON();
      
      expect(json).toEqual({
        id: 'node-1',
        type: 'TEXT',
        content: 'Content',
        pageNumber: 1,
        metadata: { key: 'value' },
        embedding: undefined,
        edges: ['node-2'],
      });
    });

    it('should restore from JSON', () => {
      const json = {
        id: 'node-1',
        type: 'TEXT' as const,
        content: 'Content',
        pageNumber: 1,
        metadata: { key: 'value' },
        edges: ['node-2'],
      };
      
      const node = GraphNode.fromJSON(json);
      
      expect(node.id).toBe('node-1');
      expect(node.type).toBe('TEXT');
      expect(node.edges).toEqual(['node-2']);
    });
  });
});
```

---

## Docker Configuration

### `Dockerfile`
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: pdf-ai-postgres
    environment:
      POSTGRES_DB: pdf_summary_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: pdf-ai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Node.js API Server
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pdf-ai-api
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: pdf_summary_ai
      DB_USER: postgres
      DB_PASSWORD: postgres
      REDIS_HOST: redis
      REDIS_PORT: 6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_MODEL: gpt-4o
      MAX_FILE_SIZE: 52428800
      UPLOAD_DIR: /app/uploads
      ENABLE_METRICS: true
      METRICS_PORT: 9090
      LOG_LEVEL: info
    ports:
      - "3000:3000"
      - "9090:9090"
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Prometheus (Metrics Collection)
  prometheus:
    image: prom/prometheus:latest
    container_name: pdf-ai-prometheus
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    depends_on:
      - api

  # Grafana (Metrics Visualization)
  grafana:
    image: grafana/grafana:latest
    container_name: pdf-ai-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

### `prometheus.yml`
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'pdf-summary-ai'
    static_configs:
      - targets: ['api:9090']
    metrics_path: '/metrics'
```

---

## Summary

This document provides **production-ready code examples** for all critical tasks in the PDF Summary AI implementation. Each example includes:

✅ **Complete Implementation** - Fully functional code, not pseudocode  
✅ **Best Practices** - TypeScript types, error handling, logging  
✅ **Testing** - Unit test examples with Jest  
✅ **Observability** - Metrics, logging, health checks  
✅ **Docker** - Complete containerization setup  

### How to Use These Examples

1. **Reference During Implementation** - Use as templates for each task
2. **Copy & Adapt** - Modify to fit specific requirements
3. **Learn Patterns** - Understand the architecture through code
4. **Verify Against Specs** - Ensure code meets acceptance criteria

### Next Steps

1. **Start with Phase 1 examples** (Project setup, database, upload)
2. **Follow TASK-SPECIFICATIONS.md** for acceptance criteria
3. **Run tests after each implementation** (`npm test`)
4. **Commit incrementally** with meaningful messages
5. **Use GROK-IMPLEMENTATION-PROMPT.md** for autonomous execution

All examples follow the **document-aware architecture** design with:
- ✅ Knowledge Graph data structures
- ✅ MCP context retrieval pattern
- ✅ Automatic evaluation system
- ✅ Production-ready observability
- ✅ Grounding to source nodes

**Ready for implementation!** 🚀
