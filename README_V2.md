# AI Learning Assistant - RAG Backend & Web Application

## Overview

This project implements a Retrieval-Augmented Generation (RAG) powered AI Learning Assistant.

The system combines a Node.js/Express web application, MySQL database, and Python-based RAG backend to provide an interactive learning platform where students can register, log in, ask questions, and receive AI-generated answers based on a curated knowledge base.

---

## System Architecture

User

↓

Express.js + EJS Frontend

↓

Axios API Request

↓

Flask API

↓

RAG Pipeline

↓

ChromaDB Vector Search

↓

Gemini 2.5 Flash

↓

AI Response

↓

MySQL Chat History Storage

---

## Technology Stack

### Frontend

* EJS
* Bootstrap 5
* CSS

### Backend

* Node.js
* Express.js
* Express Session
* Axios

### Database

* MySQL

### AI & RAG

* Python
* Flask
* ChromaDB
* Sentence Transformers
* Gemini 2.5 Flash

---

## Project Structure

```text
project/

├── app.js
├── .env
├── package.json
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── userController.js
│   └── chatController.js
│
│
├── models/
│   └── userModel.js
│
├── views/
│   ├── index.ejs
│   ├── register.ejs
│   ├── login.ejs
│   └── chat.ejs
│
├── public/
│   └── css/
│
└── rag/
    ├── api.py
    ├── chunking.py
    ├── embedding.py
    ├── retrieval.py
    ├── generator.py
    └── rag_pipeline.py
```

## Database Schema

### users

| Column     | Description           |
| ---------- | --------------------- |
| id         | User ID               |
| name       | User Name             |
| email      | User Email            |
| password   | Hashed Password       |
| created_at | Account Creation Date |

### chat_sessions

| Column     | Description           |
| ---------- | --------------------- |
| id         | Session ID            |
| user_id    | User ID               |
| title      | Chat Title            |
| created_at | Session Creation Date |

### chat_messages

| Column     | Description       |
| ---------- | ----------------- |
| id         | Message ID        |
| session_id | Session ID        |
| sender     | User / Assistant  |
| message    | Chat Content      |
| created_at | Message Timestamp |

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd C240FA
```

### Install Node.js Dependencies

```bash
npm install express ejs mysql2 bcrypt express-session dotenv axios
```

### Install Python Dependencies

```bash
pip install flask sentence-transformers chromadb google-genai python-dotenv
```

### Configure Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY. "https://aistudio.google.com/apikey"

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=c240_ai
```


## Running the Application

### Start Flask RAG API

```bash
python rag/api.py
```

Expected:

```text
Running on http://127.0.0.1:5000
```

### Start Express Application

```bash
npm run dev
```

Expected:

```text
Server running on URL address: http://localhost:3000/
```

---

## Features Completed

### RAG Backend

* Knowledge Base Loading
* Document Chunking
* Embedding Generation
* ChromaDB Vector Database
* Semantic Retrieval
* Gemini Integration
* End-to-End RAG Pipeline

### Web Application

* Express Setup
* EJS Frontend
* Landing Page
* User Registration
* Password Hashing with bcrypt
* User Login
* Session Management
* Chat Interface
* Sidebar Navigation
* Flask API Integration
* Axios Communication
* Postman API Testing

---

## Features In Progress

* New Chat Functionality
* Chat Session Creation
* Chat Message Storage
* Dynamic Chat History
* Search Chat History

---

## Planned Features

* Knowledge Base Upload
* Retrieval Evaluation Dashboard
* User Profile Management
* Conversation Analytics
* Admin Dashboard

```
```
