// Mock data for testing
export const mockUsers = {
  admin: {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  regular: {
    id: 'user-2',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
};

export const mockDocuments = {
  pdf1: {
    id: 'doc-1',
    filename: 'sample-document.pdf',
    originalName: 'Sample Document.pdf',
    mimeType: 'application/pdf',
    size: 1024000, // 1MB
    path: '/uploads/sample-document.pdf',
    userId: 'user-2',
    status: 'processed',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  pdf2: {
    id: 'doc-2',
    filename: 'large-report.pdf',
    originalName: 'Large Report.pdf',
    mimeType: 'application/pdf',
    size: 5242880, // 5MB
    path: '/uploads/large-report.pdf',
    userId: 'user-2',
    status: 'processing',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  }
};

export const mockSummaries = {
  summary1: {
    id: 'summary-1',
    documentId: 'doc-1',
    content: 'This is a comprehensive summary of the sample document...',
    model: 'gemini-1.5-flash',
    tokensUsed: 150,
    cost: 0.00015,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    metadata: {
      sections: 5,
      paragraphs: 25,
      keyPoints: 8
    }
  },
  summary2: {
    id: 'summary-2',
    documentId: 'doc-2',
    content: 'This large report contains detailed analysis...',
    model: 'gemini-1.5-pro',
    tokensUsed: 300,
    cost: 0.0015,
    createdAt: new Date('2024-01-16T14:30:00Z'),
    metadata: {
      sections: 12,
      paragraphs: 67,
      keyPoints: 15
    }
  }
};

export const mockLLMResponses = {
  openai: {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4o',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a mock response from OpenAI GPT-4o.'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    }
  },
  google: {
    candidates: [{
      content: {
        parts: [{
          text: 'This is a mock response from Google Gemini.'
        }]
      },
      finishReason: 'STOP',
      index: 0
    }],
    usageMetadata: {
      promptTokenCount: 80,
      candidatesTokenCount: 40,
      totalTokenCount: 120
    },
    model: 'gemini-1.5-flash'
  }
};

export const mockFileBuffers = {
  smallPDF: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000200 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF', 'ascii'),

  largePDF: Buffer.alloc(1024 * 1024, 'x') // 1MB of 'x' characters
};

export const mockMulterFiles = {
  validPDF: {
    fieldname: 'pdf',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: mockFileBuffers.smallPDF,
    size: mockFileBuffers.smallPDF.length,
    destination: './tests/fixtures/uploads',
    filename: 'test-document-1234567890.pdf',
    path: './tests/fixtures/uploads/test-document-1234567890.pdf',
    stream: null as any
  },
  invalidFile: {
    fieldname: 'pdf',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake image data'),
    size: 1000,
    destination: './tests/fixtures/uploads',
    filename: 'test-image-1234567890.jpg',
    path: './tests/fixtures/uploads/test-image-1234567890.jpg',
    stream: null as any
  },
  oversizedFile: {
    fieldname: 'pdf',
    originalname: 'large-file.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: mockFileBuffers.largePDF,
    size: 10 * 1024 * 1024, // 10MB
    destination: './tests/fixtures/uploads',
    filename: 'large-file-1234567890.pdf',
    path: './tests/fixtures/uploads/large-file-1234567890.pdf',
    stream: null as any
  }
};
