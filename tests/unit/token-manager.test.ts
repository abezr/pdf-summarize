import { TokenManager, tokenManager } from '../../src/services/llm/token-manager';

describe('TokenManager', () => {
  let manager: TokenManager;

  beforeEach(() => {
    manager = new TokenManager(100); // Small limit for testing
  });

  describe('estimateTokens', () => {
    test('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = manager.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    test('should estimate tokens for longer text', () => {
      const text = 'This is a longer piece of text with multiple sentences. It contains various words and punctuation marks!';
      const tokens = manager.estimateTokens(text);

      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(50);
    });

    test('should handle empty text', () => {
      expect(manager.estimateTokens('')).toBe(0);
      expect(manager.estimateTokens(null as any)).toBe(0);
    });

    test('should account for punctuation', () => {
      const textWithPunc = 'Hello, world! How are you?';
      const textWithoutPunc = 'Hello world How are you';

      const tokensWithPunc = manager.estimateTokens(textWithPunc);
      const tokensWithoutPunc = manager.estimateTokens(textWithoutPunc);

      expect(tokensWithPunc).toBeGreaterThan(tokensWithoutPunc);
    });

    test('should account for numbers', () => {
      const textWithNumbers = 'The year is 2024 and it has 12 months';
      const textWithoutNumbers = 'The year is current and it has several months';

      const tokensWithNumbers = manager.estimateTokens(textWithNumbers);
      const tokensWithoutNumbers = manager.estimateTokens(textWithoutNumbers);

      expect(tokensWithNumbers).toBeGreaterThan(tokensWithoutNumbers);
    });
  });

  describe('calculateCost', () => {
    test('should calculate cost for GPT-4o', () => {
      const tokens = {
        prompt: 1000,
        completion: 500,
        total: 1500
      };

      const cost = manager.calculateCost('gpt-4o', tokens);

      expect(cost.inputCost).toBe(0.005); // 1000 tokens * $0.005/1K
      expect(cost.outputCost).toBe(0.0075); // 500 tokens * $0.015/1K
      expect(cost.totalCost).toBe(0.0125);
      expect(cost.currency).toBe('USD');
    });

    test('should calculate cost for GPT-3.5-turbo', () => {
      const tokens = {
        prompt: 2000,
        completion: 1000,
        total: 3000
      };

      const cost = manager.calculateCost('gpt-3.5-turbo', tokens);

      expect(cost.inputCost).toBe(0.001); // 2000 tokens * $0.0005/1K
      expect(cost.outputCost).toBe(0.0015); // 1000 tokens * $0.0015/1K
      expect(cost.totalCost).toBe(0.0025);
    });

    test('should return zero cost for unknown model', () => {
      const tokens = {
        prompt: 1000,
        completion: 500,
        total: 1500
      };

      const cost = manager.calculateCost('unknown-model', tokens);

      expect(cost.totalCost).toBe(0);
      expect(cost.currency).toBe('USD');
    });
  });

  describe('recordUsage', () => {
    test('should record usage and return record', () => {
      const tokens = {
        prompt: 100,
        completion: 50,
        total: 150
      };

      const record = manager.recordUsage(
        'gpt-4o',
        'openai',
        'test-operation',
        tokens,
        { test: true }
      );

      expect(record.id).toBeDefined();
      expect(record.model).toBe('gpt-4o');
      expect(record.provider).toBe('openai');
      expect(record.operation).toBe('test-operation');
      expect(record.tokens).toEqual(tokens);
      expect(record.cost.totalCost).toBeGreaterThan(0);
      expect(record.metadata).toEqual({ test: true });
    });

    test('should maintain record limit', () => {
      const manager = new TokenManager(3);

      // Add 5 records
      for (let i = 0; i < 5; i++) {
        manager.recordUsage('gpt-4o', 'openai', 'test', {
          prompt: 100,
          completion: 50,
          total: 150
        });
      }

      // Should only keep 3 most recent
      expect(manager['usageRecords'].length).toBe(3);
    });
  });

  describe('getUsageStats', () => {
    beforeEach(() => {
      // Add some test records
      manager.recordUsage('gpt-4o', 'openai', 'summarization', {
        prompt: 1000,
        completion: 500,
        total: 1500
      });

      manager.recordUsage('gpt-3.5-turbo', 'openai', 'extraction', {
        prompt: 500,
        completion: 200,
        total: 700
      });

      manager.recordUsage('gpt-4o', 'openai', 'summarization', {
        prompt: 800,
        completion: 400,
        total: 1200
      });
    });

    test('should calculate total statistics', () => {
      const stats = manager.getUsageStats(24);

      expect(stats.totalTokens).toBe(3400);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.recordsCount).toBe(3);
    });

    test('should group by operation', () => {
      const stats = manager.getUsageStats(24);

      expect(stats.operations.summarization).toBe(2);
      expect(stats.operations.extraction).toBe(1);
    });

    test('should group by model', () => {
      const stats = manager.getUsageStats(24);

      expect(stats.models['gpt-4o']).toBe(2700);
      expect(stats.models['gpt-3.5-turbo']).toBe(700);
    });
  });

  describe('estimateCostForOperation', () => {
    test('should estimate cost for planned operation', () => {
      const cost = manager.estimateCostForOperation('gpt-4o', 1000, 500);

      expect(cost.inputCost).toBe(0.005);
      expect(cost.outputCost).toBe(0.0075);
      expect(cost.totalCost).toBe(0.0125);
    });
  });

  describe('compareModelCosts', () => {
    test('should compare costs between models', () => {
      const models = ['gpt-4o', 'gpt-3.5-turbo', 'gpt-4'];
      const comparisons = manager.compareModelCosts(models, 1000, 500);

      expect(comparisons).toHaveLength(3);

      // GPT-3.5-turbo should be most efficient (lowest cost)
      const gpt35 = comparisons.find(c => c.model === 'gpt-3.5-turbo');
      expect(gpt35!.efficiency).toBe(1.0);

      // Others should have higher efficiency ratios
      const gpt4o = comparisons.find(c => c.model === 'gpt-4o');
      expect(gpt4o!.efficiency).toBeGreaterThan(1.0);
    });
  });

  describe('recommendModel', () => {
    test('should recommend model for simple tasks', () => {
      const recommendation = manager.recommendModel('simple');

      expect(recommendation.recommended).toBe('gemini-1.5-flash-8b');
      expect(recommendation.alternatives).toContain('gpt-3.5-turbo');
    });

    test('should recommend model for complex tasks', () => {
      const recommendation = manager.recommendModel('complex');

      expect(recommendation.recommended).toBe('gpt-4o');
      expect(recommendation.alternatives).toContain('gemini-1.5-pro');
    });

    test('should respect budget constraints', () => {
      const recommendation = manager.recommendModel('complex', 0.001); // Very low budget

      // Should choose cheaper alternative
      expect(['gpt-3.5-turbo', 'gemini-1.5-flash-8b']).toContain(recommendation.recommended);
    });
  });

  describe('clearOldRecords', () => {
    test('should clear old records', () => {
      // Add a record
      manager.recordUsage('gpt-4o', 'openai', 'test', {
        prompt: 100,
        completion: 50,
        total: 150
      });

      const beforeCount = manager['usageRecords'].length;

      // Clear records older than 0 hours (should clear all)
      manager.clearOldRecords(0);

      expect(manager['usageRecords'].length).toBeLessThan(beforeCount);
    });
  });

  describe('exportUsageData', () => {
    test('should export usage data', () => {
      manager.recordUsage('gpt-4o', 'openai', 'test', {
        prompt: 100,
        completion: 50,
        total: 150
      });

      const data = manager.exportUsageData(24);

      expect(data).toHaveLength(1);
      expect(data[0].model).toBe('gpt-4o');
      expect(data[0].operation).toBe('test');
    });
  });
});
