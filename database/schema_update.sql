-- ============================================
-- Study Buddy AI - Database Schema Update
-- Adds missing tables for all new features
-- Run this against the c240_ai database
-- ============================================

USE c240_ai;

-- Add role column to users table
ALTER TABLE users ADD COLUMN role ENUM('student', 'admin') NOT NULL DEFAULT 'student' AFTER password;

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    deadline DATETIME NOT NULL,
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    study_plan TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    CONSTRAINT assignments_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INT NOT NULL,
    content TEXT,
    chunk_count INT DEFAULT 0,
    indexed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    CONSTRAINT documents_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    topic VARCHAR(100),
    question_count INT NOT NULL DEFAULT 5,
    quiz_type ENUM('mcq', 'short_answer', 'mixed') NOT NULL DEFAULT 'mcq',
    questions JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    CONSTRAINT quizzes_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- QUIZ ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    answers JSON NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY quiz_id (quiz_id),
    CONSTRAINT quiz_attempts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT quiz_attempts_ibfk_2 FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- FLASHCARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flashcards (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_id INT DEFAULT NULL,
    subject VARCHAR(100),
    topic VARCHAR(100),
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    times_reviewed INT NOT NULL DEFAULT 0,
    last_reviewed TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY document_id (document_id),
    CONSTRAINT flashcards_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT flashcards_ibfk_2 FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    assignment_id INT DEFAULT NULL,
    message VARCHAR(500) NOT NULL,
    remind_at DATETIME NOT NULL,
    is_sent TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY assignment_id (assignment_id),
    CONSTRAINT reminders_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT reminders_ibfk_2 FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- STUDY SUMMARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS study_summaries (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    summary_text TEXT NOT NULL,
    key_points JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY document_id (document_id),
    CONSTRAINT study_summaries_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT study_summaries_ibfk_2 FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- STUDY SESSIONS (CALENDAR) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS study_sessions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    assignment_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled', 'completed', 'missed') NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY user_id (user_id),
    KEY assignment_id (assignment_id),
    CONSTRAINT study_sessions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT study_sessions_ibfk_2 FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- USER CALENDAR CONFIGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_calendar_configs (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    provider ENUM('google', 'outlook', 'apple') NOT NULL,
    email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    app_password VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY user_provider (user_id, provider),
    CONSTRAINT user_calendar_configs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

