import requests

def generate_answer(
    question,
    retrieved_chunks
):

    context = "\n".join(
        retrieved_chunks
    )

    prompt = f"""
You are a helpful learning assistant.

Context:
{context}

Question:
{question}

Answer:
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen3:8b",
            "prompt": prompt,
            "stream": False
        }
    )

    return response.json()["response"]