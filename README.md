# Veritas AI — Hybrid Plagiarism & Paraphrase Detector

Veritas AI is a full-stack, enterprise-grade plagiarism detection web application built with **FastAPI**, **React 19 + TypeScript**, **PostgreSQL**, and **scikit-learn + Sentence-Transformers**.

---

## 🌟 Key Features

- **Multi-Format Ingestion**: Supports direct text pasting and file uploads (`.pdf`, `.docx`, `.txt`) with character offset tracking.
- **Hybrid 3-Tier Detection Engine**:
  1. **Tier 1 (Lexical Fast Filter)**: Character n-gram (3-5) TF-IDF vectorization with sublinear term-frequency scaling and cosine similarity.
  2. **Tier 2 (Semantic Embeddings)**: Dense 384-dimensional vector embeddings via `all-MiniLM-L6-v2` (`sentence-transformers`) to detect paraphrasing, synonym substitution, and idea theft.
  3. **Tier 3 (Web Search Integration)**: Optional live web search via Tavily API to verify unmatched passages against public internet content.
- **Intelligent Edge Case Handling**:
  - **Quotation & Citation Exclusion**: Automatically identifies bracket citations (`[1, 2]`), parenthetical author-year markers (`(Vaswani et al., 2017)`), and quoted passages (`"..."`), flagging them as "Cited" rather than penalizing overall originality.
  - **Common Phrase & Idiom Filter**: Curated stop-phrase dictionary and corpus frequency analysis prevents false positives on academic boilerplate (e.g., *"the results show that"*, *"in conclusion"*).
  - **Batch Chunking for Large Documents**: Seamlessly processes 100+ page theses and books in chunked batches without memory pressure or timeouts.
- **Interactive UI & Visual Document Reader**:
  - Color-coded passage highlights (Rose for &ge;80% plagiarism, Amber for 50-79% suspicious, Purple for Cited).
  - Side-by-side passage inspector showing flagged text vs. original reference material.
  - Searchable, filterable findings table with peak and average similarity statistics.
  - Reference Corpus Manager to upload, index, and organize baseline reference materials.
- **Downloadable PDF Reports**: Automated publication-ready PDF summary with score gauges, metric breakdown, and match tables using ReportLab.

---

## 🏗️ Architecture

```
d:\plagarism checker\
├── backend/
│   ├── app/
│   │   ├── core/config.py          # App settings, thresholds, weights
│   │   ├── models/database.py      # SQLAlchemy async models & DB pooling
│   │   ├── routers/
│   │   │   ├── analysis.py         # Analysis endpoints & PDF download
│   │   │   └── documents.py        # Reference corpus management
│   │   ├── services/
│   │   │   ├── parser.py           # Multi-format document parser
│   │   │   ├── chunker.py          # Sentence-level windowed chunker
│   │   │   ├── detector.py         # 3-tier hybrid detection engine
│   │   │   ├── common_phrases.py   # Idiom & boilerplate filter
│   │   │   └── report.py           # ReportLab PDF generator
│   │   └── main.py                 # FastAPI application
│   ├── tests/                      # Pytest unit test suite
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/             # FileUpload, ResultsDashboard, HighlightedText...
│   │   ├── hooks/useApi.ts         # Typed Axios client
│   │   ├── types/index.ts          # Shared TypeScript interfaces
│   │   ├── index.css               # Obsidian glassmorphism design system
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── data/                           # Uploads, reports, and sample references
```

---

## 🚀 Getting Started

### 1. Start the Backend

```bash
# In the backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start the FastAPI server (runs on http://localhost:8000)
python run.py
```

### 2. Start the Frontend

```bash
# In the frontend directory
cd frontend

# Run the Vite development server (runs on http://localhost:5173)
npm run dev
```

### 3. Database Configuration

By default, the backend connects to PostgreSQL at:
`postgresql+asyncpg://postgres:postgres@localhost:5432/plagiarism_checker`

If PostgreSQL is offline or credentials differ, the backend automatically provides a resilient fallback to async SQLite (`data/plagiarism_checker.db`) so the system is immediately operational.
