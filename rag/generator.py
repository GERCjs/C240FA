from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client()


def generate_answer(
    question: str,
    retrieved_chunks: list[str]
) -> str:

    context = "\n\n".join(retrieved_chunks)

    prompt = f"""
You are an educational learning assistant.

Student Question:
{question}

Retrieved Knowledge:
{context}

Instructions:
1. Answer based only on the retrieved knowledge.
2. Keep explanations beginner-friendly.
3. Give a simple example.
4. Give one key takeaway.
5. If information is missing, say so.

Response Format:

### Simple Explanation

### Example

### Key Takeaway
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text