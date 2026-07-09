"""
Helper functions extracted from Node.js controllers for Python testing.
These replicate the grading logic from quizController.js.
"""


def grade_short_answer(user_answer, correct_answer):
    """
    Grade a short answer using keyword matching (50% threshold).
    Mirrors the gradeShortAnswer function in quizController.js.
    """
    if not user_answer or not correct_answer:
        return False

    user_lower = user_answer.lower().strip()
    correct_lower = correct_answer.lower().strip()

    # Exact match
    if user_lower == correct_lower:
        return True

    # Keyword matching: at least 50% of keywords present
    import re
    correct_keywords = [w for w in re.split(r'[\s,;.]+', correct_lower) if len(w) > 2]
    user_words = re.split(r'[\s,;.]+', user_lower)

    if not correct_keywords:
        return False

    matches = [
        kw for kw in correct_keywords
        if any(kw in word or word in kw for word in user_words)
    ]

    import math
    return len(matches) >= math.ceil(len(correct_keywords) * 0.5)
