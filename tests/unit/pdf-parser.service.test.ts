import { PDFParserService } from '../../src/services/pdf-parser.service';
import { AppError } from '../../src/utils/errors';
import { mockFileBuffers } from '../fixtures/mockData';

// Mock pdf-parse to avoid issues with corrupted test PDF
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    if (buffer.toString().includes('%PDF')) {
      return Promise.resolve({
        text: 'This is sample PDF text content.\n\nIt contains multiple paragraphs.\n\nThis is the second paragraph with some content.\n\nFinal paragraph here.',
        numpages: 1,
        info: {
          Title: 'Sample Document',
          Author: 'Test Author',
          CreationDate: new Date('2024-01-01')
        }
      });
    }
    throw new Error('Invalid PDF');
  });
});

describe('PDFParserService', () => {
  let pdfParser: PDFParserService;

  beforeEach(() => {
    pdfParser = new PDFParserService();
  });

  describe('isValidPDF', () => {
    it('should return true for valid PDF buffer', () => {
      const result = pdfParser.isValidPDF(mockFileBuffers.smallPDF);
      expect(result).toBe(true);
    });

    it('should return false for invalid buffer', () => {
      const invalidBuffer = Buffer.from('not a pdf');
      const result = pdfParser.isValidPDF(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = pdfParser.isValidPDF(emptyBuffer);
      expect(result).toBe(false);
    });

    it('should return false for buffer too small', () => {
      const smallBuffer = Buffer.from('abc');
      const result = pdfParser.isValidPDF(smallBuffer);
      expect(result).toBe(false);
    });

    it('should return false for buffer without PDF header', () => {
      const noHeaderBuffer = Buffer.from('not starting with PDF header');
      const result = pdfParser.isValidPDF(noHeaderBuffer);
      expect(result).toBe(false);
    });

    it('should return false for buffer without EOF marker', () => {
      const noEOFBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n');
      const result = pdfParser.isValidPDF(noEOFBuffer);
      expect(result).toBe(false);
    });
  });

  describe('parsePDF', () => {
    it('should parse a valid PDF and return structured data', async () => {
      const result = await pdfParser.parsePDF(mockFileBuffers.smallPDF, 'test.pdf');

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.pages).toBeDefined();
      expect(result.fullText).toBeDefined();

      // Check metadata structure
      expect(typeof result.metadata.pages).toBe('number');
      expect(result.metadata.fileSize).toBe(mockFileBuffers.smallPDF.length);

      // Check pages array with enhanced metadata
      expect(Array.isArray(result.pages)).toBe(true);
      if (result.pages.length > 0) {
        const firstPage = result.pages[0];
        expect(firstPage).toHaveProperty('pageNumber');
        expect(firstPage).toHaveProperty('content');
        expect(firstPage).toHaveProperty('width');
        expect(firstPage).toHaveProperty('height');
        expect(typeof firstPage.pageNumber).toBe('number');
        expect(typeof firstPage.content).toBe('string');
        expect(typeof firstPage.width).toBe('number');
        expect(typeof firstPage.height).toBe('number');

        // Check text elements if present
        if (firstPage.textElements) {
          expect(Array.isArray(firstPage.textElements)).toBe(true);
          if (firstPage.textElements.length > 0) {
            const firstElement = firstPage.textElements[0];
            expect(firstElement).toHaveProperty('text');
            expect(firstElement).toHaveProperty('x');
            expect(firstElement).toHaveProperty('y');
            expect(firstElement).toHaveProperty('width');
            expect(firstElement).toHaveProperty('height');
          }
        }

        // Check paragraphs if present
        if (firstPage.paragraphs) {
          expect(Array.isArray(firstPage.paragraphs)).toBe(true);
          if (firstPage.paragraphs.length > 0) {
            const firstParagraph = firstPage.paragraphs[0];
            expect(firstParagraph).toHaveProperty('id');
            expect(firstParagraph).toHaveProperty('pageNumber');
            expect(firstParagraph).toHaveProperty('content');
            expect(firstParagraph).toHaveProperty('startPosition');
            expect(firstParagraph).toHaveProperty('endPosition');
            expect(firstParagraph).toHaveProperty('lineCount');
            expect(firstParagraph).toHaveProperty('confidence');
            expect(typeof firstParagraph.confidence).toBe('number');
            expect(firstParagraph.confidence).toBeGreaterThanOrEqual(0);
            expect(firstParagraph.confidence).toBeLessThanOrEqual(1);
          }
        }
      }

      // Check full text
      expect(typeof result.fullText).toBe('string');
    });

    it('should handle PDF with metadata', async () => {
      // Mock PDF now includes sample metadata
      const result = await pdfParser.parsePDF(mockFileBuffers.smallPDF);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.title).toBe('Sample Document'); // Mock PDF has title
      expect(result.metadata.author).toBe('Test Author'); // Mock PDF has author
      expect(typeof result.metadata.pages).toBe('number');
      expect(result.metadata.pages).toBe(1);
      expect(result.metadata.fileSize).toBe(mockFileBuffers.smallPDF.length);

      // Check optional metadata fields
      if (result.metadata.keywords) {
        expect(Array.isArray(result.metadata.keywords)).toBe(true);
      }
      if (result.metadata.language) {
        expect(typeof result.metadata.language).toBe('string');
      }
      if (result.metadata.pageSize) {
        expect(result.metadata.pageSize).toHaveProperty('width');
        expect(result.metadata.pageSize).toHaveProperty('height');
        expect(result.metadata.pageSize).toHaveProperty('unit');
      }
      if (result.metadata.encryption) {
        expect(typeof result.metadata.encryption.encrypted).toBe('boolean');
      }
    });

    it('should throw AppError for invalid PDF', async () => {
      // Create a buffer larger than 100 bytes but with invalid PDF content
      const invalidBuffer = Buffer.from('not a pdf file at all, this is just some text that is definitely not a PDF document and should be rejected');

      await expect(pdfParser.parsePDF(invalidBuffer)).rejects.toThrow(AppError);
    });

    it('should provide specific error messages for different corruption types', async () => {
      // Test with a buffer that's too small
      const tinyBuffer = Buffer.from('tiny'); // Only 4 bytes, less than minimum 100

      try {
        await pdfParser.parsePDF(tinyBuffer);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('PDF file is too small');
      }
    });
  });

  describe('extractText', () => {
    it('should extract text content from PDF', async () => {
      const text = await pdfParser.extractText(mockFileBuffers.smallPDF);

      expect(typeof text).toBe('string');
      // Note: Mock PDF may not contain extractable text, so we just check it's a string
    });
  });

  describe('extractParagraphs', () => {
    it('should extract paragraphs with metadata from PDF', async () => {
      const paragraphs = await pdfParser.extractParagraphs(mockFileBuffers.smallPDF);

      expect(Array.isArray(paragraphs)).toBe(true);
      expect(paragraphs.length).toBeGreaterThan(0);

      const firstParagraph = paragraphs[0];
      expect(firstParagraph).toHaveProperty('id');
      expect(firstParagraph).toHaveProperty('pageNumber');
      expect(firstParagraph).toHaveProperty('content');
      expect(firstParagraph).toHaveProperty('startPosition');
      expect(firstParagraph).toHaveProperty('endPosition');
      expect(firstParagraph).toHaveProperty('lineCount');
      expect(firstParagraph).toHaveProperty('confidence');

      expect(typeof firstParagraph.pageNumber).toBe('number');
      expect(typeof firstParagraph.startPosition).toBe('number');
      expect(typeof firstParagraph.endPosition).toBe('number');
      expect(typeof firstParagraph.lineCount).toBe('number');
      expect(typeof firstParagraph.confidence).toBe('number');
      expect(firstParagraph.confidence).toBeGreaterThanOrEqual(0);
      expect(firstParagraph.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getParagraphStats', () => {
    it('should calculate paragraph statistics', async () => {
      const stats = await pdfParser.getParagraphStats(mockFileBuffers.smallPDF);

      expect(stats).toHaveProperty('totalParagraphs');
      expect(stats).toHaveProperty('avgParagraphLength');
      expect(stats).toHaveProperty('avgConfidence');
      expect(stats).toHaveProperty('paragraphsByPage');

      expect(typeof stats.totalParagraphs).toBe('number');
      expect(typeof stats.avgParagraphLength).toBe('number');
      expect(typeof stats.avgConfidence).toBe('number');
      expect(Array.isArray(stats.paragraphsByPage)).toBe(true);

      expect(stats.totalParagraphs).toBeGreaterThan(0);
      expect(stats.avgParagraphLength).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.avgConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata without full text parsing', async () => {
      const metadata = await pdfParser.extractMetadata(mockFileBuffers.smallPDF, 'test.pdf');

      expect(metadata).toBeDefined();
      expect(metadata.title).toBe('Sample Document');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.pages).toBe(1);
      expect(metadata.fileSize).toBe(mockFileBuffers.smallPDF.length);

      // Check that dates are properly parsed or undefined
      if (metadata.creationDate) {
        expect(metadata.creationDate).toBeInstanceOf(Date);
      }
      if (metadata.modificationDate) {
        expect(metadata.modificationDate).toBeInstanceOf(Date);
      }
    });

    it('should handle invalid PDF for metadata extraction', async () => {
      // Create a buffer larger than 100 bytes but with invalid PDF content
      const invalidBuffer = Buffer.from('not a pdf file at all, this is just some text that is definitely not a PDF document and should be rejected');

      await expect(pdfParser.extractMetadata(invalidBuffer)).rejects.toThrow(AppError);
    });

    it('should provide specific error messages for metadata extraction failures', async () => {
      const tinyBuffer = Buffer.from('tiny'); // Only 4 bytes, less than minimum 100

      try {
        await pdfParser.extractMetadata(tinyBuffer);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toContain('PDF file is too small');
      }
    });
  });

  describe('splitTextByPages', () => {
    // Test the private method indirectly through parsePDF
    it('should distribute content across pages appropriately', async () => {
      const result = await pdfParser.parsePDF(mockFileBuffers.smallPDF);

      // Our mock PDF should have content distributed across pages
      expect(result.pages.length).toBeGreaterThan(0);
      result.pages.forEach(page => {
        expect(typeof page.pageNumber).toBe('number');
        expect(typeof page.content).toBe('string');
      });
    });
  });
});
