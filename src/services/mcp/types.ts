// MCP (Model Context Protocol) Tooling Types

export interface MCPTool {
  name: string;
  description: string;
  parameters: MCPParameter[];
  execute: (params: Record<string, any>) => Promise<MCPToolResult>;
}

export interface MCPParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tokensUsed?: number;
    executionTime?: number;
    nodesRetrieved?: number;
  };
}

export interface MCPContext {
  node: any; // Graph node
  neighbors: any[]; // Neighboring nodes
  totalTokens: number;
  depth: number;
  traversalPath: string[];
}

export interface TokenBudget {
  maxTokens: number;
  currentTokens: number;
  reserveTokens: number; // Keep some tokens for final response
}

export interface BFSTraversalOptions {
  maxDepth: number;
  maxNodes: number;
  nodeTypes?: string[]; // Filter by node types
  edgeTypes?: string[]; // Filter by edge types
  direction?: 'outgoing' | 'incoming' | 'both';
}

export interface ContextFormatterOptions {
  maxTokens: number;
  format: 'structured' | 'narrative' | 'compact';
  includeMetadata: boolean;
  prioritizeBy?: 'relevance' | 'recency' | 'importance';
}

// Predefined MCP tools
export const MCP_TOOL_NAMES = {
  GET_RELATED_NODE: 'get_related_node',
  GET_TABLE: 'get_table',
  GET_IMAGE: 'get_image',
  GET_SECTION: 'get_section',
  SEARCH_NODES: 'search_nodes',
} as const;

export type MCPToolName = typeof MCP_TOOL_NAMES[keyof typeof MCP_TOOL_NAMES];

// Tool execution context
export interface MCPExecutionContext {
  documentId: string;
  graph: any; // DocumentGraph
  tokenBudget: TokenBudget;
  userQuery?: string;
  conversationHistory?: any[];
}
