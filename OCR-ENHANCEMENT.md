# OCR Enhancement for PDF Summary AI

**Issue**: Current architecture uses `pdf-parse` which only works with PDFs that have a text layer. It **cannot** process scanned PDFs (images) without OCR.

**Solution**: Add OCR capability to handle both text-based and image-based (scanned) PDFs.

---

## Current Limitation

### What Works ✅
- PDFs with embedded text layer (born-digital PDFs)
- PDFs created from Word, Google Docs, LaTeX
- PDFs with selectable text

### What Doesn't Work ❌
- Scanned documents (paper → scanner → PDF)
- Image-only PDFs
- Screenshots saved as PDFs
- Faxes converted to PDF
- Any PDF without a text layer

---

## Solution: Add OCR Pipeline

### Architecture Enhancement

```
┌─────────────────────────────────────────────────────────────┐
│                   Enhanced PDF Parser                        │
│                                                               │
│  Input: PDF File                                             │
│       ↓                                                       │
│  ┌────────────────────────────────────────────┐             │
│  │ Step 1: Detect PDF Type                     │             │
│  │ • Check if text layer exists                │             │
│  │ • Use pdf-parse to extract text              │             │
│  │ • If text.length > threshold → Text-based   │             │
│  │ • Else → Image-based (needs OCR)            │             │
│  └────────┬───────────────────────┬─────────────┘             │
│           │                       │                           │
│      Text-based              Image-based                      │
│           │                       │                           │
│           v                       v                           │
│  ┌─────────────────┐    ┌──────────────────────┐            │
│  │  Use pdf-parse  │    │  OCR Pipeline        │            │
│  │  (Current)      │    │  (NEW)               │            │
│  └─────────────────┘    └──────────────────────┘            │
│           │                       │                           │
│           │                       v                           │
│           │              ┌──────────────────────┐            │
│           │              │ Step 2: Extract Pages│            │
│           │              │ • Convert PDF to PNG │            │
│           │              │ • Use pdf2image/     │            │
│           │              │   pdfjs-dist         │            │
│           │              └──────────────────────┘            │
│           │                       │                           │
│           │                       v                           │
│           │              ┌──────────────────────┐            │
│           │              │ Step 3: Run OCR      │            │
│           │              │ • Tesseract.js       │            │
│           │              │ • Google Vision API  │            │
│           │              │ • AWS Textract       │            │
│           │              └──────────────────────┘            │
│           │                       │                           │
│           └───────────────────────┘                           │
│                         │                                     │
│                         v                                     │
│           ┌──────────────────────────┐                       │
│           │ Extracted Text + Metadata │                       │
│           │ • Page-by-page text       │                       │
│           │ • Bounding boxes          │                       │
│           │ • Confidence scores       │                       │
│           └──────────────────────────┘                       │
│                         │                                     │
│                         v                                     │
│           ┌──────────────────────────┐                       │
│           │  Graph Builder           │                       │
│           │  (Existing Pipeline)     │                       │
│           └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Options

### Option 1: Tesseract.js (Open Source, Free)

**Pros:**
- ✅ Free and open-source
- ✅ Runs locally (no API costs)
- ✅ Supports 100+ languages
- ✅ Good accuracy for clean scans
- ✅ Can run in Node.js

**Cons:**
- ❌ Slower than cloud services (30s-2min per page)
- ❌ Lower accuracy on poor quality scans
- ❌ CPU intensive

**Best For:** Cost-sensitive projects, privacy-critical documents

### Option 2: Google Cloud Vision API

**Pros:**
- ✅ Excellent accuracy (95%+ on good scans)
- ✅ Fast (1-3s per page)
- ✅ Handles complex layouts (tables, columns)
- ✅ Confidence scores per word
- ✅ Bounding box coordinates

**Cons:**
- ❌ Costs money ($1.50 per 1000 pages)
- ❌ Requires internet connection
- ❌ Data leaves your infrastructure

**Best For:** Production systems, high-quality requirements

### Option 3: AWS Textract

**Pros:**
- ✅ Excellent table extraction
- ✅ Form detection
- ✅ Fast and scalable
- ✅ Built-in table structure detection

**Cons:**
- ❌ More expensive ($1.50-$10 per 1000 pages)
- ❌ AWS-specific

**Best For:** AWS-native deployments, table-heavy documents

### Option 4: Azure Computer Vision

**Pros:**
- ✅ Good accuracy
- ✅ Read API for documents
- ✅ Layout analysis

**Cons:**
- ❌ Azure-specific
- ❌ Cost similar to Google

**Best For:** Azure-native deployments

---

## Recommended Implementation

### **Hybrid Approach: Tesseract.js + Google Cloud Vision (Optional)**

#### Phase 1: Add Tesseract.js (Default, Free)
```typescript
// package.json additions
{
  "dependencies": {
    "tesseract.js": "^5.0.4",
    "pdf-poppler": "^0.2.1", // PDF to image conversion
    "sharp": "^0.33.0" // Image preprocessing
  }
}
```

#### Phase 2: Optional Google Cloud Vision (Premium)
```typescript
// package.json additions
{
  "dependencies": {
    "@google-cloud/vision": "^4.0.2"
  }
}
```

---

## Code Implementation

### 1. Enhanced PDF Parser with OCR Detection

#### `src/services/pdf/EnhancedPDFParser.ts`

```typescript
import * as pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
}

export interface BoundingBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface ParsedPDFWithOCR extends ParsedPDF {
  isScanned: boolean;
  ocrUsed: boolean;
  averageConfidence?: number;
}

class EnhancedPDFParser {
  private tesseractWorker?: Tesseract.Worker;
  private TEXT_THRESHOLD = 100; // Min characters to consider text-based

  public async initialize(): Promise<void> {
    // Initialize Tesseract worker (reusable across requests)
    this.tesseractWorker = await createWorker('eng', 1, {
      logger: (m) => logger.debug('Tesseract:', m),
    });
    logger.info('Tesseract OCR worker initialized');
  }

  public async parse(filePath: string): Promise<ParsedPDFWithOCR> {
    const startTime = Date.now();

    try {
      logger.info('Starting enhanced PDF parsing', { filePath });

      // Step 1: Try text extraction first
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      // Step 2: Detect if PDF has text or is scanned
      const hasText = pdfData.text.length > this.TEXT_THRESHOLD;
      const isScanned = !hasText;

      let result: ParsedPDFWithOCR;

      if (hasText) {
        // Text-based PDF - use existing logic
        logger.info('PDF has text layer, using standard extraction', {
          textLength: pdfData.text.length,
        });

        result = {
          text: pdfData.text,
          pages: await this.extractPages(dataBuffer, pdfData.numpages),
          pageCount: pdfData.numpages,
          metadata: this.extractMetadata(pdfData),
          isScanned: false,
          ocrUsed: false,
        };
      } else {
        // Scanned PDF - use OCR
        logger.info('PDF is scanned, using OCR extraction', {
          pageCount: pdfData.numpages,
        });

        result = await this.parseWithOCR(filePath, pdfData.numpages);
      }

      const duration = Date.now() - startTime;
      logger.info('Enhanced PDF parsing completed', {
        filePath,
        pageCount: result.pageCount,
        textLength: result.text.length,
        isScanned: result.isScanned,
        ocrUsed: result.ocrUsed,
        duration,
      });

      return result;
    } catch (error) {
      logger.error('Enhanced PDF parsing failed', { filePath, error });
      throw new AppError('Failed to parse PDF', 500, { originalError: error });
    }
  }

  private async parseWithOCR(
    filePath: string,
    pageCount: number
  ): Promise<ParsedPDFWithOCR> {
    const pages: ParsedPage[] = [];
    let fullText = '';
    let totalConfidence = 0;

    // Convert PDF to images (one per page)
    const images = await this.convertPDFToImages(filePath, pageCount);

    // OCR each page
    for (let i = 0; i < images.length; i++) {
      const pageNumber = i + 1;
      logger.info(`Running OCR on page ${pageNumber}/${pageCount}`);

      const ocrResult = await this.runOCR(images[i]);

      pages.push({
        pageNumber,
        text: ocrResult.text,
        metadata: {
          confidence: ocrResult.confidence,
          boundingBoxes: ocrResult.boundingBoxes,
        },
      });

      fullText += ocrResult.text + '\n\n';
      totalConfidence += ocrResult.confidence;

      // Clean up image
      await fs.unlink(images[i]).catch(() => {});
    }

    const averageConfidence = totalConfidence / pageCount;

    return {
      text: fullText,
      pages,
      pageCount,
      metadata: {},
      isScanned: true,
      ocrUsed: true,
      averageConfidence,
    };
  }

  private async convertPDFToImages(
    filePath: string,
    pageCount: number
  ): Promise<string[]> {
    // Use pdf-lib to extract pages as images
    const dataBuffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(dataBuffer);

    const imagePaths: string[] = [];

    for (let i = 0; i < pageCount; i++) {
      const pageImage = await this.renderPageToImage(pdfDoc, i);
      const imagePath = `/tmp/pdf-page-${Date.now()}-${i}.png`;
      await fs.writeFile(imagePath, pageImage);
      imagePaths.push(imagePath);
    }

    return imagePaths;
  }

  private async renderPageToImage(
    pdfDoc: PDFDocument,
    pageIndex: number
  ): Promise<Buffer> {
    // This is a simplified placeholder
    // In reality, you'd use pdfjs-dist or pdf2image
    // For now, return empty buffer
    // TODO: Implement with pdfjs-dist canvas rendering
    throw new Error('renderPageToImage not implemented - use pdfjs-dist');
  }

  private async runOCR(imagePath: string): Promise<OCRResult> {
    if (!this.tesseractWorker) {
      throw new AppError('Tesseract worker not initialized', 500);
    }

    const {
      data: { text, confidence, words },
    } = await this.tesseractWorker.recognize(imagePath);

    const boundingBoxes: BoundingBox[] = words.map((word) => ({
      text: word.text,
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
      confidence: word.confidence / 100, // Normalize to 0-1
    }));

    return {
      text,
      confidence: confidence / 100, // Normalize to 0-1
      boundingBoxes,
    };
  }

  private async extractPages(
    dataBuffer: Buffer,
    pageCount: number
  ): Promise<ParsedPage[]> {
    // Existing implementation from PDFParser
    const pages: ParsedPage[] = [];
    const pdfDoc = await pdfParse(dataBuffer);
    const fullText = pdfDoc.text;
    const pageTexts = fullText.split('\f');

    for (let i = 0; i < pageCount; i++) {
      pages.push({
        pageNumber: i + 1,
        text: pageTexts[i] || '',
        metadata: {},
      });
    }

    return pages;
  }

  private extractMetadata(pdfData: any): Record<string, any> {
    return {
      title: pdfData.info?.Title,
      author: pdfData.info?.Author,
      subject: pdfData.info?.Subject,
      keywords: pdfData.info?.Keywords,
      creator: pdfData.info?.Creator,
      producer: pdfData.info?.Producer,
      creationDate: pdfData.info?.CreationDate,
      modificationDate: pdfData.info?.ModDate,
    };
  }

  public async close(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      logger.info('Tesseract OCR worker terminated');
    }
  }
}

export const enhancedPDFParser = new EnhancedPDFParser();
```

---

### 2. Google Cloud Vision Integration (Optional Premium)

#### `src/services/pdf/GoogleVisionOCR.ts`

```typescript
import vision from '@google-cloud/vision';
import { logger } from '@utils/logger';
import { OCRResult, BoundingBox } from './EnhancedPDFParser';

class GoogleVisionOCR {
  private client: vision.ImageAnnotatorClient;

  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  public async runOCR(imagePath: string): Promise<OCRResult> {
    try {
      const [result] = await this.client.textDetection(imagePath);
      const detections = result.textAnnotations || [];

      if (detections.length === 0) {
        return {
          text: '',
          confidence: 0,
          boundingBoxes: [],
        };
      }

      // First detection is full text
      const fullText = detections[0].description || '';

      // Rest are word-level detections
      const boundingBoxes: BoundingBox[] = detections.slice(1).map((detection) => {
        const vertices = detection.boundingPoly?.vertices || [];
        return {
          text: detection.description || '',
          x: vertices[0]?.x || 0,
          y: vertices[0]?.y || 0,
          width: (vertices[1]?.x || 0) - (vertices[0]?.x || 0),
          height: (vertices[2]?.y || 0) - (vertices[0]?.y || 0),
          confidence: 0.95, // Google Vision doesn't provide per-word confidence
        };
      });

      logger.info('Google Vision OCR completed', {
        textLength: fullText.length,
        wordCount: boundingBoxes.length,
      });

      return {
        text: fullText,
        confidence: 0.95, // Google Vision has high accuracy
        boundingBoxes,
      };
    } catch (error) {
      logger.error('Google Vision OCR failed', { error });
      throw error;
    }
  }
}

export const googleVisionOCR = new GoogleVisionOCR();
```

---

### 3. Configuration

#### `.env` additions

```env
# OCR Configuration
OCR_ENABLED=true
OCR_PROVIDER=tesseract  # Options: tesseract, google-vision, aws-textract
TESSERACT_LANGUAGE=eng  # Language code (eng, spa, fra, deu, etc.)

# Google Cloud Vision (Optional)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_VISION_ENABLED=false

# AWS Textract (Optional)
AWS_TEXTRACT_ENABLED=false
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

---

## Implementation Tasks

### New Tasks to Add to Roadmap

#### **Phase 2.5: OCR Integration (6 tasks, 3-4 days)**

**T2.11: PDF Type Detection**
- Detect if PDF has text layer
- Implement text length threshold check
- Add metadata flag `isScanned`

**T2.12: PDF to Image Conversion**
- Install pdf2image or pdfjs-dist
- Convert PDF pages to PNG
- Handle multi-page conversion

**T2.13: Tesseract.js Integration**
- Install tesseract.js
- Create worker pool for performance
- Implement OCR per page

**T2.14: OCR Result Processing**
- Extract text with confidence scores
- Store bounding boxes for grounding
- Handle low-confidence results

**T2.15: Google Cloud Vision Integration (Optional)**
- Add @google-cloud/vision
- Implement Google Vision OCR
- Add fallback to Tesseract

**T2.16: OCR Quality Validation**
- Calculate average confidence score
- Reject PDFs with confidence < 60%
- Add quality badge to summaries

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   PDF Processing Pipeline                    │
│                                                               │
│  User Upload → File Validation → PDF Type Detection          │
│                                         ↓                     │
│                          ┌──────────────┴────────────┐       │
│                          │                           │       │
│                    Text-Based PDF            Scanned PDF     │
│                          │                           │       │
│                          v                           v       │
│                  ┌─────────────┐         ┌────────────────┐ │
│                  │  pdf-parse  │         │  OCR Pipeline  │ │
│                  │  (Fast)     │         │  (Slower)      │ │
│                  └─────────────┘         └────────────────┘ │
│                          │                           │       │
│                          │     ┌────────────┐       │       │
│                          │     │ Tesseract  │←──────┘       │
│                          │     │ (Default)  │               │
│                          │     └────────────┘               │
│                          │           ↓                       │
│                          │     ┌────────────┐               │
│                          │     │   Google   │               │
│                          │     │   Vision   │               │
│                          │     │ (Optional) │               │
│                          │     └────────────┘               │
│                          └──────────┬─────────────          │
│                                     │                        │
│                                     v                        │
│                          ┌──────────────────┐               │
│                          │  Extracted Text  │               │
│                          │  + Confidence    │               │
│                          └──────────────────┘               │
│                                     │                        │
│                                     v                        │
│                          ┌──────────────────┐               │
│                          │  Graph Builder   │               │
│                          │  (Existing)      │               │
│                          └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Processing Time Estimates

| PDF Type | Method | Speed | Accuracy |
|----------|--------|-------|----------|
| Text-based (10 pages) | pdf-parse | 1-2s | 100% |
| Scanned (10 pages) | Tesseract | 30-60s | 85-90% |
| Scanned (10 pages) | Google Vision | 5-10s | 95-98% |
| Scanned (10 pages) | AWS Textract | 5-10s | 95-98% |

### Cost Analysis (per 100 pages)

| Method | Cost | Pros | Cons |
|--------|------|------|------|
| Tesseract | $0 | Free, local | Slow, CPU intensive |
| Google Vision | $0.15 | Fast, accurate | Costs money |
| AWS Textract | $0.15-$1.00 | Best for tables | Expensive |

---

## Recommendation for Implementation

### **Phase 1 (Core, 2-3h)**: Text-based PDFs only
- Use existing `pdf-parse`
- Cover 80% of use cases
- Fast and reliable

### **Phase 2 (Enhanced, +1 day)**: Add Tesseract OCR
- Detect scanned PDFs
- Fall back to OCR automatically
- Cover 95% of use cases
- Free and open-source

### **Phase 3 (Premium, +2 hours)**: Add Google Vision
- Optional premium feature
- For high-quality requirements
- User can choose OCR provider

---

## Updated Database Schema

Add OCR metadata to documents table:

```sql
ALTER TABLE documents
ADD COLUMN is_scanned BOOLEAN DEFAULT FALSE,
ADD COLUMN ocr_provider VARCHAR(50),
ADD COLUMN ocr_confidence DECIMAL(5,4),
ADD COLUMN processing_method VARCHAR(50) DEFAULT 'text_extraction';
```

---

## API Response with OCR Metadata

```json
{
  "documentId": "uuid",
  "summary": "...",
  "metadata": {
    "isScanned": true,
    "ocrUsed": true,
    "ocrProvider": "tesseract",
    "averageConfidence": 0.87,
    "qualityBadge": "Good OCR Quality (87%)",
    "processingMethod": "ocr"
  }
}
```

---

## Summary

### Current Status: ❌ **No OCR Support**
- Can only process text-based PDFs
- Fails on scanned documents

### After Enhancement: ✅ **Full OCR Support**
- Automatically detects PDF type
- Falls back to OCR for scanned PDFs
- Supports multiple OCR providers
- Includes confidence scores
- Production-ready with quality metrics

### Implementation Priority: **HIGH**
This should be **Phase 2.5** (after core PDF parsing, before advanced features).

---

**Would you like me to:**
1. **Add OCR tasks to TASK-SPECIFICATIONS.md**?
2. **Update IMPLEMENTATION-ROADMAP.md** with OCR phase?
3. **Create complete OCR code examples**?
4. **Update GROK-IMPLEMENTATION-PROMPT.md** to include OCR?

Let me know and I'll update all documentation immediately! 🚀
