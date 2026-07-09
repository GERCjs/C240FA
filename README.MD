# AI Study Buddy - Learning Assistant

## Overview

An AI-powered study assistant for polytechnic students built with Retrieval-Augmented Generation (RAG). The system helps students understand programming concepts through explanations, examples, key takeaways, and practice questions — without giving direct assignment answers.

## System Architecture

```
Student → Express.js + EJS Frontend → Axios POST → Flask RAG API → ChromaDB Vector Search → Ollama qwen3:8b → AI Response → MySQL Chat History
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS, Bootstrap 5, CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| AI/RAG | Python, Flask, ChromaDB, Sentence Transformers |
| LLM | Ollama (qwen3:8b) |
| Auth | bcrypt, express-session |

## Features

### Core Features
- **AI Study Chatbot** — Ask questions, get beginner-friendly explanations with RAG
- **Conversation History** — Persistent chat sessions stored in MySQL
- **Follow-up Support** — Context-aware responses using conversation history
- **Academic Integrity Guard** — Guides learning instead of giving direct answers

### RAG Pipeline
- **Knowledge Base** — Structured .txt files (Programming, Database, AI Prompting, Academic FAQ)
- **Document Upload** — Upload PDF, TXT, MD files for AI to reference
- **Semantic Search** — ChromaDB + sentence-transformers for vector retrieval
- **Source Citation** — Shows which knowledge chunk was used

### Assignment Planner
- Create assignments with title, module, deadline, priority
- Auto-generate study plans using AI
- Track status (pending → in progress → completed)
- Visual overdue warnings

### Quiz Generator
- Generate MCQs and short-answer questions from study topics
- AI-powered question generation via Ollama
- Auto-grading with explanations
- Score tracking and history

### Study Summary Generator
- Summarize uploaded documents into revision notes
- Extract key points automatically
- Export summaries as text files

### Flashcards
- Generate flashcards from topics or documents
- Flip-card interaction
- Review tracking

### Student Dashboard
- Upcoming deadlines
- Recent chats
- Quiz performance
- Study progress metrics

### Admin Panel
- Manage users
- Manage uploaded documents
- Usage analytics (chat activity, quiz stats, active users)

### AI Agent Workflow
- **Topic Detection Agent** — Classifies questions by subject/topic/intent
- **Knowledge Retrieval Agent** — Finds relevant chunks from knowledge base
- **Learning Agent** — Formats student-friendly responses
- **Quiz Agent** — Generates practice questions
- **Planner Agent** — Creates study schedules

## Project Structure

```
C240FA/
├── app.js                    # Express server + routes
├── package.json
├── .env.example
├── pytest.ini
├── config/
│   └── db.js                 # MySQL connection
├── controllers/
│   ├── userController.js     # Auth (register/login/logout)
│   ├── chatController.js     # Chat with history
│   ├── assignmentController.js
│   ├── quizController.js
│   ├── documentController.js
│   ├── summaryController.js
│   ├── dashboardController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js               # Route protection
│   ├── upload.js             # Multer file upload
│   └── validate.js           # Input validation + prompt injection prevention
├── models/
│   └── userModel.js
├── views/
│   ├── index.ejs, login.ejs, register.ejs
│   ├── dashboard.ejs, chat.ejs
│   ├── assignments.ejs, documents.ejs
│   ├── quizzes.ejs, quiz-take.ejs, quiz-results.ejs
│   ├── summaries.ejs, flashcards.ejs
│   ├── error.ejs
│   ├── admin/ (dashboard, users, documents, analytics)
│   └── partial/ (navbar, footer)
├── public/css/
│   ├── chat.css              # Chat UI + dark mode
│   └── style.css             # Global styles + dark mode
├── rag/
│   ├── api.py                # Flask API (all endpoints)
│   ├── chunking.py           # Document loader
│   ├── embedding.py          # Sentence transformer embeddings
│   ├── retrieval.py          # ChromaDB vector search
│   ├── generator.py          # Ollama LLM integration
│   ├── rag_pipeline.py       # CLI testing
│   └── requirements.txt
├── knowledge_base/
│   ├── programming.txt
│   ├── database.txt
│   ├── ai_prompting.txt
│   └── academic_faq.txt
├── database/
│   ├── c240_ai.sql           # Original schema
│   └── schema_update.sql     # New tables
├── tests/
│   ├── test_validation.py    # Unit tests
│   ├── test_retrieval.py     # Integration tests
│   └── test_error_handling.py
├── uploads/                  # Uploaded documents
├── main.js                   # CLI agent pipeline
└── retrieval.js              # JS keyword retrieval
```

## Database Schema

| Table | Purpose |
|-------|---------|
| users | Student/admin accounts |
| chat_sessions | Chat conversation sessions |
| chat_messages | Individual messages |
| assignments | Assignment planner |
| documents | Uploaded files |
| quizzes | Generated quizzes |
| quiz_attempts | Quiz scores |
| flashcards | Study flashcards |
| study_summaries | Generated summaries |
| reminders | Deadline reminders |

## Installation

### 1. Clone & Install Node.js Dependencies

```bash
git clone <repo-url>
cd C240FA
npm install
```

### 2. Install Python Dependencies

```bash
pip install flask flask-cors sentence-transformers chromadb openai
```

### 3. Install Ollama + Model

```bash
# Download from https://ollama.com/download
ollama pull qwen3:8b
```

### 4. Configure Environment

```bash
copy .env.example .env
# Edit .env with your MySQL credentials
```

### 5. Setup Database

```sql
-- Create database
CREATE DATABASE c240_ai;

-- Import base schema
SOURCE database/c240_ai.sql;

-- Run schema updates
SOURCE database/schema_update.sql;
```

### 6. Run the Application

```bash
# Terminal 1: Start Flask RAG API
cd rag
python api.py

# Terminal 2: Start Express server
npm run dev
```

Visit: http://localhost:3000/

## Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_validation.py -v
pytest tests/test_retrieval.py -v
pytest tests/test_error_handling.py -v
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | / | Landing page |
| GET/POST | /register | Registration |
| GET/POST | /login | Login |
| GET | /logout | Logout |

### Authenticated (Student)
| Method | Path | Description |
|--------|------|-------------|
| GET | /dashboard | Student dashboard |
| GET/POST | /chat | AI chatbot |
| GET/POST | /assignments | Assignment planner |
| GET/POST | /quizzes | Quiz generator |
| GET/POST | /documents | Document upload |
| GET/POST | /summaries | Study summaries |
| GET/POST | /flashcards | Flashcards |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | /admin | Admin dashboard |
| GET | /admin/users | Manage users |
| GET | /admin/documents | Manage documents |
| GET | /admin/analytics | Usage analytics |

### Flask RAG API (port 5000)
| Method | Path | Description |
|--------|------|-------------|
| POST | /chat | AI question answering |
| POST | /index-document | Index uploaded document |
| POST | /generate-quiz | Generate quiz questions |
| POST | /generate-summary | Generate document summary |
| POST | /generate-flashcards | Generate flashcards |
| POST | /generate-plan | Generate study plan |

## Security Features

- Password hashing with bcrypt (10 rounds)
- Session-based authentication
- Route protection middleware (requireAuth, requireAdmin)
- Input sanitization (XSS prevention)
- Prompt injection blocking
- File upload validation (type + size limits)
- Parameterized SQL queries

## Team

| Role | Name | Student # |
|------|------|-----------|
| Team Captain | Huang Yule | 24039614 |
| Solution Lead | Kang Wei Jie | 24003425 |
| Data Lead | Gerald Cheng Jun Sheng | 24042630 |
| QA/Testing Lead | Elangovan Arut Chelvan | 24027003 |
| Comms Lead | Tay Yu Cheng | 24026492 |

## Module

C240 AI Essentials & Innovations — Republic Polytechnic, 2026
