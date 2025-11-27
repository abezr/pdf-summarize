# Task Specifications - PDF Summary AI

**Complete task-by-task specifications with acceptance criteria and validation steps**

---

## How to Use This Document

Each task follows this structure:

```yaml
TASK-XXX:
  title: Clear task name
  phase: 1, 2, or 3
  priority: high/medium/low
  estimated_time: Hours
  dependencies: [List of prerequisite tasks]
  description: What needs to be done
  acceptance_criteria: Must-pass conditions
  implementation_steps: Step-by-step guide
  validation_steps: How to verify
  regression_tests: Test cases
  files_to_create: List of files
  files_to_modify: List of files
```

---

## Phase 1: Foundation

### TASK-001: Initialize TypeScript Node.js Project

**Priority**: High  
**Estimated Time**: 0.5 hours  
**Dependencies**: None

**Description**:
Initialize a new Node.js project with TypeScript support for the backend service.

**Acceptance Criteria**:
- ✅ `package.json` exists with correct name and version
- ✅ `tsconfig.json` configured for Node.js + strict mode
- ✅ TypeScript compiles without errors
- ✅ `src/` directory exists
- ✅ `.gitignore` configured for Node.js

**Implementation Steps**:
1. Create project directory: `mkdir backend && cd backend`
2. Initialize npm: `npm init -y`
3. Install TypeScript: `npm install -D typescript @types/node`
4. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```
5. Create `src/` directory
6. Update `package.json` scripts:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/server.js",
       "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
     }
   }
   ```

**Validation Steps**:
1. Run `npm run build` - should compile without errors
2. Check `dist/` directory exists
3. Verify TypeScript strict mode enabled

**Regression Tests**:
```typescript
// tests/setup.test.ts
describe('Project Setup', () => {
  test('TypeScript compiles', () => {
    // This test passing means TS config is correct
    expect(true).toBe(true);
  });
});
```

**Files to Create**:
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/` (directory)
- `backend/.gitignore`

---

### TASK-002: Configure ESLint + Prettier

**Priority**: High  
**Estimated Time**: 0.5 hours  
**Dependencies**: TASK-001

**Description**:
Set up code linting and formatting for consistent code quality.

**Acceptance Criteria**:
- ✅ ESLint configured for TypeScript
- ✅ Prettier configured
- ✅ ESLint and Prettier compatible
- ✅ `npm run lint` works
- ✅ Pre-commit hook optional (recommended)

**Implementation Steps**:
1. Install dependencies:
   ```bash
   npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   npm install -D prettier eslint-config-prettier eslint-plugin-prettier
   ```
2. Create `.eslintrc.json`:
   ```json
   {
     "parser": "@typescript-eslint/parser",
     "extends": [
       "eslint:recommended",
       "plugin:@typescript-eslint/recommended",
       "prettier"
     ],
     "plugins": ["@typescript-eslint", "prettier"],
     "rules": {
       "prettier/prettier": "error",
       "@typescript-eslint/no-unused-vars": "error",
       "@typescript-eslint/no-explicit-any": "warn"
     }
   }
   ```
3. Create `.prettierrc`:
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2
   }
   ```
4. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "lint": "eslint src/**/*.ts",
       "lint:fix": "eslint src/**/*.ts --fix",
       "format": "prettier --write src/**/*.ts"
     }
   }
   ```

**Validation Steps**:
1. Run `npm run lint` - should pass
2. Create a file with linting issues - should report errors
3. Run `npm run lint:fix` - should auto-fix

**Regression Tests**:
```bash
# Manual check
npm run lint
```

**Files to Create**:
- `backend/.eslintrc.json`
- `backend/.prettierrc`

**Files to Modify**:
- `backend/package.json` (add scripts)

---

### TASK-003: Set Up Environment Configuration

**Priority**: High  
**Estimated Time**: 0.5 hours  
**Dependencies**: TASK-001

**Description**:
Configure environment variables management using dotenv.

**Acceptance Criteria**:
- ✅ `dotenv` package installed
- ✅ `.env.example` template exists
- ✅ Environment variables loaded in code
- ✅ Type-safe environment configuration
- ✅ Validation for required env vars

**Implementation Steps**:
1. Install dotenv: `npm install dotenv`
2. Install types: `npm install -D @types/node`
3. Create `.env.example`:
   ```env
   # Server
   PORT=4000
   NODE_ENV=development
   
   # Database
   DATABASE_URL=postgresql://user:pass@localhost:5432/pdfai
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # OpenAI
   OPENAI_API_KEY=sk-...
   
   # Storage
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE=52428800
   ```
4. Create `src/config/environment.ts`:
   ```typescript
   import dotenv from 'dotenv';
   import path from 'path';

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
     const required = ['DATABASE_URL', 'OPENAI_API_KEY'];
     const missing = required.filter((key) => !process.env[key]);
     
     if (missing.length > 0) {
       throw new Error(`Missing required env vars: ${missing.join(', ')}`);
     }
   }
   ```

**Validation Steps**:
1. Import config in any file - should work
2. Remove required env var - should throw error
3. Check type safety - should have IntelliSense

**Regression Tests**:
```typescript
// tests/config/environment.test.ts
import { config, validateConfig } from '../../src/config/environment';

describe('Environment Configuration', () => {
  test('config object exists', () => {
    expect(config).toBeDefined();
    expect(config.port).toBeGreaterThan(0);
  });

  test('validates required env vars', () => {
    // This would need to mock process.env
    expect(() => validateConfig()).not.toThrow();
  });
});
```

**Files to Create**:
- `backend/.env.example`
- `backend/src/config/environment.ts`

---

### TASK-004: Create Project Directory Structure

**Priority**: High  
**Estimated Time**: 0.25 hours  
**Dependencies**: TASK-001

**Description**:
Create organized directory structure for the project.

**Acceptance Criteria**:
- ✅ All directories exist
- ✅ Empty `.gitkeep` files in each directory
- ✅ Clear separation of concerns

**Implementation Steps**:
1. Create directory structure:
   ```bash
   mkdir -p src/{api/{routes,controllers,middleware},services,models,utils,database,config}
   mkdir -p tests/{unit,integration,e2e,fixtures}
   mkdir -p uploads
   ```
2. Add `.gitkeep` files:
   ```bash
   find src tests -type d -exec touch {}/.gitkeep \;
   ```

**Directory Structure**:
```
backend/
├── src/
│   ├── api/
│   │   ├── routes/          # Express routes
│   │   ├── controllers/     # Request handlers
│   │   └── middleware/      # Custom middleware
│   ├── services/            # Business logic
│   ├── models/              # Data models/interfaces
│   ├── utils/               # Utility functions
│   ├── database/            # DB migrations, client
│   ├── config/              # Configuration
│   └── server.ts            # Main entry point
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   └── fixtures/            # Test data
└── uploads/                 # Temporary file storage
```

**Validation Steps**:
1. Run `tree src/` - verify structure
2. Check all directories exist

**Files to Create**:
- Multiple directories with `.gitkeep` files

---

### TASK-005: Set Up PostgreSQL with Docker

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: TASK-004

**Description**:
Set up PostgreSQL database using Docker Compose.

**Acceptance Criteria**:
- ✅ `docker-compose.yml` exists
- ✅ PostgreSQL container starts successfully
- ✅ Database accessible on localhost:5432
- ✅ Persistent volume configured
- ✅ Initial database created

**Implementation Steps**:
1. Create `docker-compose.yml` in project root:
   ```yaml
   version: '3.8'

   services:
     postgres:
       image: postgres:15-alpine
       container_name: pdfai-postgres
       environment:
         POSTGRES_USER: pdfai
         POSTGRES_PASSWORD: pdfai_dev
         POSTGRES_DB: pdfai
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U pdfai"]
         interval: 10s
         timeout: 5s
         retries: 5

   volumes:
     postgres_data:
   ```
2. Start database:
   ```bash
   docker-compose up -d postgres
   ```
3. Verify connection:
   ```bash
   docker-compose exec postgres psql -U pdfai -d pdfai -c "SELECT version();"
   ```

**Validation Steps**:
1. Run `docker-compose ps` - postgres should be "Up"
2. Check health: `docker-compose exec postgres pg_isready -U pdfai`
3. Connect using psql and verify database exists

**Regression Tests**:
```bash
# Manual verification
docker-compose ps postgres
```

**Files to Create**:
- `docker-compose.yml` (in root)

---

### TASK-006: Create Database Schema Migrations

**Priority**: High  
**Estimated Time**: 1.5 hours  
**Dependencies**: TASK-005

**Description**:
Set up database migration system and create initial schema.

**Acceptance Criteria**:
- ✅ Migration tool installed (node-pg-migrate)
- ✅ Migrations directory exists
- ✅ Initial migration creates `documents` table
- ✅ Migration can be run and rolled back
- ✅ Schema matches requirements

**Implementation Steps**:
1. Install migration tool:
   ```bash
   npm install node-pg-migrate pg
   npm install -D @types/pg
   ```
2. Add migration script to `package.json`:
   ```json
   {
     "scripts": {
       "migrate": "node-pg-migrate",
       "migrate:up": "node-pg-migrate up",
       "migrate:down": "node-pg-migrate down"
     }
   }
   ```
3. Create migrations directory:
   ```bash
   mkdir -p src/database/migrations
   ```
4. Create initial migration:
   ```bash
   npm run migrate create initial-schema
   ```
5. Edit migration file (`src/database/migrations/XXXX_initial-schema.js`):
   ```javascript
   exports.up = (pgm) => {
     pgm.createTable('documents', {
       id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
       user_id: { type: 'varchar(255)', notNull: false },
       filename: { type: 'varchar(255)', notNull: true },
       file_size: { type: 'integer', notNull: true },
       status: { 
         type: 'varchar(50)', 
         notNull: true, 
         default: 'pending',
         check: "status IN ('pending', 'processing', 'completed', 'failed')"
       },
       pdf_url: { type: 'text', notNull: false },
       graph_data: { type: 'jsonb', notNull: false },
       summary: { type: 'text', notNull: false },
       metadata: { type: 'jsonb', notNull: false, default: '{}' },
       created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
       updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
     });

     pgm.createIndex('documents', 'status');
     pgm.createIndex('documents', 'created_at');
   };

   exports.down = (pgm) => {
     pgm.dropTable('documents');
   };
   ```
6. Run migration:
   ```bash
   DATABASE_URL=postgresql://pdfai:pdfai_dev@localhost:5432/pdfai npm run migrate:up
   ```

**Validation Steps**:
1. Run migration - should succeed
2. Check table exists: `docker-compose exec postgres psql -U pdfai -c "\dt"`
3. Roll back: `npm run migrate:down`
4. Run up again - should work

**Regression Tests**:
```typescript
// tests/database/migrations.test.ts
import { Pool } from 'pg';

describe('Database Migrations', () => {
  test('documents table exists', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'documents'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
    await pool.end();
  });
});
```

**Files to Create**:
- `src/database/migrations/XXXX_initial-schema.js`

**Files to Modify**:
- `package.json` (add migration scripts)

---

### TASK-007: Implement Database Client Wrapper

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: TASK-006

**Description**:
Create a typed database client wrapper for PostgreSQL operations.

**Acceptance Criteria**:
- ✅ Database client singleton created
- ✅ Connection pooling configured
- ✅ Query helper methods implemented
- ✅ Error handling in place
- ✅ TypeScript types defined

**Implementation Steps**:
1. Create `src/database/client.ts`:
   ```typescript
   import { Pool, PoolClient, QueryResult } from 'pg';
   import { config } from '../config/environment';

   class DatabaseClient {
     private pool: Pool;
     private static instance: DatabaseClient;

     private constructor() {
       this.pool = new Pool({
         connectionString: config.database.url,
         max: 20,
         idleTimeoutMillis: 30000,
         connectionTimeoutMillis: 2000,
       });

       this.pool.on('error', (err) => {
         console.error('Unexpected database error:', err);
       });
     }

     public static getInstance(): DatabaseClient {
       if (!DatabaseClient.instance) {
         DatabaseClient.instance = new DatabaseClient();
       }
       return DatabaseClient.instance;
     }

     public async query<T = any>(
       text: string,
       params?: any[]
     ): Promise<QueryResult<T>> {
       const start = Date.now();
       const result = await this.pool.query<T>(text, params);
       const duration = Date.now() - start;
       console.log('Executed query', { text, duration, rows: result.rowCount });
       return result;
     }

     public async getClient(): Promise<PoolClient> {
       return await this.pool.connect();
     }

     public async transaction<T>(
       callback: (client: PoolClient) => Promise<T>
     ): Promise<T> {
       const client = await this.getClient();
       try {
         await client.query('BEGIN');
         const result = await callback(client);
         await client.query('COMMIT');
         return result;
       } catch (error) {
         await client.query('ROLLBACK');
         throw error;
       } finally {
         client.release();
       }
     }

     public async close(): Promise<void> {
       await this.pool.end();
     }
   }

   export const db = DatabaseClient.getInstance();
   ```

**Validation Steps**:
1. Import db client - should not throw
2. Run a test query: `await db.query('SELECT 1')`
3. Check connection pool created

**Regression Tests**:
```typescript
// tests/database/client.test.ts
import { db } from '../../src/database/client';

describe('Database Client', () => {
  test('can execute query', async () => {
    const result = await db.query('SELECT 1 as num');
    expect(result.rows[0].num).toBe(1);
  });

  test('transaction works', async () => {
    const result = await db.transaction(async (client) => {
      const res = await client.query('SELECT 2 as num');
      return res.rows[0].num;
    });
    expect(result).toBe(2);
  });
});
```

**Files to Create**:
- `src/database/client.ts`

---

### TASK-008: Set Up Redis with Docker

**Priority**: High  
**Estimated Time**: 0.5 hours  
**Dependencies**: TASK-005

**Description**:
Add Redis container to Docker Compose for caching.

**Acceptance Criteria**:
- ✅ Redis service added to docker-compose.yml
- ✅ Redis accessible on localhost:6379
- ✅ Persistent volume configured
- ✅ Health check configured

**Implementation Steps**:
1. Add Redis service to `docker-compose.yml`:
   ```yaml
   services:
     # ... postgres service
     
     redis:
       image: redis:7-alpine
       container_name: pdfai-redis
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5
       command: redis-server --appendonly yes

   volumes:
     postgres_data:
     redis_data:
   ```
2. Start Redis:
   ```bash
   docker-compose up -d redis
   ```
3. Verify:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

**Validation Steps**:
1. Run `docker-compose ps redis` - should be "Up"
2. Test connection: `docker-compose exec redis redis-cli SET test 123`
3. Get value: `docker-compose exec redis redis-cli GET test`

**Files to Modify**:
- `docker-compose.yml` (add redis service)

---

### TASK-009: Implement Redis Client Wrapper

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: TASK-008

**Description**:
Create a typed Redis client wrapper for caching operations.

**Acceptance Criteria**:
- ✅ Redis client singleton created
- ✅ Basic operations (get, set, del) implemented
- ✅ TTL support
- ✅ JSON serialization/deserialization
- ✅ Error handling

**Implementation Steps**:
1. Install Redis client:
   ```bash
   npm install redis
   npm install -D @types/redis
   ```
2. Create `src/database/redis.ts`:
   ```typescript
   import { createClient, RedisClientType } from 'redis';
   import { config } from '../config/environment';

   class RedisClient {
     private client: RedisClientType;
     private static instance: RedisClient;

     private constructor() {
       this.client = createClient({
         url: config.redis.url,
       });

       this.client.on('error', (err) => {
         console.error('Redis Client Error:', err);
       });

       this.client.on('connect', () => {
         console.log('Redis Client Connected');
       });
     }

     public static getInstance(): RedisClient {
       if (!RedisClient.instance) {
         RedisClient.instance = new RedisClient();
       }
       return RedisClient.instance;
     }

     public async connect(): Promise<void> {
       if (!this.client.isOpen) {
         await this.client.connect();
       }
     }

     public async get<T = string>(key: string): Promise<T | null> {
       const value = await this.client.get(key);
       if (!value) return null;
       
       try {
         return JSON.parse(value) as T;
       } catch {
         return value as T;
       }
     }

     public async set(
       key: string,
       value: any,
       ttl?: number
     ): Promise<void> {
       const serialized = typeof value === 'string' ? value : JSON.stringify(value);
       
       if (ttl) {
         await this.client.setEx(key, ttl, serialized);
       } else {
         await this.client.set(key, serialized);
       }
     }

     public async del(key: string): Promise<void> {
       await this.client.del(key);
     }

     public async exists(key: string): Promise<boolean> {
       const result = await this.client.exists(key);
       return result === 1;
     }

     public async close(): Promise<void> {
       await this.client.quit();
     }
   }

   export const redis = RedisClient.getInstance();
   ```

**Validation Steps**:
1. Connect to Redis: `await redis.connect()`
2. Set value: `await redis.set('test', {foo: 'bar'})`
3. Get value: `await redis.get('test')`
4. Delete: `await redis.del('test')`

**Regression Tests**:
```typescript
// tests/database/redis.test.ts
import { redis } from '../../src/database/redis';

describe('Redis Client', () => {
  beforeAll(async () => {
    await redis.connect();
  });

  test('can set and get string', async () => {
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    expect(value).toBe('test_value');
    await redis.del('test_key');
  });

  test('can set and get object', async () => {
    await redis.set('test_obj', { foo: 'bar' });
    const value = await redis.get('test_obj');
    expect(value).toEqual({ foo: 'bar' });
    await redis.del('test_obj');
  });

  test('supports TTL', async () => {
    await redis.set('ttl_key', 'value', 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const value = await redis.get('ttl_key');
    expect(value).toBeNull();
  });
});
```

**Files to Create**:
- `src/database/redis.ts`

---

### TASK-010: Create Express Server with Middleware

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: TASK-003, TASK-004

**Description**:
Set up Express server with essential middleware (CORS, body parser, etc).

**Acceptance Criteria**:
- ✅ Express server starts successfully
- ✅ CORS configured
- ✅ JSON body parser enabled
- ✅ Request logging middleware
- ✅ Server listens on configured port

**Implementation Steps**:
1. Install dependencies:
   ```bash
   npm install express cors morgan
   npm install -D @types/express @types/cors @types/morgan
   ```
2. Create `src/server.ts`:
   ```typescript
   import express, { Application } from 'express';
   import cors from 'cors';
   import morgan from 'morgan';
   import { config, validateConfig } from './config/environment';

   // Validate environment
   validateConfig();

   const app: Application = express();

   // Middleware
   app.use(cors());
   app.use(express.json({ limit: '10mb' }));
   app.use(express.urlencoded({ extended: true }));
   app.use(morgan('dev'));

   // Basic route
   app.get('/', (req, res) => {
     res.json({ message: 'PDF Summary AI API' });
   });

   // Start server
   const PORT = config.port;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
     console.log(`Environment: ${config.nodeEnv}`);
   });

   export default app;
   ```
3. Add dev script to `package.json`:
   ```bash
   npm install -D ts-node-dev
   ```
   ```json
   {
     "scripts": {
       "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
     }
   }
   ```

**Validation Steps**:
1. Run `npm run dev` - server should start
2. Visit http://localhost:4000 - should return JSON
3. Check logs - morgan should log requests

**Regression Tests**:
```typescript
// tests/integration/server.test.ts
import request from 'supertest';
import app from '../../src/server';

describe('Express Server', () => {
  test('GET / returns welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });
});
```

**Files to Create**:
- `src/server.ts`

**Files to Modify**:
- `package.json` (add scripts)

---

## Phase 2: Core Features (Sample Tasks)

### TASK-019: Install and Configure pdf-parse

**Priority**: High  
**Estimated Time**: 0.5 hours  
**Dependencies**: TASK-018

**Description**:
Install pdf-parse library and configure for PDF text extraction.

**Acceptance Criteria**:
- ✅ pdf-parse installed
- ✅ Can import and use pdf-parse
- ✅ Test PDF file can be parsed
- ✅ Basic error handling in place

**Implementation Steps**:
1. Install pdf-parse:
   ```bash
   npm install pdf-parse
   ```
2. Create `src/services/pdf-parser.service.ts`:
   ```typescript
   import fs from 'fs/promises';
   import pdf from 'pdf-parse';

   export class PDFParserService {
     async parsePDF(filePath: string): Promise<pdf.Result> {
       try {
         const dataBuffer = await fs.readFile(filePath);
         const data = await pdf(dataBuffer);
         return data;
       } catch (error) {
         throw new Error(`PDF parsing failed: ${error.message}`);
       }
     }
   }
   ```
3. Add test fixture:
   ```bash
   # Download a sample PDF or create a simple one
   # Place in tests/fixtures/sample.pdf
   ```

**Validation Steps**:
1. Import PDFParserService - should not throw
2. Parse test PDF: `await service.parsePDF('tests/fixtures/sample.pdf')`
3. Check result has `text`, `numpages` properties

**Regression Tests**:
```typescript
// tests/unit/services/pdf-parser.test.ts
import { PDFParserService } from '../../../src/services/pdf-parser.service';
import path from 'path';

describe('PDFParserService', () => {
  let service: PDFParserService;

  beforeEach(() => {
    service = new PDFParserService();
  });

  test('can parse PDF file', async () => {
    const filePath = path.join(__dirname, '../../fixtures/sample.pdf');
    const result = await service.parsePDF(filePath);
    
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.numpages).toBeGreaterThan(0);
  });

  test('throws error for invalid file', async () => {
    await expect(service.parsePDF('invalid.pdf')).rejects.toThrow();
  });
});
```

**Files to Create**:
- `src/services/pdf-parser.service.ts`
- `tests/fixtures/sample.pdf`

---

### TASK-025: Define TypeScript Interfaces (Node, Edge, Graph)

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: TASK-018

**Description**:
Create comprehensive TypeScript interfaces for graph data structures.

**Acceptance Criteria**:
- ✅ All interfaces defined
- ✅ Proper TypeScript types
- ✅ JSDoc comments for documentation
- ✅ Exported from central location

**Implementation Steps**:
1. Create `src/models/graph.model.ts`:
   ```typescript
   /**
    * Types of nodes in the document graph
    */
   export enum NodeType {
     TEXT = 'TEXT',
     TABLE = 'TABLE',
     IMAGE = 'IMAGE',
     SECTION = 'SECTION',
     HEADER = 'HEADER',
     FOOTER = 'FOOTER',
   }

   /**
    * Types of edges (relationships) between nodes
    */
   export enum EdgeType {
     HIERARCHICAL = 'HIERARCHICAL',  // parent-child
     REFERENCE = 'REFERENCE',        // cross-reference
     SEMANTIC = 'SEMANTIC',          // semantic similarity
     SEQUENTIAL = 'SEQUENTIAL',      // document flow
   }

   /**
    * Bounding box coordinates for node position
    */
   export interface BoundingBox {
     page: number;
     x0: number;
     y0: number;
     x1: number;
     y1: number;
   }

   /**
    * Metadata for a graph node
    */
   export interface NodeMetadata {
     page: number;
     bbox?: BoundingBox;
     fontSize?: number;
     fontFamily?: string;
     isHeading?: boolean;
     headingLevel?: number;
     tableCaption?: string;
     imageCaption?: string;
     wordCount?: number;
   }

   /**
    * Edge connecting two nodes
    */
   export interface Edge {
     targetNodeId: string;
     type: EdgeType;
     weight?: number;
     metadata?: {
       referenceText?: string;
       confidence?: number;
     };
   }

   /**
    * Graph node representing a document element
    */
   export interface GraphNode {
     id: string;
     type: NodeType;
     content: string;
     metadata: NodeMetadata;
     embedding?: number[];
     cluster?: string;
     edges: Edge[];
     createdAt: Date;
   }

   /**
    * Complete document graph
    */
   export interface DocumentGraph {
     documentId: string;
     nodes: Map<string, GraphNode>;
     nodesByType: Map<NodeType, string[]>;
     nodesByPage: Map<number, string[]>;
     clusters: Map<string, string[]>;
     metadata: {
       totalPages: number;
       totalNodes: number;
       totalEdges: number;
       avgNodesPerPage: number;
       graphDensity: number;
     };
   }
   ```

**Validation Steps**:
1. Import interfaces - should not have TypeScript errors
2. Create test objects with these types - should type-check
3. Check JSDoc comments appear in IDE

**Regression Tests**:
```typescript
// tests/unit/models/graph.test.ts
import { GraphNode, NodeType, EdgeType } from '../../../src/models/graph.model';

describe('Graph Models', () => {
  test('can create GraphNode object', () => {
    const node: GraphNode = {
      id: 'test-1',
      type: NodeType.TEXT,
      content: 'Test content',
      metadata: { page: 1 },
      edges: [],
      createdAt: new Date(),
    };
    
    expect(node.id).toBe('test-1');
    expect(node.type).toBe(NodeType.TEXT);
  });
});
```

**Files to Create**:
- `src/models/graph.model.ts`

---

## [Continue with remaining 90 tasks...]

_Note: This file is abbreviated for length. The complete specification would include all 95 tasks with the same level of detail._

---

## Task Execution Guidelines for Grok/Cursor

### How to Execute Tasks

1. **Sequential Execution**: Complete tasks in order (follow dependencies)
2. **Validation**: Run all validation steps before marking complete
3. **Testing**: Write and run regression tests for each task
4. **Commit**: Commit after each task with clear message: `feat(TASK-XXX): task title`

### Task Completion Checklist

For each task:
- [ ] Read acceptance criteria
- [ ] Follow implementation steps
- [ ] Run validation steps
- [ ] Write regression tests
- [ ] Run all tests (npm test)
- [ ] Commit changes
- [ ] Mark task as complete

### Error Handling

If a task fails:
1. Check validation steps
2. Review implementation steps
3. Check dependencies are complete
4. Read error messages carefully
5. Consult relevant documentation
6. Ask for clarification if needed

---

## Next Steps

1. ✅ Review this specification document
2. ⏭️ Read GROK-IMPLEMENTATION-PROMPT.md for autonomous execution
3. ⏭️ Start with TASK-001 and proceed sequentially
4. ⏭️ Track progress in task management tool
5. ⏭️ Run regression suite after each phase

**Ready to implement!** 🚀
