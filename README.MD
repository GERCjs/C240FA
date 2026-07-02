# AI Study Buddy - Learning Assistant

## Overview

Study Buddy AI is a Python/Flask learning assistant for polytechnic students. It uses a Retrieval-Augmented Generation pipeline with ChromaDB, sentence-transformer embeddings, and Gemini to answer questions, generate quizzes, summarize uploaded notes, create flashcards, and plan assignment study schedules.

## Architecture

```
Student -> Flask web app + Jinja templates -> Flask RAG API -> ChromaDB -> Gemini API -> MySQL history and study data
```

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Jinja templates, Bootstrap 5, CSS |
| Web backend | Python, Flask |
| Database | MySQL via PyMySQL |
| AI/RAG | Python, Flask, ChromaDB, Sentence Transformers |
| LLM | Gemini API via `google-genai` |
| Auth | Flask session, bcrypt |

## Project Structure

```
C240FA/
├── app.py                    # Flask web app entrypoint
├── main.py                   # Python CLI concept pipeline
├── retrieval.py              # Python keyword retrieval compatibility module
├── requirements.txt
├── web/
│   ├── auth.py               # Login/admin decorators
│   ├── db.py                 # MySQL helpers
│   ├── uploads.py            # Upload validation and text extraction
│   ├── validation.py         # Input and prompt sanitization
│   ├── routes/               # Flask web routes
│   └── services/             # RAG client and local fallbacks
├── rag/
│   ├── api.py                # Flask RAG API
│   ├── chunking.py
│   ├── embedding.py
│   ├── retrieval.py
│   ├── generator.py          # Gemini integration and fallbacks
│   └── requirements.txt
├── views/                    # Jinja templates, kept as .ejs filenames
├── public/css/
├── knowledge_base/
├── database/
├── tests/
└── uploads/
```

## Environment

Create a `.env` or set these environment variables in your shell:

```powershell
$env:DB_HOST="127.0.0.1"
$env:DB_USER="root"
$env:DB_PASSWORD="your-password"
$env:DB_NAME="c240_ai"
$env:SESSION_SECRET="change-me"
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:GEMINI_MODEL="gemini-2.5-flash"
$env:RAG_API_URL="http://127.0.0.1:5000"
```

## Installation

```powershell
python -m pip install -r requirements.txt
```

Import the MySQL schema:

```sql
CREATE DATABASE c240_ai;
USE c240_ai;
SOURCE database/c240_ai.sql;
SOURCE database/schema_update.sql;
```

## Run

Start the RAG API:

```powershell
python rag/api.py
```

Start the web app in another terminal:

```powershell
python app.py
```

Visit `http://localhost:3000/`.

## Tests

```powershell
python -m pytest
```

Some integration tests require optional RAG dependencies and a running Flask API. Gemini calls should be mocked in automated tests; the generator falls back gracefully when `GEMINI_API_KEY` is missing.
