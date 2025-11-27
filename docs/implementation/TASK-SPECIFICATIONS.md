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

## Phase 3: Advanced Features

### TASK-051: Research and Choose Table Detection Library

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: None (Phase 1 & 2 complete)

**Description**:
Research available table detection libraries for Node.js and choose the best option for extracting tables from PDF documents. Evaluate based on accuracy, ease of integration, and compatibility with existing stack.

**Acceptance Criteria**:
- ✅ Primary library selected with justification
- ✅ Fallback strategy defined
- ✅ Compatibility with existing `pdfjs-dist` confirmed
- ✅ Decision documented in TASK-SPECIFICATIONS.md

**Implementation Steps**:
1. Research npm packages for PDF table extraction
2. Evaluate tabula-js, pdf-table-extractor, and custom approaches
3. Test basic functionality of top candidates
4. Document decision with pros/cons analysis

**Validation Steps**:
1. Check npm registry for available packages
2. Verify package compatibility with Node.js 18+
3. Confirm license compatibility (MIT/BSD preferred)
4. Test basic installation and import

**Regression Tests**:
```typescript
// Basic library import test
describe('Table Detection Library Selection', () => {
  test('should import selected library without errors', async () => {
    // Test import works
  });
});
```

**Files to Create**:
- Update this TASK-SPECIFICATIONS.md with research results

**Research Results**:

#### Available Table Detection Libraries for Node.js

**1. Tabula-based Libraries (Most Robust)**
- **`@krakz999/tabula-node` (v1.0.6)** ⭐ **RECOMMENDED PRIMARY**
  - TypeScript implementation
  - Built on tabula-java (proven technology)
  - Published 1 year ago, actively maintained
  - No dependencies, clean API
  - Size: 13.4 MB (includes tabula JAR)

- **`fresh-tabula-js` (v2.0.0)**
  - Updated tabula wrapper
  - Published over a year ago
  - Size: 11.1 MB

**2. PDF.js-based Libraries**
- **`pdf-table-extractor` (v1.0.3)** ⭐ **RECOMMENDED FALLBACK**
  - Uses existing `pdfjs-dist` (already in project)
  - Lightweight, no Java dependency
  - Good fallback option

**Decision: Primary + Fallback Strategy**

**Primary Library:** `@krakz999/tabula-node`
- **Why:** TypeScript, recent, proven tabula technology, production-ready
- **Pros:** Excellent table detection accuracy, handles complex layouts
- **Cons:** Requires Java runtime, larger package size

**Fallback Library:** `pdf-table-extractor`
- **Why:** Uses existing pdfjs-dist, no additional runtime requirements
- **Pros:** Lightweight, integrates with current stack
- **Cons:** Less accurate for complex tables

**Final Architecture:**
```typescript
// Primary: Use @krakz999/tabula-node for table detection
// Fallback: Use pdf-table-extractor if tabula fails
// Emergency: Custom detection using pdfjs-dist
```

### TASK-052: Install Table Detection Dependencies

**Priority**: High  
**Estimated Time**: 0.25 hours  
**Dependencies**: TASK-051

**Description**:
Install the selected table detection libraries (@krakz999/tabula-node and pdf-table-extractor) and verify they work with the current Node.js environment.

**Acceptance Criteria**:
- ✅ `@krakz999/tabula-node` installed and importable
- ✅ `pdf-table-extractor` installed and importable
- ✅ No breaking changes to existing dependencies
- ✅ Basic import test passes

**Implementation Steps**:
1. Run `npm install @krakz999/tabula-node pdf-table-extractor`
2. Test basic imports work without errors
3. Verify no conflicts with existing packages
4. Update package.json if needed

**Validation Steps**:
1. Check package.json contains new dependencies
2. Test Node.js imports: `require('@krakz999/tabula-node')`
3. Test Node.js imports: `require('pdf-table-extractor')`
4. Run `npm test` to ensure no regressions

**Regression Tests**:
```typescript
describe('Table Detection Dependencies', () => {
  test('should import @krakz999/tabula-node without errors', () => {
    expect(() => require('@krakz999/tabula-node')).not.toThrow();
  });

  test('should import pdf-table-extractor without errors', () => {
    expect(() => require('pdf-table-extractor')).not.toThrow();
  });
});
```

**Files to Modify**:
- `package.json` (automatically updated by npm install)

**Installation Results**:
- ✅ `@krakz999/tabula-node` v1.0.6 installed successfully
- ✅ `pdf-table-extractor` v1.0.3 installed successfully
- ✅ Both libraries import without errors
- ✅ 311 packages added, no breaking changes
- ⚠️ 13 vulnerabilities detected (common with complex packages, non-critical)

### TASK-053: Implement basic table extraction

**Priority**: High
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-052

**Description**:
Implement the core table extraction functionality using the selected libraries (@krakz999/tabula-node primary, pdf-table-extractor fallback).

**Acceptance Criteria**:
- ✅ TableDetectionService class created with primary/fallback extraction
- ✅ @krakz999/tabula-node integration working
- ✅ pdf-table-extractor fallback implemented
- ✅ Basic extractTables method functional
- ✅ Error handling and logging implemented
- ✅ Unit tests passing

**Implementation Steps**:
1. Create TableDetectionService class with library initialization
2. Implement extractWithTabula method using @krakz999/tabula-node
3. Implement extractWithPdfTableExtractor fallback method
4. Add table data parsing and formatting
5. Implement error handling and fallback logic
6. Create unit tests

**Validation Steps**:
1. Check service initializes without errors
2. Verify library imports work
3. Test health status reporting
4. Run unit tests
5. Check TypeScript compilation

**Regression Tests**:
```typescript
describe('TableDetectionService', () => {
  test('should initialize with available libraries', () => {
    const service = new TableDetectionService();
    const health = service.getHealthStatus();
    expect(health.overallHealthy).toBe(true);
  });
});
```

**Files to Create**:
- `src/services/table-detection.service.ts`
- `tests/unit/table-detection.service.test.ts`

**Implementation Results**:
- ✅ Created `TableDetectionService` class with singleton pattern
- ✅ Implemented `@krakz999/tabula-node` integration (primary method)
- ✅ Implemented `pdf-table-extractor` fallback method
- ✅ Added table data parsing for both JSON and array formats
- ✅ Implemented automatic fallback logic
- ✅ Added proper error handling and logging
- ✅ Created comprehensive unit tests (8 tests passing)
- ✅ TypeScript compilation successful
- ✅ Libraries initialize correctly on service creation

### TASK-055: Create table nodes in graph

**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: TASK-053, TASK-054

**Description**:
Extend the GraphBuilder to create table nodes from extracted table data and integrate them into the knowledge graph structure.

**Acceptance Criteria**:
- ✅ GraphBuilder.buildGraph() accepts optional tables parameter
- ✅ Table nodes created using existing GraphFactory.createTableNode()
- ✅ Tables connected to page containers with contains edges
- ✅ Table metadata includes extraction method, confidence, bbox
- ✅ Multi-page table filtering works correctly
- ✅ Backward compatibility maintained (existing code unchanged)

**Implementation Steps**:
1. Extend GraphBuilder.buildGraph() to accept ExtractedTable[] parameter
2. Modify buildGraphStructure() to process tables
3. Add processTablesOnPage() method to create table nodes
4. Implement createTableNode() helper method
5. Add table processing to processPage() method
6. Create comprehensive unit tests

**Validation Steps**:
1. Check TypeScript compilation succeeds
2. Run existing graph builder tests (should still pass)
3. Run new table integration tests
4. Verify table nodes have correct properties and edges
5. Test multi-page table filtering

**Regression Tests**:
```typescript
describe('GraphBuilder table integration', () => {
  test('should create table nodes when tables provided', async () => {
    const tables = [/* mock table data */];
    const graph = await GraphBuilder.buildGraph('doc-id', pdfResult, tables);
    const tableNodes = graph.nodes.filter(n => n.type === 'table');
    expect(tableNodes.length).toBeGreaterThan(0);
  });
});
```

**Files to Modify**:
- `src/services/graph/graph-builder.ts` - Extended with table processing
- `tests/unit/graph-builder.test.ts` - Added table integration tests

**Implementation Results**:
- ✅ Extended `GraphBuilder.buildGraph()` to accept optional `ExtractedTable[]` parameter
- ✅ Added `processTablesOnPage()` method to create table nodes per page
- ✅ Implemented `createTableNode()` helper using existing `GraphFactory.createTableNode()`
- ✅ Table nodes connected to page containers with contains edges
- ✅ Table metadata includes extraction method, confidence, bbox, headers
- ✅ Multi-page table filtering works correctly (tables assigned to correct pages)
- ✅ Backward compatibility maintained (optional parameter, existing tests pass)
- ✅ Added comprehensive unit tests (3 new tests, all passing)
- ✅ TypeScript compilation successful
- ✅ Debug logging shows correct table processing

---

### TASK-057: Install Image Extraction Libraries

**Priority**: High
**Estimated Time**: 1 hour
**Dependencies**: None (Phase 1 foundation complete)

**Description**:
Install and configure libraries for extracting images from PDF pages to enable image processing and OCR capabilities.

**Acceptance Criteria**:
- ✅ `pdf2pic` library installed for PDF-to-image conversion
- ✅ `sharp` library installed for image processing
- ✅ `canvas` library available for rendering operations
- ✅ `pdf-lib` installed for PDF manipulation
- ✅ All libraries import without errors
- ✅ Basic image extraction service initializes successfully
- ✅ Unit tests pass for library availability
- ✅ Dependencies added to package.json

**Implementation Steps**:
1. Research PDF image extraction libraries (pdf2pic, pdfjs-dist, canvas)
2. Evaluate compatibility with existing stack (Node.js 18+, TypeScript)
3. Choose primary library: `pdf2pic` for page-to-image conversion
4. Install dependencies: `npm install pdf2pic sharp canvas pdf-lib`
5. Remove unnecessary types: `npm uninstall @types/sharp`
6. Create basic `ImageExtractionService` class with initialization
7. Implement health check method to verify libraries
8. Write unit tests for service initialization
9. Run tests to verify installation works
10. Update package.json scripts if needed

**Validation Steps**:
1. `npm install` completes without errors
2. `npm test` runs image extraction tests successfully
3. Service health check returns all libraries available
4. TypeScript compilation passes
5. No console errors during initialization

**Regression Tests**:
```typescript
// tests/unit/image-extraction.service.test.ts
describe('ImageExtractionService', () => {
  test('should initialize with required libraries', () => {
    const healthStatus = imageExtractionService.getHealthStatus();
    expect(healthStatus.pdf2picAvailable).toBe(true);
    expect(healthStatus.sharpAvailable).toBe(true);
    expect(healthStatus.overallHealthy).toBe(true);
  });
});
```

**Files to Create**:
- `src/services/image-extraction.service.ts` - Image extraction service
- `tests/unit/image-extraction.service.test.ts` - Unit tests

**Files to Modify**:
- `package.json` - Add new dependencies

---

### TASK-058: Extract Images from PDF Pages

**Priority**: High
**Estimated Time**: 2 hours
**Dependencies**: TASK-057

**Description**:
Implement the core image extraction functionality to convert PDF pages to images using the installed libraries.

**Acceptance Criteria**:
- ✅ PDF pages converted to images (PNG/JPEG/TIFF formats)
- ✅ Configurable DPI and quality settings
- ✅ Support for specific page ranges
- ✅ Images saved to configurable output directory
- ✅ Error handling for invalid PDFs
- ✅ Memory-efficient processing for large PDFs
- ✅ Image metadata extraction (dimensions, size, format)
- ✅ Progress logging and error reporting

**Implementation Steps**:
1. Implement `extractImages()` method in ImageExtractionService
2. Add support for different output formats (PNG, JPEG, TIFF)
3. Configure pdf2pic options (density, quality, format)
4. Implement page range processing (single pages, ranges, all pages)
5. Add output directory creation and validation
6. Implement image metadata extraction using sharp
7. Add proper error handling and logging
8. Create `ExtractedImage` interface for return data
9. Implement file cleanup for temporary files
10. Add input validation for PDF files

**Validation Steps**:
1. Service extracts images from test PDF successfully
2. Different formats (PNG, JPEG) work correctly
3. Page range selection works (single page, multiple pages)
4. Output directory created automatically
5. Image files have correct metadata
6. Error handling works for invalid inputs
7. Memory usage remains reasonable

**Regression Tests**:
```typescript
describe('extractImages', () => {
  test('should extract images from valid PDF', async () => {
    const images = await imageExtractionService.extractImages(
      './test.pdf',
      './output',
      { format: 'png', dpi: 150 }
    );
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].format).toBe('png');
  });

  test('should handle non-existent PDF gracefully', async () => {
    await expect(
      imageExtractionService.extractImages('./nonexistent.pdf', './output')
    ).rejects.toThrow();
  });
});
```

**Files to Create**:
- Extend `src/services/image-extraction.service.ts` with extraction logic

**Files to Modify**:
- `src/models/graph.model.ts` - Add image-related interfaces

---

### TASK-059: Save Images to Storage

**Priority**: High
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-058

**Description**:
Implement storage functionality for extracted images, supporting both local filesystem and cloud storage options.

**Acceptance Criteria**:
- ✅ Images saved to local filesystem with organized structure
- ✅ Configurable storage paths and naming conventions
- ✅ Image file validation and integrity checks
- ✅ Storage metadata tracking (file paths, sizes, timestamps)
- ✅ Cleanup functionality for temporary files
- ✅ Support for different storage backends (local, S3, etc.)
- ✅ Storage quota and size limit handling

**Implementation Steps**:
1. Implement `saveImage()` method for local storage
2. Create organized directory structure (by document ID, page number)
3. Add file naming convention (document_page_image.format)
4. Implement storage configuration options
5. Add image file validation (corrupt file detection)
6. Create storage metadata interface
7. Implement cleanup methods for temporary files
8. Add storage space monitoring
9. Support configurable storage backends

**Validation Steps**:
1. Images saved to correct directories
2. File naming follows convention
3. Storage metadata accurate
4. Cleanup removes temporary files
5. Storage configuration works
6. File integrity maintained

**Regression Tests**:
```typescript
describe('saveImage', () => {
  test('should save image to local storage', async () => {
    const imageData = Buffer.from('fake image data');
    const path = await storageService.saveImage(imageData, 'test.png');
    expect(path).toContain('test.png');
    expect(fs.existsSync(path)).toBe(true);
  });
});
```

**Files to Create**:
- `src/services/storage.service.ts` - Storage abstraction
- `src/services/local-storage.service.ts` - Local filesystem implementation

---

### TASK-060: Create Image Nodes in Graph

**Priority**: High
**Estimated Time**: 1.5 hours
**Dependencies**: TASK-058, TASK-059

**Description**:
Integrate extracted images into the knowledge graph by creating image nodes and connecting them to document structure.

**Acceptance Criteria**:
- ✅ Image nodes created in knowledge graph
- ✅ Images connected to page containers with "contains" edges
- ✅ Image metadata stored in node properties
- ✅ Image nodes linked to document root
- ✅ Graph builder extended to accept image data
- ✅ Image processing integrated with existing graph building
- ✅ Image node IDs follow consistent naming convention

**Implementation Steps**:
1. Extend `GraphBuilder` to accept `ExtractedImage[]` parameter
2. Create `createImageNode()` method in GraphFactory
3. Implement `processImagesOnPage()` in GraphBuilder
4. Add image node connections to page containers
5. Store image metadata in node properties
6. Update graph building pipeline to include images
7. Add image processing to document workflow
8. Ensure backward compatibility

**Validation Steps**:
1. Graph contains image nodes after processing
2. Image nodes have correct metadata
3. Image nodes connected to correct pages
4. Graph structure remains valid
5. No breaking changes to existing functionality

**Regression Tests**:
```typescript
describe('GraphBuilder with images', () => {
  test('should create image nodes in graph', async () => {
    const images: ExtractedImage[] = [/* test data */];
    const graph = await GraphBuilder.buildGraph(documentId, pdfResult, [], images);

    const imageNodes = graph.getNodesByType('image');
    expect(imageNodes.length).toBeGreaterThan(0);
  });
});
```

**Files to Modify**:
- `src/services/graph/graph-builder.ts` - Add image processing
- `src/services/graph/graph-factory.ts` - Add image node creation
- `src/models/graph.model.ts` - Add image node interface

---

### TASK-061: Add Image Extraction Tests

**Priority**: Medium
**Estimated Time**: 1 hour
**Dependencies**: TASK-057, TASK-058, TASK-059, TASK-060

**Description**:
Create comprehensive unit and integration tests for the complete image extraction pipeline.

**Acceptance Criteria**:
- ✅ Unit tests for all image extraction methods
- ✅ Integration tests for end-to-end image processing
- ✅ Error handling tests for edge cases
- ✅ Performance tests for large PDFs
- ✅ Test coverage >80% for image extraction code
- ✅ Mock implementations for external dependencies
- ✅ Test fixtures with sample images

**Implementation Steps**:
1. Write unit tests for ImageExtractionService methods
2. Create integration tests for full pipeline
3. Add error handling test cases
4. Implement test fixtures with sample PDFs/images
5. Write performance tests
6. Add storage service tests
7. Test graph integration with images
8. Ensure test coverage meets requirements

**Validation Steps**:
1. All tests pass consistently
2. Test coverage >80%
3. No flaky tests
4. Error cases properly handled
5. Performance acceptable

**Regression Tests**:
```typescript
describe('Image Extraction Integration', () => {
  test('should process PDF with images end-to-end', async () => {
    // Full pipeline test
    const result = await processDocumentWithImages('./test.pdf');
    expect(result.images).toBeDefined();
    expect(result.graph.hasImageNodes()).toBe(true);
  });
});
```

**Files to Create**:
- `tests/unit/image-extraction.service.test.ts` - Unit tests
- `tests/integration/image-processing.test.ts` - Integration tests
- `tests/fixtures/sample-images/` - Test fixtures

**Files to Modify**:
- `tests/unit/graph-builder.test.ts` - Add image tests

---

## [Continue with remaining 86 tasks...]

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
