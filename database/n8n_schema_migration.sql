-- ============================================
-- Study Buddy AI - n8n Integration Schema
-- Additional tables for n8n workflow support
-- Run: mysql -u root -p c240_ai < n8n_schema_migration.sql
-- ============================================

USE c240_ai;

-- ============================================
-- DOCUMENT CHUNKS TABLE
-- Stores individual chunks for RAG pipeline
-- ============================================
CREATE TABLE IF NOT EXISTS document_chunks (
    id INT NOT NULL AUTO_INCREMENT,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    chunk_text TEXT NOT NULL,
    page_number INT DEFAULT NULL,
    token_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_document_id (document_id),
    KEY idx_user_id (user_id),
    CONSTRAINT document_chunks_ibfk_1 FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
    CONSTRAINT document_chunks_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- EMBEDDINGS TABLE
-- Stores vector embeddings metadata
-- (actual vectors stored in ChromaDB)
-- ============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id INT NOT NULL AUTO_INCREMENT,
    document_id INT NOT NULL,
    chunk_id INT NOT NULL,
    user_id INT NOT NULL,
    collection_name VARCHAR(100) NOT NULL DEFAULT 'student_knowledge',
    chromadb_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_document_id (document_id),
    KEY idx_chunk_id (chunk_id),
    KEY idx_chromadb_id (chromadb_id),
    CONSTRAINT embeddings_ibfk_1 FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
    CONSTRAINT embeddings_ibfk_2 FOREIGN KEY (chunk_id) REFERENCES document_chunks (id) ON DELETE CASCADE,
    CONSTRAINT embeddings_ibfk_3 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- CONVERSATIONS TABLE
-- Enhanced chat tracking for n8n
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT DEFAULT NULL,
    title VARCHAR(255),
    context_summary TEXT,
    message_count INT NOT NULL DEFAULT 0,
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_session_id (session_id),
    CONSTRAINT conversations_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT conversations_ibfk_2 FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- STUDY PLANS TABLE
-- Dedicated table for AI-generated study plans
-- ============================================
CREATE TABLE IF NOT EXISTS study_plans (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    assignment_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    plan_data JSON NOT NULL,
    daily_schedule JSON,
    weekly_schedule JSON,
    revision_plan JSON,
    priority_order JSON,
    total_hours DECIMAL(5,1) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status ENUM('active', 'completed', 'expired') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_assignment_id (assignment_id),
    CONSTRAINT study_plans_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT study_plans_ibfk_2 FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- QUIZ QUESTIONS TABLE (Normalized)
-- Individual questions linked to quizzes
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT NOT NULL AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('mcq', 'true_false', 'short_answer') NOT NULL DEFAULT 'mcq',
    options JSON,
    correct_answer VARCHAR(500) NOT NULL,
    explanation TEXT,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    topic VARCHAR(100),
    question_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_quiz_id (quiz_id),
    CONSTRAINT quiz_questions_ibfk_1 FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- QUIZ RESULTS TABLE (Enhanced)
-- Detailed grading results from n8n
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    attempt_id INT DEFAULT NULL,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    grade VARCHAR(5),
    answers_detail JSON NOT NULL,
    wrong_answers JSON,
    ai_feedback TEXT,
    revision_topics JSON,
    time_taken_seconds INT DEFAULT 0,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_quiz_id (quiz_id),
    CONSTRAINT quiz_results_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT quiz_results_ibfk_2 FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- ACTIVITY LOG TABLE
-- Tracks all user activities for dashboard
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type ENUM('chat', 'upload', 'quiz', 'flashcard', 'summary', 'assignment', 'study_plan') NOT NULL,
    description VARCHAR(500) NOT NULL,
    reference_id INT DEFAULT NULL,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_activity_type (activity_type),
    KEY idx_created_at (created_at),
    CONSTRAINT activity_log_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- API KEYS TABLE
-- For webhook authentication
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'default',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_api_key (api_key),
    KEY idx_user_id (user_id),
    CONSTRAINT api_keys_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- Add indexes for performance
-- ============================================
-- Index on documents for duplicate checking
ALTER TABLE documents ADD INDEX idx_user_filename (user_id, original_name) ;

-- Index on flashcards for document lookup  
ALTER TABLE flashcards ADD INDEX idx_user_document (user_id, document_id) ;

-- Index on chat_messages for session history
ALTER TABLE chat_messages ADD INDEX idx_session_created (session_id, created_at) ;
