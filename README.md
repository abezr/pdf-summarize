# PDF Summary AI

> Knowledge Graph-based PDF summarization with Multi-LLM support

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize
npm install

# 2. Configure (choose ONE provider)
cp .env.example .env
# Add: GOOGLE_API_KEY=your-key-here (FREE, recommended)
# OR:  OPENAI_API_KEY=your-key-here (paid)

# 3. Run
npm run dev
```

**Access**: http://localhost:3000

## What's This?

A sophisticated PDF summarization system that treats documents as **Knowledge Graphs** instead of flat text, enabling:

- **Precision**: Every summary statement traceable to source
- **Context-Aware**: AI can reference tables/images like humans
- **Cost-Optimized**: 97% cheaper with Google Gemini (FREE tier)
- **Production-Ready**: Docker, monitoring, evaluation built-in

## Key Features

### 🤖 Multi-LLM Support
- **OpenAI**: GPT-4o, GPT-3.5
- **Google AI**: Gemini 1.5 Pro, Flash, Flash-8B (FREE tier)
- Auto-detection, fallback, and smart model selection
- **97% cost savings** vs GPT-4o alone

### 🎯 Dynamic Quota Management
- Intelligent model selection based on task
- Automatic fallback when limits reached
- Daily quota tracking & reset
- Zero configuration required

### 🐳 Docker Support
```bash
# Development with hot-reload
npm run docker:dev

# Production with nginx
npm run docker:prod:build
npm run docker:prod:up
```

### 📊 Built-in Observability
- Prometheus metrics
- Grafana dashboards
- OpenTelemetry tracing
- Structured logging

## Documentation

### Getting Started
- **[Installation Guide](docs/guides/QUICK-REFERENCE.md#installation)** - Detailed setup
- **[Docker Guide](docs/guides/DOCKER-GUIDE.md)** - Production deployment
- **[Quick Reference](docs/guides/QUICK-REFERENCE.md)** - Common tasks

### Architecture
- **[System Overview](docs/architecture/C4-ARCHITECTURE.md#system-context)** - High-level design
- **[Architecture Diagrams](docs/architecture/ARCHITECTURE-DIAGRAMS.md)** - Visual system design
- **[Implementation Status](docs/specifications/PROJECT-SUMMARY.md#current-implementation)** - What's built

### LLM & Cost Optimization
- **[Multi-LLM Setup](docs/llm/README.md)** - Provider configuration
- **[Quota Management](docs/llm/QUOTA-MANAGEMENT.md)** - Cost optimization
- **[API Reference](docs/llm/README.md#api-reference)** - Code usage

### Development
- **[Implementation Guide](docs/implementation/IMPLEMENTATION-GUIDE.md)** - Build guide
- **[Code Examples](docs/implementation/EXAMPLE-CODE.md)** - Sample code
- **[AI Agent Guide](AGENT.md)** - For AI assistants

## Current Implementation

**Backend (Node.js + TypeScript + Express)**
- ✅ PDF upload, processing, summarization
- ✅ Multi-LLM with quota management
- ✅ PostgreSQL + migrations
- ✅ Local file storage (configurable to S3/GCS)
- ✅ WebSocket progress updates
- ✅ Metrics & health checks

**Frontend (React 18 + TypeScript + Vite)**
- ✅ PDF upload interface
- ✅ Real-time processing status
- ✅ Summary visualization
- ⏳ Graph visualization (in progress)

**Infrastructure**
- ✅ Docker Compose setup
- ✅ Development & production configs
- ✅ Prometheus + Grafana stack
- ✅ Automated backups

## Configuration

### Minimal (Google AI - FREE)
```bash
NODE_ENV=development
GOOGLE_API_KEY=your-key-here
GOOGLE_QUOTA_MANAGEMENT=true  # Enables smart model selection
```

### Full Configuration
See [.env.example](.env.example) for all options.

## Cost Comparison

| Provider | Model | Cost/1K tokens | Free Tier |
|----------|-------|----------------|-----------|
| Google | Gemini Flash-8B | $0.0000375 | ✅ 1,500 req/day |
| Google | Gemini Flash | $0.000075 | ✅ 1,500 req/day |
| Google | Gemini Pro | $0.00125 | ✅ 50 req/day |
| OpenAI | GPT-3.5 | $0.001 | ❌ Paid only |
| OpenAI | GPT-4o | $0.01 | ❌ Paid only |

**Recommendation**: Start with Google AI (FREE) for development!

## Tech Stack

**Backend**: Node.js 20+, TypeScript 5+, Express, PostgreSQL, Redis  
**Frontend**: React 18, TypeScript, Vite, Tailwind CSS  
**AI**: Multi-LLM (OpenAI + Google Gemini)  
**Infrastructure**: Docker, Prometheus, Grafana, OpenTelemetry  

## Project Structure

```
pdf-summarize/
├── src/
│   ├── api/              # REST API routes & controllers
│   ├── services/         # Business logic
│   │   ├── llm/         # Multi-LLM provider system
│   │   ├── embeddings/  # Vector search
│   │   ├── evaluation/  # Quality metrics
│   │   └── ...
│   ├── database/         # Migrations & models
│   └── observability/    # Metrics & tracing
├── frontend/             # React application
├── docs/                 # Comprehensive documentation
└── scripts/              # Deployment & management
```

## API Endpoints

```bash
# Upload & summarize PDF
POST   /api/documents/upload

# Get all documents
GET    /api/documents

# Get document by ID
GET    /api/documents/:id

# Generate summary
POST   /api/documents/:id/summarize

# Evaluate summary
POST   /api/documents/:id/evaluate

# Delete document
DELETE /api/documents/:id

# Health check
GET    /api/health

# Quota status (Google AI)
GET    /api/llm/quota-status
```

## NPM Scripts

```bash
npm run dev              # Development server with hot-reload
npm run build           # Build for production
npm run start           # Start production server
npm test                # Run tests
npm run lint            # Lint code
npm run docker:dev      # Development with Docker
npm run docker:prod:up  # Production with Docker
```

## Troubleshooting

### No LLM providers available
**Solution**: Add API key to `.env`
```bash
GOOGLE_API_KEY=your-key-here  # Get at: https://makersuite.google.com/app/apikey
```

### Quota exceeded
**Solution**: Check status and wait for reset (midnight PT)
```bash
curl http://localhost:3000/api/llm/quota-status
```

### Port already in use
**Solution**: Change port in `.env`
```bash
PORT=3001
```

See [Quick Reference](docs/guides/QUICK-REFERENCE.md#troubleshooting) for more.

## Documentation Index

All documentation is organized in `docs/`:

```
docs/
├── architecture/     # System design & diagrams
├── implementation/   # Build guides & code samples
├── guides/          # User & developer guides  
├── llm/             # LLM provider documentation
└── specifications/  # Feature specs & requirements
```

**Key Documents**:
- [Quick Reference](docs/guides/QUICK-REFERENCE.md) - One-page cheat sheet
- [Docker Guide](docs/guides/DOCKER-GUIDE.md) - Deployment guide
- [C4 Architecture](docs/architecture/C4-ARCHITECTURE.md) - Complete system design
- [Multi-LLM Guide](docs/llm/README.md) - Provider setup & usage
- [Implementation Guide](docs/implementation/IMPLEMENTATION-GUIDE.md) - Step-by-step build

## Contributing

This is a take-home project for COXIT, but feedback welcome!

## License

MIT

## Repository

https://github.com/abezr/pdf-summarize

---

**Built with ❤️ for COXIT take-home assignment**
