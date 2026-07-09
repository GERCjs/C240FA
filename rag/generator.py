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
        type_instruction = "Generate multiple choice questions with 4 options (A, B, C, D). The correct_answer should be the letter (A/B/C/D). Each question MUST test a DIFFERENT concept or aspect of the topic."
    elif quiz_type == "short_answer":
        type_instruction = "Generate short answer questions. The correct_answer should be a brief text answer. Each question MUST ask about a DIFFERENT aspect of the topic."
    else:
        type_instruction = "Generate a mix of MCQ and short answer questions. Each question MUST be unique and test a different concept."

    prompt = f"""Generate {count} UNIQUE and DIVERSE quiz questions about {subject} - {topic}.
{type_instruction}

IMPORTANT RULES:
- Each question must test a DIFFERENT concept, fact, or skill
- Do NOT repeat similar questions with minor wording changes
- Include questions about: definitions, examples, common mistakes, practical applications, and comparisons
- Make questions specific and educational, not generic

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

Generate {count} UNIQUE questions now:"""

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
                # Deduplicate questions
                seen = set()
                unique_questions = []
                for q in questions:
                    q_text = q.get("question", "").lower().strip()[:50]
                    if q_text not in seen:
                        seen.add(q_text)
                        unique_questions.append(q)
                return unique_questions[:count]
        except (json.JSONDecodeError, IndexError) as e:
            print(f"Quiz parse error: {e}")

    # Fallback questions
    return generate_fallback_quiz(subject, topic, count, quiz_type)


def generate_summary(content, title):
    """Generate a study summary from document content"""
    prompt = f"""Summarize the following study material into concise revision notes.
Focus on the MAIN CONCEPTS, KEY IDEAS, and IMPORTANT INFORMATION.
Do NOT summarize headers, footers, page numbers, or document metadata.
Extract the actual educational content and create a meaningful summary.

Include key points as a bullet list that covers:
- Main concepts explained
- Important definitions
- Key relationships between ideas
- Practical applications mentioned

Document: {title}
Content:
{content[:4000]}

Return a JSON object with this format (no markdown):
{{
  "summary": "A clear, meaningful summary of the educational content covering the main topics and concepts explained in the document...",
  "key_points": ["Main concept 1 explained clearly", "Main concept 2 with definition", "Important relationship or application", "Key takeaway for students"]
}}"""

    response = call_deepseek(prompt)
    if response:
        try:
            json_str = response
            start = json_str.find("{")
            end = json_str.rfind("}") + 1
            if start >= 0 and end > start:
                result = json.loads(json_str[start:end])
                # Validate the summary is meaningful (not just headers)
                if len(result.get("summary", "")) > 50:
                    return result
        except (json.JSONDecodeError, IndexError):
            pass

    # Fallback - extract meaningful sentences
    sentences = [s.strip() for s in content.split(".") if len(s.strip()) > 30]
    # Filter out non-content sentences
    meaningful = [s for s in sentences if any(kw in s.lower() for kw in
        ["is", "are", "means", "used", "helps", "allows", "provides", "involves", "defined", "refers"])]

    if not meaningful:
        meaningful = sentences[:8]

    summary_text = ". ".join(meaningful[:6]).strip() + "."
    key_points = meaningful[:5]

    return {
        "summary": summary_text if len(summary_text) > 50 else f"This document covers {title} with key concepts and explanations for student learning.",
        "key_points": key_points if key_points else ["Document contains study material for review"]
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
    """Generate diverse fallback quiz questions when AI is unavailable"""
    questions = []

    # Different question templates for variety
    mcq_templates = [
        {
            "question": f"What is the correct definition of {topic} in {subject}?",
            "options": [
                f"A core concept in {subject} that helps structure and organize work",
                "A hardware specification used in network devices",
                "A deprecated method no longer used in modern systems",
                "An advanced concept only used in enterprise applications"
            ],
            "explanation": f"{topic} is a fundamental concept in {subject}."
        },
        {
            "question": f"What is the primary purpose of {topic}?",
            "options": [
                f"To enable efficient implementation of {subject} principles",
                "To replace all manual testing processes",
                "To manage physical server infrastructure only",
                "To encrypt user data automatically"
            ],
            "explanation": f"{topic} serves an important functional role in {subject}."
        },
        {
            "question": f"Which statement about {topic} is TRUE?",
            "options": [
                f"It is widely used in {subject} for practical applications",
                "It was created in 2024 and has no documentation yet",
                "It only works on Windows operating systems",
                "It requires a paid license to use"
            ],
            "explanation": f"{topic} is an established concept in {subject}."
        },
        {
            "question": f"What common mistake should you avoid when working with {topic}?",
            "options": [
                f"Not understanding the basics before attempting advanced usage",
                "Reading too much documentation",
                "Using the official tools provided",
                "Following best practices from experts"
            ],
            "explanation": f"Understanding fundamentals of {topic} prevents common errors."
        },
        {
            "question": f"In what context is {topic} most commonly applied in {subject}?",
            "options": [
                f"When building or working with {subject} projects and assignments",
                "Only during final examinations",
                "Exclusively in research laboratories",
                "Only when using expensive commercial tools"
            ],
            "explanation": f"{topic} is applied in everyday {subject} work."
        },
        {
            "question": f"How does {topic} relate to other concepts in {subject}?",
            "options": [
                f"It builds on foundational {subject} principles and connects to related topics",
                "It is completely independent and unrelated to everything else",
                "It replaces all other concepts once learned",
                "It conflicts with modern approaches"
            ],
            "explanation": f"Concepts in {subject} are interconnected."
        },
        {
            "question": f"What would happen if you ignored {topic} when working in {subject}?",
            "options": [
                f"Your work would lack proper structure and may contain errors",
                "Nothing would change at all",
                "Your code would run faster",
                "You would automatically get better results"
            ],
            "explanation": f"Understanding {topic} is important for quality work in {subject}."
        },
        {
            "question": f"Which skill does understanding {topic} help develop?",
            "options": [
                f"Problem-solving and critical thinking in {subject}",
                "Physical fitness and coordination",
                "Artistic drawing abilities",
                "Musical composition skills"
            ],
            "explanation": f"{topic} develops analytical skills relevant to {subject}."
        },
        {
            "question": f"What is the best way to learn {topic} in {subject}?",
            "options": [
                "Practice with examples and review mistakes",
                "Memorize everything without understanding",
                "Skip it entirely and move to advanced topics",
                "Only read about it once before the exam"
            ],
            "explanation": f"Active practice is the best way to master {topic}."
        },
        {
            "question": f"Why is {topic} taught as part of {subject} curriculum?",
            "options": [
                f"Because it provides essential skills needed in real-world {subject} applications",
                "Because there is nothing else to teach",
                "Because it is the easiest topic available",
                "Because it was randomly selected"
            ],
            "explanation": f"{topic} is included because of its practical importance."
        }
    ]

    short_answer_templates = [
        {
            "question": f"Explain what {topic} means in the context of {subject}.",
            "correct_answer": f"{topic} is a fundamental concept in {subject} that involves understanding and applying key principles to solve problems effectively.",
            "explanation": f"This tests your understanding of {topic}."
        },
        {
            "question": f"Give a practical example of how {topic} is used in {subject}.",
            "correct_answer": f"{topic} is used in {subject} when you need to implement solutions, such as writing code, designing systems, or solving problems.",
            "explanation": f"Practical examples help demonstrate understanding of {topic}."
        },
        {
            "question": f"What common mistake should you avoid when working with {topic}?",
            "correct_answer": f"A common mistake is not understanding the basics of {topic} before moving to complex applications, which leads to errors.",
            "explanation": f"Awareness of pitfalls helps you avoid them."
        },
        {
            "question": f"Why is {topic} important for students studying {subject}?",
            "correct_answer": f"{topic} is important because it provides foundational knowledge needed for advanced topics and real-world applications in {subject}.",
            "explanation": f"Understanding importance motivates deeper learning."
        },
        {
            "question": f"How would you explain {topic} to someone who has never studied {subject}?",
            "correct_answer": f"{topic} is like a building block in {subject} - it gives you the basic tools and understanding needed to work with more complex ideas.",
            "explanation": f"Being able to explain simply shows deep understanding."
        }
    ]

    import random
    random.shuffle(mcq_templates)
    random.shuffle(short_answer_templates)

    for i in range(count):
        if quiz_type == "short_answer":
            template = short_answer_templates[i % len(short_answer_templates)]
            questions.append({
                "type": "short_answer",
                "question": template["question"],
                "correct_answer": template["correct_answer"],
                "explanation": template["explanation"]
            })
        elif quiz_type == "mixed":
            if i % 2 == 0:
                template = mcq_templates[i % len(mcq_templates)]
                questions.append({
                    "type": "mcq",
                    "question": template["question"],
                    "options": template["options"],
                    "correct_answer": "A",
                    "explanation": template["explanation"]
                })
            else:
                template = short_answer_templates[i % len(short_answer_templates)]
                questions.append({
                    "type": "short_answer",
                    "question": template["question"],
                    "correct_answer": template["correct_answer"],
                    "explanation": template["explanation"]
                })
        else:
            template = mcq_templates[i % len(mcq_templates)]
            questions.append({
                "type": "mcq",
                "question": template["question"],
                "options": template["options"],
                "correct_answer": "A",
                "explanation": template["explanation"]
            })

    return questions
