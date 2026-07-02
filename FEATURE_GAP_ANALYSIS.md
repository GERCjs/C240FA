# Feature Gap Analysis Report

## Study Buddy AI Chatbot — Full Codebase Review

**Date:** June 21, 2026  
**Project:** C240 AI Learning Assistant  
**Architecture:** Node.js/Express + Python Flask RAG + MySQL + ChromaDB + Ollama

---

## Feature Comparison Table

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| **AI Study Chatbot** |||
| 1 | Answer student questions using AI | ✅ Implemented | Flask API + Ollama qwen3:8b |
| 2 | Maintain conversation history | ⚠️ Partial | DB schema exists, not wired up |
| 3 | Provide student-friendly explanations | ✅ Implemented | Learning Agent prompt structure |
| 4 | Support follow-up questions | ❌ Missing | Single Q&A only, no context carry |
| **RAG** |||
| 5 | Upload PDF lecture notes | ❌ Missing | No upload functionality |
| 6 | Upload study materials/tutorials | ❌ Missing | Only static .txt files |
| 7 | Extract and index document content | ✅ Implemented | chunking.py + embedding.py |
| 8 | Retrieve relevant content before response | ✅ Implemented | ChromaDB vector search |
| 9 | Cite document sources when answering | ❌ Missing | No source citations in responses |
| **Assignment Planner** |||
| 10 | Create assignments | ❌ Missing | No feature exists |
| 11 | Store title, module, deadline, priority | ❌ Missing | No DB table |
| 12 | Generate study plans automatically | ❌ Missing | |
| 13 | Display upcoming deadlines | ❌ Missing | |
| 14 | Send reminders for overdue/upcoming tasks | ❌ Missing | |
| **Quiz Generator** |||
| 15 | Generate MCQs from uploaded notes | ❌ Missing | |
| 16 | Generate short-answer questions | ❌ Missing | |
| 17 | Provide correct answers and explanations | ❌ Missing | |
| 18 | Track quiz scores | ❌ Missing | |
| **Study Summary Generator** |||
| 19 | Summarize uploaded lecture notes | ❌ Missing | |
| 20 | Generate concise revision notes | ❌ Missing | |
| 21 | Generate flashcards | ❌ Missing | |
| 22 | Export summaries | ❌ Missing | |
| **Academic FAQ Assistant** |||
| 23 | Answer GPA/attendance/exam questions | ❌ Missing | |
| 24 | Answer academic regulations questions | ❌ Missing | |
| 25 | Use RAG knowledge sources | ✅ Implemented | For existing subjects only |
| **Student Dashboard** |||
| 26 | Display upcoming deadlines | ❌ Missing | |
| 27 | Display recent chats | ❌ Missing | |
| 28 | Display quiz performance | ❌ Missing | |
| 29 | Display study progress | ❌ Missing | |
| 30 | Display uploaded documents | ❌ Missing | |
| **AI Agent Workflow** |||
| 31 | Study Agent (retrieves info) | ✅ Implemented | main.js Knowledge Retrieval Agent |
| 32 | Knowledge Retrieval Agent | ✅ Implemented | retrieval.js + retrieval.py |
| 33 | Explanation Agent | ✅ Implemented | Learning Agent in main.js |
| 34 | Quiz Agent | ❌ Missing | |
| 35 | Planner Agent | ❌ Missing | |
| **User Experience** |||
| 36 | Responsive design | ⚠️ Partial | Bootstrap used but chat not responsive |
| 37 | Dark mode | ❌ Missing | |
| 38 | Loading indicators | ❌ Missing | |
| 39 | Error handling | ❌ Missing | Only basic res.send() |
| 40 | Empty-state screens | ❌ Missing | |
| 41 | Mobile-friendly layout | ⚠️ Partial | Bootstrap grid but chat CSS not mobile |
| **Database Improvements** |||
| 42 | users table | ✅ Implemented | |
| 43 | assignments table | ❌ Missing | |
| 44 | documents table | ❌ Missing | |
| 45 | quizzes table | ❌ Missing | |
| 46 | quiz_attempts table | ❌ Missing | |
| 47 | flashcards table | ❌ Missing | |
| 48 | chat_history table | ✅ Implemented | chat_sessions + chat_messages |
| 49 | reminders table | ❌ Missing | |
| **Admin Features** |||
| 50 | Manage uploaded documents | ❌ Missing | |
| 51 | Manage users | ❌ Missing | |
| 52 | View chatbot usage analytics | ❌ Missing | |
| 53 | View quiz statistics | ❌ Missing | |
| **Security** |||
| 54 | Validate all user input | ❌ Missing | |
| 55 | Prevent prompt injection | ❌ Missing | |
| 56 | Prevent file upload abuse | ❌ Missing | |
| 57 | Secure API keys (env vars) | ⚠️ Partial | DB config in .env, session secret hardcoded |
| 58 | Auth/authz checks | ⚠️ Partial | Login exists, no route guards |
| **Testing** |||
| 59 | Unit tests | ❌ Missing | |
| 60 | Integration tests | ❌ Missing | |
| 61 | Error handling tests | ❌ Missing | |

---

## Summary

| Category | Implemented | Partial | Missing |
|----------|:-----------:|:-------:|:-------:|
| AI Study Chatbot | 2 | 1 | 1 |
| RAG | 2 | 0 | 3 |
| Assignment Planner | 0 | 0 | 5 |
| Quiz Generator | 0 | 0 | 4 |
| Study Summary Generator | 0 | 0 | 4 |
| Academic FAQ Assistant | 1 | 0 | 2 |
| Student Dashboard | 0 | 0 | 5 |
| AI Agent Workflow | 3 | 0 | 2 |
| User Experience | 0 | 3 | 3 |
| Database | 2 | 0 | 5 |
| Admin Features | 0 | 0 | 4 |
| Security | 0 | 3 | 3 |
| Testing | 0 | 0 | 3 |
| **TOTAL** | **10** | **7** | **44** |

---

## Implementation Plan

All missing features will be implemented following:
- Existing MVC architecture (controllers/, models/, views/)
- Express.js + EJS + Bootstrap 5 frontend pattern
- MySQL for persistent data
- Python Flask RAG backend for AI features
- Callback-based MySQL queries (matching existing style)
- Session-based authentication
