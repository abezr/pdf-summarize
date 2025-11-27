import { SummarizationService, SummarizationOptions } from '../../src/services/llm/summarization.service';
import { Graph } from '../../src/models/graph.model';

// Mock the LLM provider manager
jest.mock('../../src/services/llm/LLMProviderManager', () => ({
  llmProviderManager: {
    generateText: jest.fn(),
    getProvider: jest.fn()
  }
}));

// Mock the prompt template service
jest.mock('../../src/services/llm/prompt-templates', () => ({
  promptTemplateService: {
    generatePrompt: jest.fn(),
    estimateTokenCount: jest.fn(),
    getSupportedTypes: jest.fn()
  }
}));

import { llmProviderManager } from '../../src/services/llm/LLMProviderManager';
import { promptTemplateService } from '../../src/services/llm/prompt-templates';

describe('SummarizationService', () => {
  let service: SummarizationService;
  let mockGraph: Graph;
  let mockLLMResponse: any;
  let mockPromptTemplate: any;

  beforeEach(() => {
    service = new SummarizationService();

    // Reset mocks
    jest.clearAllMocks();

    // Create mock graph
    mockGraph = {
      id: 'test-graph',
      documentId: 'test-doc',
      nodes: [
        {
          id: 'section-1',
          type: 'section',
          label: 'Introduction',
          content: 'Introduction content',
          position: { page: 1, start: 0, end: 50 },
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'para-1',
          type: 'paragraph',
          label: 'First paragraph',
          content: 'This is important content with key findings.',
          position: { page: 1, start: 51, end: 150 },
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      edges: [],
      index: {
        byType: new Map(),
        byPage: new Map(),
        byKeyword: new Map(),
        nodeMap: new Map(),
        edgeMap: new Map(),
        adjacencyList: new Map()
      },
      statistics: {
        nodeCount: 2,
        edgeCount: 0,
        nodesByType: {
          document: 0,
          section: 1,
          paragraph: 1,
          table: 0,
          image: 0,
          list: 0,
          code: 0,
          metadata: 0
        },
        edgesByType: {
          contains: 0,
          references: 0,
          follows: 0,
          similar: 0,
          parent: 0,
          child: 0,
          next: 0,
          previous: 0
        },
        averageDegree: 0,
        maxDegree: 0,
        density: 0,
        components: 2
      },
      metadata: {
        created_at: new Date(),
        updated_at: new Date(),
        version: '1.0',
        status: 'complete'
      }
    };

    // Mock LLM response
    mockLLMResponse = {
      content: 'This is a generated summary of the document.',
      model: 'gpt-4o',
      provider: 'openai',
      tokensUsed: {
        prompt: 150,
        completion: 50,
        total: 200
      },
      cost: 0.015,
      processingTime: 1000
    };

    // Mock prompt template
    mockPromptTemplate = {
      systemPrompt: 'You are an expert summarizer.',
      userPrompt: 'Summarize this content...',
      context: 'Document content here...',
      instructions: ['Be concise', 'Be accurate']
    };

    // Setup mocks
    (promptTemplateService.generatePrompt as jest.Mock).mockReturnValue(mockPromptTemplate);
    (promptTemplateService.estimateTokenCount as jest.Mock).mockReturnValue(100);
    (promptTemplateService.getSupportedTypes as jest.Mock).mockReturnValue(['executive', 'detailed', 'chapter', 'bullet-points', 'narrative', 'technical']);
    (llmProviderManager.generateText as jest.Mock).mockResolvedValue(mockLLMResponse);
  });

  describe('summarizeGraph', () => {
    test('should generate executive summary by default', async () => {
      const options: SummarizationOptions = {};
      const result = await service.summarizeGraph(mockGraph, options);

      expect(promptTemplateService.generatePrompt).toHaveBeenCalledWith({
        type: 'executive',
        graph: mockGraph,
        maxLength: 500,
        focus: undefined,
        exclude: undefined,
        style: undefined
      });

      expect(llmProviderManager.generateText).toHaveBeenCalled();
      expect(result.summary).toBe(mockLLMResponse.content);
      expect(result.type).toBe('executive');
      expect(result.model).toBe('gpt-4o');
      expect(result.provider).toBe('openai');
    });

    test('should handle custom options', async () => {
      const options: SummarizationOptions = {
        type: 'detailed',
        maxLength: 1000,
        focus: ['key findings'],
        exclude: ['unimportant details'],
        style: 'technical',
        model: 'gpt-4-turbo',
        provider: 'openai'
      };

      await service.summarizeGraph(mockGraph, options);

      expect(promptTemplateService.generatePrompt).toHaveBeenCalledWith({
        type: 'detailed',
        graph: mockGraph,
        maxLength: 1000,
        focus: ['key findings'],
        exclude: ['unimportant details'],
        style: 'technical'
      });
    });

    test('should calculate graph statistics', async () => {
      const result = await service.summarizeGraph(mockGraph);

      expect(result.graphStats.nodesProcessed).toBe(2);
      expect(result.graphStats.sectionsFound).toBe(1);
      expect(result.graphStats.totalContentLength).toBeGreaterThan(0);
    });

    test('should throw error for empty graph', async () => {
      const emptyGraph = { ...mockGraph, nodes: [] };

      await expect(service.summarizeGraph(emptyGraph))
        .rejects
        .toThrow('Graph has no nodes to summarize');
    });

    test('should handle LLM errors', async () => {
      const llmError = new Error('LLM service unavailable');
      (llmProviderManager.generateText as jest.Mock).mockRejectedValue(llmError);

      await expect(service.summarizeGraph(mockGraph))
        .rejects
        .toThrow('Summarization failed');
    });
  });

  describe('summarizeGraphMultiple', () => {
    test('should generate multiple summary types', async () => {
      const types = ['executive', 'bullet-points'] as const;
      const result = await service.summarizeGraphMultiple(mockGraph, types);

      expect(result.executive).toBeDefined();
      expect(result['bullet-points']).toBeDefined();
      expect(llmProviderManager.generateText).toHaveBeenCalledTimes(2);
    });

    test('should process summaries sequentially', async () => {
      const types = ['executive', 'detailed', 'chapter'] as const;

      // Make second call fail
      (llmProviderManager.generateText as jest.Mock)
        .mockResolvedValueOnce(mockLLMResponse)
        .mockRejectedValueOnce(new Error('Second call failed'));

      await expect(service.summarizeGraphMultiple(mockGraph, types))
        .rejects
        .toThrow('Summarization failed');

      // Should have called once before failing
      expect(llmProviderManager.generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('estimateCost', () => {
    test('should estimate cost for OpenAI', async () => {
      (llmProviderManager.getProvider as jest.Mock).mockReturnValue({
        name: 'openai',
        supportedModels: ['gpt-4o']
      });

      const estimate = await service.estimateCost(mockGraph, { type: 'executive' });

      expect(estimate.estimatedTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.recommendedModel).toBe('gpt-4o');
    });

    test('should estimate cost for Google', async () => {
      (llmProviderManager.getProvider as jest.Mock).mockReturnValue({
        name: 'google',
        supportedModels: ['gemini-1.5-pro']
      });

      const estimate = await service.estimateCost(mockGraph, { type: 'detailed' });

      expect(estimate.estimatedTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('validateOptions', () => {
    test('should accept valid options', () => {
      const options: SummarizationOptions = {
        type: 'executive',
        maxLength: 1000,
        style: 'formal'
      };

      expect(() => service.validateOptions(options)).not.toThrow();
    });

    test('should reject invalid summary type', () => {
      const options: SummarizationOptions = {
        type: 'invalid-type' as any
      };

      expect(() => service.validateOptions(options))
        .toThrow('Unsupported summary type');
    });

    test('should reject invalid maxLength', () => {
      expect(() => service.validateOptions({ maxLength: 10 }))
        .toThrow('maxLength must be between 50 and 5000');

      expect(() => service.validateOptions({ maxLength: 10000 }))
        .toThrow('maxLength must be between 50 and 5000');
    });

    test('should reject invalid style', () => {
      const options: SummarizationOptions = {
        style: 'invalid-style' as any
      };

      expect(() => service.validateOptions(options))
        .toThrow('style must be one of: formal, casual, technical');
    });
  });

  describe('getAvailableTypes', () => {
    test('should return supported types', () => {
      (promptTemplateService.getSupportedTypes as jest.Mock).mockReturnValue(['executive', 'detailed']);

      const types = service.getAvailableTypes();

      expect(types).toEqual(['executive', 'detailed']);
      expect(promptTemplateService.getSupportedTypes).toHaveBeenCalled();
    });
  });
});
