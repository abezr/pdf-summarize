import { promises as fs } from 'fs';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface TableCell {
  text: string;
  row: number;
  col: number;
  confidence?: number;
}

export interface TableData {
  headers?: string[];
  rows: string[][]; // 2D array of cell text values
  rawText: string;
}

export interface ExtractedTable {
  id: string;
  pageNumber: number;
  tableNumber: number; // Index of table on the page
  data: TableData;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number; // Overall extraction confidence (0-1)
  method: 'tabula' | 'pdf-table-extractor' | 'fallback';
}

export interface TableDetectionOptions {
  pages?: number | number[]; // Specific pages to scan (default: all)
  area?: {
    // Specific area to scan (x1,y1,x2,y2)
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  lattice?: boolean; // Use lattice mode for bordered tables
  stream?: boolean; // Use stream mode for borderless tables
}

export class TableDetectionService {
  private tabula: any = null;
  private pdfTableExtractor: any = null;

  constructor() {
    this.initializeLibraries();
  }

  private async initializeLibraries() {
    try {
      // Primary library: @krakz999/tabula-node
      this.tabula = require('@krakz999/tabula-node');
      logger.info('TableDetectionService: Initialized @krakz999/tabula-node');
    } catch (error) {
      logger.warn(
        'TableDetectionService: Failed to load @krakz999/tabula-node:',
        error
      );
    }

    try {
      // Fallback library: pdf-table-extractor
      this.pdfTableExtractor = require('pdf-table-extractor');
      logger.info('TableDetectionService: Initialized pdf-table-extractor');
    } catch (error) {
      logger.warn(
        'TableDetectionService: Failed to load pdf-table-extractor:',
        error
      );
    }

    if (!this.tabula && !this.pdfTableExtractor) {
      logger.error(
        'TableDetectionService: No table detection libraries available'
      );
      throw new AppError(
        'No table detection libraries available',
        500,
        'TABLE_DETECTION_UNAVAILABLE'
      );
    }
  }

  /**
   * Extract tables from a PDF file
   */
  async extractTables(
    pdfPath: string,
    options: TableDetectionOptions = {}
  ): Promise<ExtractedTable[]> {
    const startTime = Date.now();

    try {
      // Validate PDF file exists
      await fs.access(pdfPath);

      const tables: ExtractedTable[] = [];

      // Try primary method first (tabula)
      if (this.tabula) {
        try {
          const tabulaTables = await this.extractWithTabula(pdfPath, options);
          tables.push(...tabulaTables);
          logger.info(
            `TableDetectionService: Extracted ${tabulaTables.length} tables with tabula`
          );
        } catch (error) {
          logger.warn(
            'TableDetectionService: Tabula extraction failed, trying fallback:',
            error
          );
        }
      }

      // If no tables found or tabula failed, try fallback
      if (tables.length === 0 && this.pdfTableExtractor) {
        try {
          const fallbackTables = await this.extractWithPdfTableExtractor(
            pdfPath,
            options
          );
          tables.push(...fallbackTables);
          logger.info(
            `TableDetectionService: Extracted ${fallbackTables.length} tables with pdf-table-extractor`
          );
        } catch (error) {
          logger.warn(
            'TableDetectionService: Fallback extraction failed:',
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `TableDetectionService: Extracted ${tables.length} tables in ${duration}ms`
      );

      return tables;
    } catch (error) {
      logger.error('TableDetectionService: Table extraction failed:', error);
      throw new AppError(
        `Table extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'TABLE_EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Extract tables using @krakz999/tabula-node (primary method)
   */
  private async extractWithTabula(
    pdfPath: string,
    options: TableDetectionOptions
  ): Promise<ExtractedTable[]> {
    const { extractTables } = this.tabula;

    const tabulaOptions: any = {
      pages: options.pages
        ? Array.isArray(options.pages)
          ? options.pages.join(',')
          : options.pages.toString()
        : 'all',
      format: 'JSON', // Get structured data for easier parsing
      guess: true, // Auto-detect table areas
    };

    if (options.lattice !== undefined) {
      tabulaOptions.lattice = options.lattice;
    }

    if (options.stream !== undefined) {
      tabulaOptions.stream = options.stream;
    }

    if (options.area) {
      // Convert area format: x1,y1,x2,y2
      tabulaOptions.area = `${options.area.y1},${options.area.x1},${options.area.y2},${options.area.x2}`;
    }

    // Extract tables
    const result = await extractTables(pdfPath, tabulaOptions);

    // Parse JSON result
    const rawTables = JSON.parse(result);

    // Convert to our ExtractedTable format
    const tables: ExtractedTable[] = [];

    if (Array.isArray(rawTables)) {
      rawTables.forEach((rawTable: any, index: number) => {
        const extractedTable = this.parseTabulaTable(rawTable, index);
        if (extractedTable) {
          tables.push(extractedTable);
        }
      });
    }

    return tables;
  }

  /**
   * Parse tabula JSON output into ExtractedTable format
   */
  private parseTabulaTable(
    rawTable: any,
    tableIndex: number
  ): ExtractedTable | null {
    try {
      // Tabula JSON structure varies, but typically contains:
      // - page: page number
      // - data: array of arrays (rows)
      // - extraction_method: "lattice" or "stream"

      if (!rawTable.data || !Array.isArray(rawTable.data)) {
        return null;
      }

      const pageNumber = rawTable.page || 1;
      const data = rawTable.data;

      // Convert tabula data format to our TableData format
      const rows: TableCell[][] = data.map((row: any[], rowIndex: number) => {
        return row.map((cell: any, colIndex: number) => ({
          text: String(cell || '').trim(),
          row: rowIndex,
          col: colIndex,
          confidence: 0.9, // Tabula doesn't provide confidence, assume high
        }));
      });

      // Extract headers (first row if it looks like headers)
      let headers: string[] | undefined;
      if (rows.length > 1 && this.isHeaderRow(rows[0])) {
        headers = rows[0].map((cell) => cell.text);
        rows.shift(); // Remove header row from data
      }

      const tableData: TableData = {
        headers,
        rows: rows.map((row) => row.map((cell) => cell.text)), // Convert back to string[][] for TableData
        rawText: this.tableToText(rows, headers),
      };

      return {
        id: `table_${pageNumber}_${tableIndex}`,
        pageNumber,
        tableNumber: tableIndex,
        data: tableData,
        confidence: 0.85, // Good confidence for tabula
        method: 'tabula',
        bbox: rawTable.bbox, // If available
      };
    } catch (error) {
      logger.warn(
        'TableDetectionService: Failed to parse tabula table:',
        error
      );
      return null;
    }
  }

  /**
   * Check if a row looks like headers (contains mostly non-numeric text)
   */
  private isHeaderRow(row: TableCell[]): boolean {
    if (row.length === 0) return false;

    const textCells = row.filter(
      (cell) =>
        cell.text && cell.text.trim().length > 0 && isNaN(Number(cell.text)) // Not a number
    );

    // If more than 70% of cells are non-numeric text, consider it a header
    return textCells.length / row.length > 0.7;
  }

  /**
   * Convert table rows back to readable text
   */
  private tableToText(rows: TableCell[][], headers?: string[]): string {
    let text = '';

    if (headers) {
      text += headers.join(' | ') + '\n';
      text += '-'.repeat(headers.join(' | ').length) + '\n';
    }

    rows.forEach((row) => {
      text += row.map((cell) => cell.text).join(' | ') + '\n';
    });

    return text.trim();
  }

  /**
   * Extract tables using pdf-table-extractor (fallback method)
   */
  private async extractWithPdfTableExtractor(
    pdfPath: string,
    options: TableDetectionOptions
  ): Promise<ExtractedTable[]> {
    const tables: ExtractedTable[] = [];

    // pdf-table-extractor uses callbacks, wrap in Promise
    const result = await new Promise<any>((resolve, reject) => {
      this.pdfTableExtractor(
        pdfPath,
        (result: any) => resolve(result),
        (error: any) => reject(error)
      );
    });

    // Parse the result
    if (result && result.pageTables) {
      result.pageTables.forEach((pageData: any) => {
        const pageNumber = pageData.page;

        // Check if we should process this page
        if (options.pages) {
          const targetPages = Array.isArray(options.pages)
            ? options.pages
            : [options.pages];
          if (!targetPages.includes(pageNumber)) {
            return; // Skip this page
          }
        }

        if (pageData.tables && Array.isArray(pageData.tables)) {
          pageData.tables.forEach(
            (tableData: string[][], tableIndex: number) => {
              const extractedTable = this.parsePdfTableExtractorTable(
                tableData,
                pageNumber,
                tableIndex
              );
              if (extractedTable) {
                tables.push(extractedTable);
              }
            }
          );
        }
      });
    }

    return tables;
  }

  /**
   * Parse pdf-table-extractor output into ExtractedTable format
   */
  private parsePdfTableExtractorTable(
    tableData: string[][],
    pageNumber: number,
    tableIndex: number
  ): ExtractedTable | null {
    try {
      if (!Array.isArray(tableData) || tableData.length === 0) {
        return null;
      }

      // Convert to our TableCell format
      const rows: TableCell[][] = tableData.map(
        (row: string[], rowIndex: number) => {
          return row.map((cell: string, colIndex: number) => ({
            text: String(cell || '').trim(),
            row: rowIndex,
            col: colIndex,
            confidence: 0.7, // Lower confidence for fallback method
          }));
        }
      );

      // Extract headers (first row if it looks like headers)
      let headers: string[] | undefined;
      if (rows.length > 1 && this.isHeaderRow(rows[0])) {
        headers = rows[0].map((cell) => cell.text);
        rows.shift(); // Remove header row from data
      }

      const processedTableData: TableData = {
        headers,
        rows: rows.map((row) => row.map((cell) => cell.text)), // Convert back to string[][]
        rawText: this.tableToText(rows, headers),
      };

      return {
        id: `table_${pageNumber}_${tableIndex}`,
        pageNumber,
        tableNumber: tableIndex,
        data: processedTableData,
        confidence: 0.6, // Lower confidence for fallback method
        method: 'pdf-table-extractor',
      };
    } catch (error) {
      logger.warn(
        'TableDetectionService: Failed to parse pdf-table-extractor table:',
        error
      );
      return null;
    }
  }

  /**
   * Validate that a file path is accessible and appears to be a PDF
   */
  private async validatePdfFile(pdfPath: string): Promise<void> {
    const stats = await fs.stat(pdfPath);

    if (!stats.isFile()) {
      throw new AppError('Path is not a file', 400, 'INVALID_FILE_PATH');
    }

    if (!pdfPath.toLowerCase().endsWith('.pdf')) {
      throw new AppError(
        'File does not have .pdf extension',
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Could add more validation here (file size, PDF header check, etc.)
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      tabulaAvailable: !!this.tabula,
      pdfTableExtractorAvailable: !!this.pdfTableExtractor,
      overallHealthy: !!(this.tabula || this.pdfTableExtractor),
    };
  }
}

// Export singleton instance
export const tableDetectionService = new TableDetectionService();
