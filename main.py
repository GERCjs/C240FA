from __future__ import annotations

from web.services.local_retrieval import find_relevant_chunks, load_knowledge_chunks


def detect_topic(question: str) -> dict:
    lower = question.lower()
    if any(phrase in lower for phrase in ["assignment answer", "give me the answer", "homework"]):
        return {
            "subject": "Programming",
            "topic": "Python Basics",
            "intent": "Direct Answer Request",
            "safety_status": "Academic Integrity Risk",
            "next_step": "Ethics Guidance",
        }
    if any(word in lower for word in ["prompt", "chatgpt", "hallucination"]):
        return {"subject": "AI / Prompt Engineering", "topic": "What is Prompting?", "next_step": "Retrieve Knowledge"}
    if any(word in lower for word in ["database", "sql", "table", "query"]):
        return {"subject": "Database", "topic": "SQL SELECT", "next_step": "Retrieve Knowledge"}
    return {"subject": "Programming", "topic": "Python Basics", "next_step": "Retrieve Knowledge"}


def build_learning_response(topic_output: dict, retrieved_chunks: list[dict]) -> str:
    if topic_output.get("next_step") == "Ethics Guidance":
        return (
            "Academic integrity guidance: I can help you understand the topic, "
            "but I should not provide direct assignment answers."
        )
    if not retrieved_chunks:
        return "I could not find enough useful information in the local knowledge base."
    chunk = retrieved_chunks[0]
    return (
        f"1. Direct explanation\n{chunk.get('explanation') or chunk.get('content')}\n\n"
        f"2. Simple example\nUse an example that matches {chunk.get('topic')}.\n\n"
        "3. Key takeaway\nExplain the concept in your own words and practise once."
    )


def main() -> None:
    question = input("Enter the student question: ")
    topic_output = detect_topic(question)
    print("\nTopic Detection Agent output:")
    print(topic_output)

    if topic_output.get("next_step") == "Ethics Guidance":
        print("\nFinal response:")
        print(build_learning_response(topic_output, []))
        return

    chunks = load_knowledge_chunks()
    retrieved = find_relevant_chunks(question, chunks, 3)
    print("\nKnowledge Retrieval Agent output:")
    for chunk in retrieved:
        print(f"- {chunk['chunk_id']} ({chunk['topic']}) score={chunk['relevance_score']}")

    print("\nFinal student response:")
    print(build_learning_response(topic_output, retrieved))


if __name__ == "__main__":
    main()
