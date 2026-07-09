import json
import os

try:
    from dotenv import load_dotenv
    from openai import OpenAI
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
except ImportError:
    pass


client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url=os.getenv("OPENROUTER_BASE_URL")
)

MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "deepseek/deepseek-v4-flash"
)


def call_deepseek(prompt):
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenRouter Error: {e}")
        return None


def generate_answer(question, retrieved_chunks, context=""):
    """Generate an answer using retrieved context and conversation history"""
    chunk_context = "\n".join(retrieved_chunks)

    conversation = ""
    if context:
        conversation = f"\nConversation history:\n{context}\n"

    prompt = f"""You are a helpful AI study assistant for polytechnic students.
Use the following knowledge base content to answer the question.
If the content does not contain the answer, say so honestly.
Always cite which source you used when applicable.
Keep explanations simple and beginner-friendly.
Answer in 4 to 6 short sentences unless the student asks for more detail.
{conversation}
Knowledge Base Content:
{chunk_context}

Student Question:
{question}

Answer (be clear, structured, and helpful):"""

    answer = call_deepseek(prompt)
    if answer:
        return answer
    return "I'm sorry, I couldn't generate a response. Please make sure the AI service is running."


def generate_quiz(subject, topic, count, quiz_type, retrieved_chunks):
    """Generate quiz questions from topic content"""
    context = "\n".join(retrieved_chunks) if retrieved_chunks else ""

    type_instruction = ""
    if quiz_type == "mcq":
        type_instruction = "Generate multiple choice questions with 4 options (A, B, C, D). The correct_answer should be the letter (A/B/C/D)."
    elif quiz_type == "short_answer":
        type_instruction = "Generate short answer questions. The correct_answer should be a brief text answer."
    else:
        type_instruction = "Generate a mix of MCQ and short answer questions."

    prompt = f"""Generate {count} quiz questions about {subject} - {topic}.
{type_instruction}

Use this context for question content:
{context}

Return ONLY valid JSON array. No markdown, no explanation. Format:
[
  {{
    "type": "mcq",
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "A",
    "explanation": "Brief explanation"
  }}
]

For short_answer type, omit the "options" field and set correct_answer to the text answer.

Generate {count} questions now:"""

    response = call_deepseek(prompt)
    if response:
        try:
            # Try to extract JSON from response
            json_str = response
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            # Find the array
            start = json_str.find("[")
            end = json_str.rfind("]") + 1
            if start >= 0 and end > start:
                json_str = json_str[start:end]
                questions = json.loads(json_str)
                return questions[:count]
        except (json.JSONDecodeError, IndexError) as e:
            print(f"Quiz parse error: {e}")

    # Fallback questions
    return generate_fallback_quiz(subject, topic, count, quiz_type)


def generate_summary(content, title):
    """Generate a study summary from document content"""
    prompt = f"""Summarize the following study material into concise revision notes.
Include key points as a bullet list.

Document: {title}
Content:
{content[:3000]}

Return a JSON object with this format (no markdown):
{{
  "summary": "A clear, concise summary paragraph...",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}}"""

    response = call_deepseek(prompt)
    if response:
        try:
            json_str = response
            start = json_str.find("{")
            end = json_str.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(json_str[start:end])
        except (json.JSONDecodeError, IndexError):
            pass

    # Fallback
    sentences = content.split(".")[:5]
    return {
        "summary": ". ".join(s.strip() for s in sentences if s.strip()) + ".",
        "key_points": [s.strip() for s in sentences[:3] if s.strip()]
    }


def generate_flashcards(content, subject, topic, count):
    """Generate flashcards from content"""
    prompt = f"""Create {count} study flashcards for {subject} - {topic}.
Use this content:
{content[:2000]}

Return ONLY a valid JSON array (no markdown):
[
  {{
    "front": "Question or concept on front of card",
    "back": "Answer or explanation on back of card"
  }}
]

Generate {count} flashcards now:"""

    response = call_deepseek(prompt)
    if response:
        try:
            json_str = response
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            start = json_str.find("[")
            end = json_str.rfind("]") + 1
            if start >= 0 and end > start:
                cards = json.loads(json_str[start:end])
                return cards[:count]
        except (json.JSONDecodeError, IndexError):
            pass

    # Fallback
    return [
        {"front": f"What is {topic}?", "back": f"{topic} is a concept in {subject}."}
        for _ in range(min(count, 3))
    ]


def generate_study_plan(title, module, description, days_remaining, priority):
    """Generate a study plan for an assignment"""
    prompt = f"""Create a day-by-day study plan for this assignment:
Title: {title}
Module: {module}
Description: {description}
Days remaining: {days_remaining}
Priority: {priority}

Keep the plan practical and specific. Use this format:
Day 1: [specific task]
Day 2: [specific task]
...

Study plan:"""

    response = call_deepseek(prompt)
    if response:
        return response

    # Fallback plan
    if days_remaining <= 1:
        return f"Day 1: Complete all sections of '{title}' and submit."
    elif days_remaining <= 3:
        return (
            f"Day 1: Research and outline '{title}'.\n"
            f"Day 2: Write main content.\n"
            f"Day 3: Review, proofread, and submit."
        )
    else:
        return (
            f"Days 1-{days_remaining // 3}: Research '{title}' for {module}.\n"
            f"Days {days_remaining // 3 + 1}-{2 * days_remaining // 3}: Complete main work.\n"
            f"Days {2 * days_remaining // 3 + 1}-{days_remaining}: Review and submit."
        )


def generate_fallback_quiz(subject, topic, count, quiz_type):
    """Generate basic quiz questions as fallback"""
    questions = []
    for i in range(count):
        if quiz_type == "short_answer":
            questions.append({
                "type": "short_answer",
                "question": f"Explain the concept of {topic} in {subject} in your own words.",
                "correct_answer": f"{topic} is a fundamental concept in {subject}.",
                "explanation": f"This tests your understanding of {topic}."
            })
        else:
            questions.append({
                "type": "mcq",
                "question": f"Which of the following best describes {topic} in {subject}?",
                "options": [
                    f"A core concept in {subject}",
                    "A networking protocol",
                    "A hardware component",
                    "None of the above"
                ],
                "correct_answer": "A",
                "explanation": f"{topic} is indeed a core concept in {subject}."
            })
    return questions
