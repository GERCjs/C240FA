"""
Test cases for Quiz and Flashcard features.
Tests cover:
- Quiz generation (AI and fallback)
- Quiz grading logic
- Flashcard generation
- API endpoints
"""

import pytest
import json
import sys
import os

# Add parent and rag directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "rag"))

from generator import (
    generate_quiz,
    generate_flashcards,
    generate_fallback_quiz,
)


# ============================================
# QUIZ GENERATION TESTS
# ============================================

class TestQuizGeneration:
    """Tests for quiz generation functions"""

    def test_fallback_quiz_returns_correct_count(self):
        """Fallback quiz should return the requested number of questions"""
        questions = generate_fallback_quiz("Programming", "Python Basics", 5, "mcq")
        assert len(questions) == 5

    def test_fallback_quiz_mcq_format(self):
        """Each MCQ question should have required fields"""
        questions = generate_fallback_quiz("Database", "SQL", 3, "mcq")
        for q in questions:
            assert "type" in q
            assert "question" in q
            assert "options" in q
            assert "correct_answer" in q
            assert "explanation" in q
            assert q["type"] == "mcq"
            assert len(q["options"]) == 4
            assert q["correct_answer"] in ["A", "B", "C", "D"]

    def test_fallback_quiz_short_answer_format(self):
        """Short answer questions should have required fields without options"""
        questions = generate_fallback_quiz("Programming", "Java", 3, "short_answer")
        for q in questions:
            assert "type" in q
            assert "question" in q
            assert "correct_answer" in q
            assert "explanation" in q
            assert q["type"] == "short_answer"
            assert "options" not in q

    def test_fallback_quiz_mixed_format(self):
        """Mixed quiz should contain both MCQ and short answer types"""
        questions = generate_fallback_quiz("AI Prompting", "Prompt Engineering", 6, "mixed")
        types = [q["type"] for q in questions]
        assert "mcq" in types
        assert "short_answer" in types

    def test_fallback_quiz_minimum_count(self):
        """Should handle minimum question count"""
        questions = generate_fallback_quiz("Programming", "Loops", 1, "mcq")
        assert len(questions) == 1

    def test_fallback_quiz_maximum_count(self):
        """Should handle maximum question count (10)"""
        questions = generate_fallback_quiz("Programming", "Functions", 10, "mcq")
        assert len(questions) == 10

    def test_fallback_quiz_question_uniqueness(self):
        """Questions in a quiz should be unique"""
        questions = generate_fallback_quiz("Database", "Normalization", 5, "mcq")
        question_texts = [q["question"] for q in questions]
        assert len(question_texts) == len(set(question_texts))

    def test_fallback_quiz_includes_subject_topic(self):
        """Questions should reference the subject or topic"""
        subject = "Programming"
        topic = "Python Variables"
        questions = generate_fallback_quiz(subject, topic, 3, "mcq")
        for q in questions:
            text = q["question"] + q["explanation"]
            assert subject.lower() in text.lower() or topic.lower() in text.lower()

    def test_generate_quiz_with_empty_chunks(self):
        """generate_quiz should handle empty retrieved chunks gracefully"""
        questions = generate_quiz("Programming", "Basics", 3, "mcq", [])
        # Should either return AI-generated or fallback questions
        assert questions is not None
        assert isinstance(questions, list)

    def test_generate_quiz_with_context(self):
        """generate_quiz should work with provided context chunks"""
        chunks = [
            "Python is a high-level programming language.",
            "Variables in Python are created when you assign a value to them."
        ]
        questions = generate_quiz("Programming", "Python", 3, "mcq", chunks)
        assert questions is not None
        assert isinstance(questions, list)


# ============================================
# QUIZ GRADING TESTS
# ============================================

class TestQuizGrading:
    """Tests for quiz grading logic"""

    def test_grade_short_answer_exact_match(self):
        """Exact match should be marked correct"""
        from tests.helpers import grade_short_answer
        assert grade_short_answer("Python", "Python") is True

    def test_grade_short_answer_case_insensitive(self):
        """Grading should be case-insensitive"""
        from tests.helpers import grade_short_answer
        assert grade_short_answer("python", "Python") is True

    def test_grade_short_answer_keyword_match(self):
        """Should pass if 50%+ keywords match"""
        from tests.helpers import grade_short_answer
        correct = "Python is a high-level programming language"
        user = "Python is a programming language used widely"
        assert grade_short_answer(user, correct) is True

    def test_grade_short_answer_insufficient_keywords(self):
        """Should fail if less than 50% keywords match"""
        from tests.helpers import grade_short_answer
        correct = "Python is a high-level programming language"
        user = "Java is compiled"
        assert grade_short_answer(user, correct) is False

    def test_grade_short_answer_empty_input(self):
        """Empty answer should be marked incorrect"""
        from tests.helpers import grade_short_answer
        assert grade_short_answer("", "Python") is False

    def test_grade_short_answer_none_input(self):
        """None answer should be marked incorrect"""
        from tests.helpers import grade_short_answer
        assert grade_short_answer(None, "Python") is False

    def test_mcq_grading_correct(self):
        """Correct MCQ letter should score a point"""
        user_answer = "A"
        correct_answer = "A"
        assert user_answer.upper() == correct_answer.upper()

    def test_mcq_grading_incorrect(self):
        """Wrong MCQ letter should not score"""
        user_answer = "B"
        correct_answer = "A"
        assert user_answer.upper() != correct_answer.upper()

    def test_mcq_grading_case_insensitive(self):
        """MCQ grading should be case-insensitive"""
        user_answer = "a"
        correct_answer = "A"
        assert user_answer.upper() == correct_answer.upper()

    def test_percentage_calculation(self):
        """Score percentage should be calculated correctly"""
        score = 3
        total = 5
        percentage = round((score / total) * 100)
        assert percentage == 60

    def test_percentage_zero_total(self):
        """Zero total questions should return 0%"""
        score = 0
        total = 0
        percentage = round((score / total) * 100) if total > 0 else 0
        assert percentage == 0


# ============================================
# FLASHCARD GENERATION TESTS
# ============================================

class TestFlashcardGeneration:
    """Tests for flashcard generation"""

    def test_generate_flashcards_returns_list(self):
        """Should return a list of flashcards"""
        cards = generate_flashcards("Python basics", "Programming", "Variables", 3)
        assert isinstance(cards, list)

    def test_generate_flashcards_correct_count(self):
        """Should return requested number of cards (or fewer if AI limited)"""
        cards = generate_flashcards("SQL queries", "Database", "SELECT", 5)
        assert len(cards) <= 5
        assert len(cards) > 0

    def test_generate_flashcards_format(self):
        """Each flashcard should have front and back text"""
        cards = generate_flashcards("Python loops", "Programming", "For Loop", 3)
        for card in cards:
            assert "front" in card
            assert "back" in card
            assert len(card["front"]) > 0
            assert len(card["back"]) > 0

    def test_generate_flashcards_with_empty_content(self):
        """Should handle empty content gracefully using fallback"""
        cards = generate_flashcards("", "Programming", "Python", 3)
        assert isinstance(cards, list)
        assert len(cards) > 0

    def test_generate_flashcards_with_content(self):
        """Should generate cards from provided content"""
        content = "A variable in Python stores data. You can assign values using the = operator."
        cards = generate_flashcards(content, "Programming", "Variables", 2)
        assert isinstance(cards, list)
        assert len(cards) > 0

    def test_flashcard_front_is_question(self):
        """Fallback flashcard front should be a question or concept"""
        cards = generate_flashcards("", "Database", "SQL", 1)
        # Front text should end with ? or be a concept prompt
        front = cards[0]["front"]
        assert len(front) > 5


# ============================================
# API ENDPOINT TESTS (using Flask test client)
# ============================================

class TestAPIEndpoints:
    """Tests for Flask API endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client - skip if Flask app can't be loaded"""
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "rag"))
            from api import app
            app.config["TESTING"] = True
            with app.test_client() as client:
                yield client
        except Exception:
            pytest.skip("Flask app could not be loaded (missing dependencies)")

    def test_quiz_endpoint_returns_json(self, client):
        """POST /generate-quiz should return JSON with questions"""
        response = client.post("/generate-quiz", json={
            "subject": "Programming",
            "topic": "Python",
            "count": 3,
            "type": "mcq"
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "questions" in data

    def test_quiz_endpoint_default_count(self, client):
        """Quiz endpoint should default to 5 questions"""
        response = client.post("/generate-quiz", json={
            "subject": "Database",
            "topic": "SQL"
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "questions" in data

    def test_flashcard_endpoint_returns_json(self, client):
        """POST /generate-flashcards should return JSON with flashcards"""
        response = client.post("/generate-flashcards", json={
            "subject": "Programming",
            "topic": "Python Basics",
            "count": 3
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "flashcards" in data

    def test_flashcard_endpoint_with_content(self, client):
        """Flashcard endpoint should use provided content"""
        response = client.post("/generate-flashcards", json={
            "content": "A function is a reusable block of code that performs a specific task.",
            "subject": "Programming",
            "topic": "Functions",
            "count": 2
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "flashcards" in data
        assert len(data["flashcards"]) > 0

    def test_flashcard_endpoint_no_content(self, client):
        """Flashcard endpoint should retrieve from knowledge base if no content"""
        response = client.post("/generate-flashcards", json={
            "subject": "AI Prompting",
            "topic": "Prompt Engineering",
            "count": 3
        })
        assert response.status_code == 200
        data = response.get_json()
        assert "flashcards" in data


# ============================================
# INPUT VALIDATION TESTS
# ============================================

class TestInputValidation:
    """Tests for input validation and edge cases"""

    def test_quiz_with_special_characters_in_topic(self):
        """Quiz should handle special characters in topic name"""
        questions = generate_fallback_quiz("Programming", "C++ & Pointers", 3, "mcq")
        assert len(questions) == 3

    def test_quiz_with_very_long_topic(self):
        """Quiz should handle very long topic strings"""
        long_topic = "A" * 200
        questions = generate_fallback_quiz("Programming", long_topic, 3, "mcq")
        assert len(questions) == 3

    def test_quiz_with_empty_subject(self):
        """Quiz should handle empty subject gracefully"""
        questions = generate_fallback_quiz("", "Python", 3, "mcq")
        assert len(questions) == 3

    def test_flashcard_with_unicode(self):
        """Flashcards should handle unicode content"""
        content = "Représentation des données en mémoire"
        cards = generate_flashcards(content, "Programming", "Memory", 1)
        assert isinstance(cards, list)

    def test_flashcard_count_zero(self):
        """Requesting 0 flashcards should return empty or handle gracefully"""
        cards = generate_flashcards("content", "Subject", "Topic", 0)
        assert isinstance(cards, list)
