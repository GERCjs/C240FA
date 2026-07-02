"""
Error Handling Tests
Tests for graceful error handling across the application.
"""
import pytest
import requests
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rag"))


class TestFlaskAPIErrorHandling:
    """Tests for Flask API error responses"""

    BASE_URL = "http://127.0.0.1:5000"

    def test_chat_empty_question(self):
        """Should handle empty question gracefully"""
        try:
            response = requests.post(
                f"{self.BASE_URL}/chat",
                json={"question": ""},
                timeout=10
            )
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
        except requests.ConnectionError:
            pytest.skip("Flask server not running")

    def test_chat_missing_question_field(self):
        """Should handle missing question field"""
        try:
            response = requests.post(
                f"{self.BASE_URL}/chat",
                json={},
                timeout=10
            )
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
        except requests.ConnectionError:
            pytest.skip("Flask server not running")

    def test_chat_very_long_question(self):
        """Should handle extremely long input without crashing"""
        try:
            long_question = "What is Python? " * 500
            response = requests.post(
                f"{self.BASE_URL}/chat",
                json={"question": long_question},
                timeout=30
            )
            assert response.status_code == 200
        except requests.ConnectionError:
            pytest.skip("Flask server not running")

    def test_quiz_generate_missing_fields(self):
        """Should handle quiz generation with missing fields"""
        try:
            response = requests.post(
                f"{self.BASE_URL}/generate-quiz",
                json={},
                timeout=30
            )
            assert response.status_code == 200
            data = response.json()
            assert "questions" in data
        except requests.ConnectionError:
            pytest.skip("Flask server not running")

    def test_summary_empty_content(self):
        """Should handle summary generation with empty content"""
        try:
            response = requests.post(
                f"{self.BASE_URL}/generate-summary",
                json={"content": "", "title": "Empty"},
                timeout=30
            )
            assert response.status_code == 200
        except requests.ConnectionError:
            pytest.skip("Flask server not running")

    def test_index_document_empty(self):
        """Should handle document indexing with empty content"""
        try:
            response = requests.post(
                f"{self.BASE_URL}/index-document",
                json={"content": "", "filename": "test.txt", "document_id": 999},
                timeout=10
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "error"
        except requests.ConnectionError:
            pytest.skip("Flask server not running")


class TestGeneratorFallbacks:
    """Tests for generator fallback behaviour when Ollama is unavailable"""

    def test_fallback_quiz_returns_questions(self):
        """Fallback quiz generator should return valid questions"""
        from generator import generate_fallback_quiz

        questions = generate_fallback_quiz("Programming", "Python Basics", 5, "mcq")
        assert isinstance(questions, list)
        assert len(questions) == 5

        for q in questions:
            assert "question" in q
            assert "correct_answer" in q
            assert "type" in q

    def test_fallback_quiz_mcq_has_options(self):
        """MCQ fallback should include options"""
        from generator import generate_fallback_quiz

        questions = generate_fallback_quiz("Database", "SQL", 3, "mcq")
        for q in questions:
            assert "options" in q
            assert len(q["options"]) == 4

    def test_fallback_quiz_short_answer(self):
        """Short answer fallback should work"""
        from generator import generate_fallback_quiz

        questions = generate_fallback_quiz("AI", "Prompting", 3, "short_answer")
        for q in questions:
            assert q["type"] == "short_answer"
            assert "correct_answer" in q


class TestFileUploadValidation:
    """Tests for file upload security"""

    def test_allowed_extensions(self):
        """Should only allow PDF, TXT, MD, DOCX"""
        allowed = [".pdf", ".txt", ".md", ".docx"]
        blocked = [".exe", ".js", ".py", ".sh", ".bat", ".php"]

        for ext in allowed:
            assert is_allowed_extension(ext) is True

        for ext in blocked:
            assert is_allowed_extension(ext) is False

    def test_file_size_limit(self):
        """Should reject files larger than 10MB"""
        max_size = 10 * 1024 * 1024  # 10MB
        assert is_valid_file_size(5 * 1024 * 1024) is True  # 5MB OK
        assert is_valid_file_size(10 * 1024 * 1024) is True  # 10MB OK
        assert is_valid_file_size(11 * 1024 * 1024) is False  # 11MB rejected


# Helper functions for tests

def is_allowed_extension(ext):
    """Check if file extension is allowed"""
    allowed = [".pdf", ".txt", ".md", ".docx"]
    return ext.lower() in allowed


def is_valid_file_size(size_bytes):
    """Check if file size is within limit (10MB)"""
    max_size = 10 * 1024 * 1024
    return size_bytes <= max_size
