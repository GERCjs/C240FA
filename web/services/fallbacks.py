from __future__ import annotations

from web.services.local_retrieval import find_relevant_chunks, load_knowledge_chunks


def generate_basic_plan(assignment: dict, days_remaining: int) -> str:
    steps = []
    title = assignment.get("title", "this assignment")
    if days_remaining <= 0:
        steps.append("This assignment is overdue. Focus on completing it immediately.")
        steps.append("Day 1: Review requirements and outline key sections.")
        steps.append("Day 2: Complete the main content and submit.")
    elif days_remaining <= 3:
        steps.append("Day 1: Review all requirements and gather materials.")
        steps.append("Day 2: Draft and complete the main work.")
        steps.append("Day 3: Review, proofread, and submit.")
    else:
        research_days = max(1, round(days_remaining * 0.2))
        work_days = max(1, round(days_remaining * 0.5))
        review_start = research_days + work_days + 1
        steps.append(f'Days 1-{research_days}: Research and gather resources for "{title}".')
        steps.append(
            f"Days {research_days + 1}-{research_days + work_days}: Work on the main content."
        )
        steps.append(f"Days {review_start}-{days_remaining}: Review, refine, and submit.")
    return "\n".join(steps)


def generate_local_quiz(subject: str, topic: str, count: int, quiz_type: str) -> list[dict]:
    chunks = load_knowledge_chunks()
    relevant = find_relevant_chunks(f"{subject} {topic}", chunks, 3)
    questions = []

    for chunk in relevant:
        if len(questions) >= count:
            break
        if quiz_type in {"mcq", "mixed"}:
            questions.append(
                {
                    "type": "mcq",
                    "question": f'What is the main concept of "{chunk["topic"]}"?',
                    "options": [
                        chunk.get("explanation") or "Correct answer",
                        "An unrelated database concept",
                        "A networking protocol",
                        "A hardware component",
                    ],
                    "correct_answer": "A",
                    "explanation": chunk.get("explanation") or f'This relates to {chunk["topic"]}.',
                }
            )
        if quiz_type in {"short_answer", "mixed"} and len(questions) < count:
            questions.append(
                {
                    "type": "short_answer",
                    "question": f'Explain in your own words: {chunk["topic"]}',
                    "correct_answer": chunk.get("explanation") or chunk["topic"],
                    "explanation": chunk.get("explanation") or f'Key concept: {chunk["topic"]}',
                }
            )

    while len(questions) < count:
        if quiz_type == "short_answer":
            questions.append(
                {
                    "type": "short_answer",
                    "question": f"What do you know about {topic} in {subject}?",
                    "correct_answer": f"{topic} is a concept in {subject}",
                    "explanation": f"{topic} is a fundamental concept in {subject}.",
                }
            )
        else:
            questions.append(
                {
                    "type": "mcq",
                    "question": f"What do you know about {topic} in {subject}?",
                    "options": [
                        f"A concept in {subject}",
                        "Not related",
                        "Unknown term",
                        "None of the above",
                    ],
                    "correct_answer": "A",
                    "explanation": f"{topic} is a fundamental concept in {subject}.",
                }
            )

    return questions[:count]


def generate_local_summary(content: str, title: str) -> dict:
    sentences = [
        sentence.strip()
        for sentence in __import__("re").split(r"[.!?]+", content or "")
        if len(sentence.strip()) > 20
    ]
    key_points = sentences[:5]
    summary = ". ".join(sentences[:10]).strip()
    if summary:
        summary += "."
    return {
        "summary": summary if len(summary) > 100 else f"Summary of {title}: {(content or '')[:500]}",
        "key_points": key_points or ["Document content extracted for review"],
    }


def generate_local_flashcards(subject: str, topic: str, count: int = 5) -> list[dict]:
    chunks = load_knowledge_chunks()
    relevant = find_relevant_chunks(f"{subject} {topic}", chunks, count)
    return [
        {
            "subject": chunk.get("subject") or subject,
            "topic": chunk.get("topic") or topic,
            "front": f'What is {chunk.get("topic") or topic}?',
            "back": chunk.get("explanation") or chunk.get("content", "")[:200],
        }
        for chunk in relevant
    ]
