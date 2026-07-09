-- ============================================
-- Study Buddy AI - Migration
-- Removes deprecated tables (documents, study_summaries)
-- and cleans up references
-- Run: mysql -u root -p c240_ai < n8n_schema_migration.sql
-- ============================================

USE c240_ai;

-- ============================================
-- DROP DEPRECATED TABLES AND REFERENCES
-- ============================================

-- Drop tables that depend on documents first
DROP TABLE IF EXISTS embeddings;
DROP TABLE IF EXISTS document_chunks;

-- Remove document_id FK from flashcards (if it exists)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = 'c240_ai' AND TABLE_NAME = 'flashcards' AND CONSTRAINT_NAME = 'flashcards_ibfk_2');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE flashcards DROP FOREIGN KEY flashcards_ibfk_2', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove document_id column from flashcards (if it exists)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'c240_ai' AND TABLE_NAME = 'flashcards' AND COLUMN_NAME = 'document_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE flashcards DROP COLUMN document_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop study_summaries table
DROP TABLE IF EXISTS study_summaries;

-- Drop documents table
DROP TABLE IF EXISTS documents;

-- ============================================
-- CONVERSATIONS TABLE
-- Enhanced chat tracking
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
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type ENUM('chat', 'quiz', 'flashcard', 'assignment', 'study_plan') NOT NULL,
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
ALTER TABLE chat_messages ADD INDEX idx_session_created (session_id, created_at);
