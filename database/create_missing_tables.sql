USE c240_ai;

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
