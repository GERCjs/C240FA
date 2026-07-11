-- Add chat sidebar management support.
-- Run this once against the existing database before using pin/unpin.

ALTER TABLE chat_sessions
    ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_chat_sessions_user_pinned_created
    ON chat_sessions (user_id, is_pinned, created_at);
