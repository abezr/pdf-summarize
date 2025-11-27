// Database model interfaces for type safety

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string; // UUID
  user_id?: string;
  filename: string;
  file_size: number;
  status: DocumentStatus;
  pdf_url?: string;
  graph_data?: any; // JSONB
  summary?: string;
  metadata?: Record<string, any>; // JSONB
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentInput {
  user_id?: string;
  filename: string;
  file_size: number;
  pdf_url?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentInput {
  status?: DocumentStatus;
  graph_data?: any;
  summary?: string;
  metadata?: Record<string, any>;
}
