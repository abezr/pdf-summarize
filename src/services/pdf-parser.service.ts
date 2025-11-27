import pdfParse from 'pdf-parse';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface PDFPage {
  pageNumber: number;
  content: string;
  width?: number;
  height?: number;
  textElements?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  paragraphs?: PDFParagraph[];
}

export interface PDFParagraph {
  id: string;
  pageNumber: number;
  content: string;
  startPosition: number; // Character position in full text
  endPosition: number;
  lineCount: number;
  confidence: number; // 0-1, how confident we are this is a paragraph
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pages: number;
  fileSize?: number;
  keywords?: string[];
  language?: string;
  pageSize?: {
    width: number;
    height: number;
    unit: 'pt' | 'mm' | 'in';
  };
  encryption?: {
    encrypted: boolean;
    permissions?: string[];
  };
}

export interface PDFParseResult {
  metadata: PDFMetadata;
  pages: PDFPage[];
  fullText: string;
}

/**
 * Service for parsing PDF files and extracting text content
 */
export class PDFParserService {
  /**
   * Parse a PDF buffer and extract text content with metadata
   */
  async parsePDF(buffer: Buffer, filename?: string): Promise<PDFParseResult> {
    try {
      logger.info('Starting PDF parsing', { filename, size: buffer.length });

      // Pre-validation
      if (!this.validatePDFStructure(buffer)) {
        throw new Error('Invalid PDF structure');
      }

      // Parse the PDF using pdf-parse
      const data = await pdfParse(buffer);

      // Extract enhanced metadata
      const metadata = this.extractEnhancedMetadata(data, buffer);

      // Extract pages with enhanced metadata
      const pages: PDFPage[] = [];
      let fullText = '';
      let charOffset = 0;

      // Split the full text by pages with improved boundary detection
      const pageTexts = this.splitTextByPages(data.text, data.numpages);

      for (let i = 0; i < data.numpages; i++) {
        const pageContent = pageTexts[i] || '';
        const trimmedContent = pageContent.trim();
        const pageMetadata = this.extractPageMetadata(trimmedContent, i + 1, charOffset);

        pages.push(pageMetadata);
        fullText += trimmedContent + '\n';
        charOffset += trimmedContent.length + 1; // +1 for newline
      }

      const result: PDFParseResult = {
        metadata,
        pages,
        fullText: fullText.trim()
      };

      logger.info('PDF parsing completed successfully', {
        filename,
        pages: metadata.pages,
        totalChars: fullText.length
      });

      return result;

    } catch (error) {
      const corruptionType = this.detectCorruptionType(buffer, error);
      const errorDetails = {
        filename,
        corruptionType,
        fileSize: buffer.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      logger.error('PDF parsing failed', errorDetails);

      // Provide specific error messages based on corruption type
      let errorMessage = 'PDF parsing failed';
      let statusCode = 400;

      switch (corruptionType) {
        case 'xref_corruption':
          errorMessage = 'PDF file has corrupted cross-reference table. The file may be damaged or incomplete.';
          break;
        case 'invalid_format':
          errorMessage = 'Invalid PDF format. The file may not be a valid PDF document.';
          break;
        case 'truncated_file':
          errorMessage = 'PDF file appears to be truncated or incomplete.';
          break;
        case 'encrypted_pdf':
          errorMessage = 'PDF file is encrypted or password-protected. Encrypted PDFs are not supported.';
          statusCode = 422; // Unprocessable Entity
          break;
        case 'too_small':
          errorMessage = 'PDF file is too small to be valid.';
          break;
        case 'missing_eof':
          errorMessage = 'PDF file is missing end-of-file marker.';
          break;
        default:
          errorMessage = `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      throw new AppError(errorMessage, statusCode);
    }
  }

  /**
   * Split text content by pages with improved metadata extraction
   * Note: pdf-parse provides full text but not per-page text by default.
   * This implementation provides approximate page boundaries.
   */
  private splitTextByPages(fullText: string, numPages: number): string[] {
    if (numPages === 1) {
      return [fullText];
    }

    // Try to split by form feed characters (page breaks) first
    const pageBreakPattern = /\f/g;
    const formFeedPages = fullText.split(pageBreakPattern);

    if (formFeedPages.length > 1 && formFeedPages.length <= numPages) {
      // Pad with empty strings if we have fewer pages than expected
      while (formFeedPages.length < numPages) {
        formFeedPages.push('');
      }
      return formFeedPages.slice(0, numPages);
    }

    // Fallback: split by double newlines and distribute more intelligently
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    if (paragraphs.length === 0) {
      return Array(numPages).fill('');
    }

    // Estimate paragraphs per page based on total content
    const avgParagraphsPerPage = Math.max(1, Math.floor(paragraphs.length / numPages));
    const pages: string[] = [];

    for (let i = 0; i < numPages; i++) {
      const start = i * avgParagraphsPerPage;
      let end = start + avgParagraphsPerPage;

      // For the last page, include any remaining paragraphs
      if (i === numPages - 1) {
        end = paragraphs.length;
      }

      const pageContent = paragraphs.slice(start, end).join('\n\n');
      pages.push(pageContent);
    }

    return pages;
  }

  /**
   * Extract enhanced page metadata including estimated positions and paragraph detection
   * Note: pdf-parse doesn't provide text positioning by default.
   * For accurate positioning, consider using pdfjs-dist.
   */
  private extractPageMetadata(pageContent: string, pageNumber: number, globalCharOffset: number = 0): PDFPage {
    // Estimate page dimensions (standard letter size in points)
    const width = 612; // 8.5 inches * 72 points
    const height = 792; // 11 inches * 72 points

    // Basic text elements extraction (approximate)
    const lines = pageContent.split('\n').filter(line => line.trim().length > 0);
    const textElements = lines.map((line, index) => ({
      text: line.trim(),
      x: 50, // Left margin estimate
      y: 50 + (index * 14), // Top margin + line height estimate
      width: Math.min(line.length * 8, width - 100), // Estimate width based on text length
      height: 12 // Estimate line height
    }));

    // Detect paragraphs in this page
    const paragraphs = this.detectParagraphs(pageContent, pageNumber, globalCharOffset);

    return {
      pageNumber,
      content: pageContent,
      width,
      height,
      textElements,
      paragraphs
    };
  }

  /**
   * Extract enhanced metadata from PDF data
   */
  private extractEnhancedMetadata(data: any, buffer: Buffer): PDFMetadata {
    const metadata: PDFMetadata = {
      title: this.cleanMetadataString(data.info?.Title),
      author: this.cleanMetadataString(data.info?.Author),
      subject: this.cleanMetadataString(data.info?.Subject),
      creator: this.cleanMetadataString(data.info?.Creator),
      producer: this.cleanMetadataString(data.info?.Producer),
      creationDate: data.info?.CreationDate ? this.parsePDFDate(data.info.CreationDate) : undefined,
      modificationDate: data.info?.ModDate ? this.parsePDFDate(data.info.ModDate) : undefined,
      pages: data.numpages,
      fileSize: buffer.length
    };

    // Extract keywords if available
    if (data.info?.Keywords) {
      metadata.keywords = this.parseKeywords(data.info.Keywords);
    }

    // Extract language if available
    if (data.info?.Language) {
      metadata.language = data.info.Language;
    }

    // Estimate page size (standard letter if not specified)
    metadata.pageSize = {
      width: 612, // 8.5 inches * 72 points
      height: 792, // 11 inches * 72 points
      unit: 'pt'
    };

    // Check for encryption (basic detection)
    metadata.encryption = {
      encrypted: false, // pdf-parse doesn't provide encryption info directly
    };

    return metadata;
  }

  /**
   * Clean and normalize metadata strings
   */
  private cleanMetadataString(value: any): string | undefined {
    if (!value) return undefined;

    const str = String(value).trim();
    if (str.length === 0) return undefined;

    // Remove null bytes and other control characters
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  }

  /**
   * Parse PDF date format (D:YYYYMMDDHHmmSSOHH'mm')
   */
  private parsePDFDate(dateStr: string): Date | undefined {
    try {
      // Handle various PDF date formats
      const cleanDate = dateStr.replace(/^D:/, '');

      // Try standard parsing first
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      // Handle format: YYYYMMDDHHmmSS
      if (cleanDate.length >= 14) {
        const year = cleanDate.substring(0, 4);
        const month = cleanDate.substring(4, 6);
        const day = cleanDate.substring(6, 8);
        const hour = cleanDate.substring(8, 10);
        const minute = cleanDate.substring(10, 12);
        const second = cleanDate.substring(12, 14);

        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        const parsed = new Date(isoString);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }

      // If all parsing fails, return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse keywords from metadata
   */
  private parseKeywords(keywords: any): string[] {
    if (!keywords) return [];

    const keywordStr = String(keywords);
    // Split by common separators: commas, semicolons, or spaces
    return keywordStr
      .split(/[;,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  /**
   * Detect paragraphs in text content using heuristics
   */
  private detectParagraphs(text: string, pageNumber: number, charOffset: number): PDFParagraph[] {
    if (!text.trim()) return [];

    const paragraphs: PDFParagraph[] = [];
    let currentPosition = charOffset;

    // Split text by double newlines (paragraph breaks)
    const rawParagraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    for (let i = 0; i < rawParagraphs.length; i++) {
      const paragraphText = rawParagraphs[i].trim();
      if (paragraphText.length === 0) continue;

      const startPosition = currentPosition;
      const endPosition = startPosition + paragraphText.length;

      // Count lines in this paragraph
      const lines = paragraphText.split('\n').filter(line => line.trim().length > 0);
      const lineCount = lines.length;

      // Calculate confidence based on heuristics
      let confidence = 0.5; // Base confidence

      // Higher confidence for paragraphs with multiple sentences
      const sentenceCount = (paragraphText.match(/[.!?]+/g) || []).length;
      if (sentenceCount >= 2) confidence += 0.2;

      // Higher confidence for paragraphs with reasonable length
      if (paragraphText.length > 50 && paragraphText.length < 1000) confidence += 0.2;

      // Lower confidence for very short paragraphs (might be titles/headings)
      if (paragraphText.length < 20) confidence -= 0.3;

      // Clamp confidence between 0 and 1
      confidence = Math.max(0, Math.min(1, confidence));

      paragraphs.push({
        id: `p${pageNumber}-${i + 1}`,
        pageNumber,
        content: paragraphText,
        startPosition,
        endPosition,
        lineCount,
        confidence
      });

      // Update position for next paragraph (include the paragraph break)
      currentPosition = endPosition + 2; // +2 for \n\n
    }

    return paragraphs;
  }

  /**
   * Validate if a buffer contains a valid PDF with enhanced checks
   */
  isValidPDF(buffer: Buffer): boolean {
    try {
      return this.validatePDFStructure(buffer);
    } catch {
      return false;
    }
  }

  /**
   * Comprehensive PDF structure validation
   */
  private validatePDFStructure(buffer: Buffer): boolean {
    // Check minimum size first - this will be caught as "too_small"
    if (buffer.length < 100) {
      throw new Error('PDF file is too small to be valid.');
    }

    // Check PDF header
    const header = buffer.subarray(0, 8).toString();
    if (!header.startsWith('%PDF-')) {
      throw new Error('Invalid PDF header. File does not appear to be a PDF.');
    }

    // Check for PDF trailer
    const trailerIndex = buffer.lastIndexOf('%%EOF');
    if (trailerIndex === -1) {
      throw new Error('Missing PDF end-of-file marker.');
    }

    // Check for xref table or xref stream
    const xrefIndex = buffer.lastIndexOf('xref', trailerIndex);
    const xrefStreamIndex = buffer.lastIndexOf('/Type/XRef', trailerIndex);

    if (xrefIndex === -1 && xrefStreamIndex === -1) {
      throw new Error('Missing PDF cross-reference table.');
    }

    // Basic structure validation passed
    return true;
  }

  /**
   * Detect common PDF corruption types
   */
  private detectCorruptionType(buffer: Buffer, error: any): string {
    const errorMessage = error?.message || '';

    // Check for specific error patterns
    if (errorMessage.includes('bad XRef entry')) {
      return 'xref_corruption';
    }
    if (errorMessage.includes('Invalid PDF')) {
      return 'invalid_format';
    }
    if (errorMessage.includes('Unexpected EOF')) {
      return 'truncated_file';
    }
    if (errorMessage.includes('Bad password') || errorMessage.includes('encrypted')) {
      return 'encrypted_pdf';
    }
    if (buffer.length < 100) {
      return 'too_small';
    }
    if (!buffer.toString().includes('%%EOF')) {
      return 'missing_eof';
    }

    return 'unknown_corruption';
  }

  /**
   * Extract basic text content (simplified version for quick operations)
   */
  async extractText(buffer: Buffer): Promise<string> {
    const result = await this.parsePDF(buffer);
    return result.fullText;
  }

  /**
   * Attempt to repair minor PDF corruption
   */
  private attemptPDFRepair(buffer: Buffer): Buffer {
    // For now, just return the original buffer
    // In a production system, you might implement:
    // - EOF marker fixing
    // - XRef table rebuilding
    // - Stream length corrections
    return buffer;
  }

  /**
   * Extract only metadata from PDF (lighter operation than full parsing)
   */
  async extractMetadata(buffer: Buffer, filename?: string): Promise<PDFMetadata> {
    try {
      logger.info('Extracting PDF metadata', { filename, size: buffer.length });

      // Pre-validation
      if (!this.validatePDFStructure(buffer)) {
        throw new Error('Invalid PDF structure');
      }

      const data = await pdfParse(buffer);

      const metadata = this.extractEnhancedMetadata(data, buffer);

      logger.info('PDF metadata extraction completed', {
        filename,
        title: metadata.title,
        author: metadata.author,
        pages: metadata.pages
      });

      return metadata;

    } catch (error) {
      const corruptionType = this.detectCorruptionType(buffer, error);
      const errorDetails = {
        filename,
        corruptionType,
        fileSize: buffer.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      logger.error('PDF metadata extraction failed', errorDetails);

      // Provide specific error messages based on corruption type
      let errorMessage = 'PDF metadata extraction failed';
      let statusCode = 400;

      switch (corruptionType) {
        case 'xref_corruption':
          errorMessage = 'PDF file has corrupted cross-reference table. The file may be damaged or incomplete.';
          break;
        case 'invalid_format':
          errorMessage = 'Invalid PDF format. The file may not be a valid PDF document.';
          break;
        case 'truncated_file':
          errorMessage = 'PDF file appears to be truncated or incomplete.';
          break;
        case 'encrypted_pdf':
          errorMessage = 'PDF file is encrypted or password-protected. Encrypted PDFs are not supported.';
          statusCode = 422; // Unprocessable Entity
          break;
        case 'too_small':
          errorMessage = 'PDF file is too small to be valid.';
          break;
        case 'missing_eof':
          errorMessage = 'PDF file is missing end-of-file marker.';
          break;
        default:
          errorMessage = `PDF metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      throw new AppError(errorMessage, statusCode);
    }
  }

  /**
   * Extract paragraphs from PDF with metadata
   */
  async extractParagraphs(buffer: Buffer, filename?: string): Promise<PDFParagraph[]> {
    const result = await this.parsePDF(buffer, filename);
    const allParagraphs: PDFParagraph[] = [];

    // Collect all paragraphs from all pages
    result.pages.forEach(page => {
      if (page.paragraphs) {
        allParagraphs.push(...page.paragraphs);
      }
    });

    return allParagraphs;
  }

  /**
   * Get paragraph statistics for a PDF
   */
  async getParagraphStats(buffer: Buffer): Promise<{
    totalParagraphs: number;
    avgParagraphLength: number;
    avgConfidence: number;
    paragraphsByPage: number[];
  }> {
    const paragraphs = await this.extractParagraphs(buffer);

    if (paragraphs.length === 0) {
      return {
        totalParagraphs: 0,
        avgParagraphLength: 0,
        avgConfidence: 0,
        paragraphsByPage: []
      };
    }

    const totalLength = paragraphs.reduce((sum, p) => sum + p.content.length, 0);
    const totalConfidence = paragraphs.reduce((sum, p) => sum + p.confidence, 0);

    // Count paragraphs per page
    const maxPage = Math.max(...paragraphs.map(p => p.pageNumber));
    const paragraphsByPage = Array(maxPage).fill(0);
    paragraphs.forEach(p => {
      paragraphsByPage[p.pageNumber - 1]++;
    });

    return {
      totalParagraphs: paragraphs.length,
      avgParagraphLength: Math.round(totalLength / paragraphs.length),
      avgConfidence: totalConfidence / paragraphs.length,
      paragraphsByPage
    };
  }
}

// Export singleton instance
export const pdfParserService = new PDFParserService();
