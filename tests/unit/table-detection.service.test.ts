import { tableDetectionService, TableDetectionService } from '../../src/services/table-detection.service';

describe('TableDetectionService', () => {
  let service: TableDetectionService;

  beforeEach(() => {
    service = new TableDetectionService();
  });

  describe('initialization', () => {
    test('should create service instance', () => {
      expect(service).toBeInstanceOf(TableDetectionService);
    });

    test('should have health status', () => {
      const health = service.getHealthStatus();
      expect(health).toHaveProperty('tabulaAvailable');
      expect(health).toHaveProperty('pdfTableExtractorAvailable');
      expect(health).toHaveProperty('overallHealthy');
    });
  });

  describe('library availability', () => {
    test('should have at least one table detection library available', () => {
      const health = service.getHealthStatus();
      expect(health.overallHealthy).toBe(true);
    });

    test('should have tabula available', () => {
      const health = service.getHealthStatus();
      expect(health.tabulaAvailable).toBe(true);
    });

    test('should have pdf-table-extractor available', () => {
      const health = service.getHealthStatus();
      expect(health.pdfTableExtractorAvailable).toBe(true);
    });
  });

  describe('service methods', () => {
    test('should export singleton instance', () => {
      expect(tableDetectionService).toBeInstanceOf(TableDetectionService);
    });

    test('should have extractTables method', () => {
      expect(typeof service.extractTables).toBe('function');
    });

    test('should have getHealthStatus method', () => {
      expect(typeof service.getHealthStatus).toBe('function');
    });
  });

  // Integration tests would require actual PDF files with tables
  // These would be added in a separate integration test suite
});
