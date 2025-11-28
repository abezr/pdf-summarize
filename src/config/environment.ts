import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  },
};

// Validate required env vars
export function validateConfig(): void {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGoogle = Boolean(process.env.GOOGLE_API_KEY);

  if (!hasOpenAI && !hasGoogle) {
    missing.push('OPENAI_API_KEY or GOOGLE_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
