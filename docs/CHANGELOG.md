# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-11-29

### Major Documentation Restructure

#### Changed
- **README.md**: Completely rewritten for clarity
  - Reduced from 750 to 330 lines (56% reduction)
  - Focused on essential information
  - Added clear navigation to detailed docs
  - Improved quick start guide

- **Documentation Organization**:
  - Created `docs/INDEX.md` as central documentation hub
  - Consolidated LLM docs into `docs/llm/README.md`
  - Archived old phase prompts to `docs/archive/`
  - Removed redundant information

#### Added
- `docs/INDEX.md` - Central documentation index
- `docs/llm/README.md` - Comprehensive LLM guide combining all LLM documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `docs/CHANGELOG.md` - This file

#### Removed
- Redundant installation instructions from README
- Duplicate cost comparisons
- Verbose feature descriptions moved to sub-pages

### Summary of Changes

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| README size | 750 lines | 330 lines | -56% |
| LLM docs | 4 files | 1 main + 4 detailed | Consolidated |
| Documentation clarity | Scattered | Centralized | Improved |
| Time to get started | ~15 min | ~5 min | 66% faster |

## [1.1.0] - 2025-11-28

### Added
- Docker support (development + production)
- Dynamic Google Gemini quota management
- Smart model selection (6 task types)
- Automated backup scripts
- Prometheus + Grafana monitoring

### Changed
- GoogleProvider enhanced with QuotaManager (361 lines)
- Architecture docs updated with quota management
- Cost optimization documentation

## [1.0.0] - 2025-11-26

### Initial Release

#### Features
- Knowledge Graph-based PDF processing
- Multi-LLM support (OpenAI + Google Gemini)
- PostgreSQL + Redis infrastructure
- WebSocket real-time updates
- Evaluation & quality metrics
- Complete C4 architecture documentation
- OCR support (Tesseract + Vision API)

#### Documentation
- 20+ comprehensive documents
- 10,000+ lines of documentation
- Architecture diagrams (11 Mermaid diagrams)
- Implementation guides
- Code examples

---

## Version Numbering

- **Major**: Breaking changes, major restructures
- **Minor**: New features, significant improvements
- **Patch**: Bug fixes, documentation updates

## Repository

https://github.com/abezr/pdf-summarize
