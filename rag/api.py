from flask import Flask, request, jsonify
from flask_cors import CORS
from chunking import load_documents
from embedding import embed_chunk
from retrieval import save_embeddings, retrieve
from generator import generate_answer, generate_quiz, generate_summary, generate_flashcards, generate_study_plan

app = Flask(__name__)
CORS(app)

# =====================
# CHAT ENDPOINT
# =====================

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    question = data.get("question", "")
    context = data.get("context", "")

    if not question:
        return jsonify({"answer": "Please provide a question.", "sources": []})

    print("Question:", question)

    # Retrieve relevant chunks
    retrieved_chunks = retrieve(question, top_k=3)
    print("Retrieved:", len(retrieved_chunks))

    # Extract source names from chunks
    sources = []
    for chunk in retrieved_chunks:
        if "[CHUNK_ID:" in chunk:
            chunk_id = chunk.split("[CHUNK_ID:")[1].split("]")[0].strip()
            sources.append(chunk_id)

    # Generate answer with conversation context
    answer = generate_answer(question, retrieved_chunks, context)
    print("Answer generated successfully")

    return jsonify({
        "answer": answer,
        "sources": sources
    })


# =====================
# DOCUMENT INDEXING
# =====================

@app.route("/index-document", methods=["POST"])
def index_document():
    data = request.json
    content = data.get("content", "")
    filename = data.get("filename", "")
    document_id = data.get("document_id", 0)

    if not content:
        return jsonify({"status": "error", "message": "No content provided"})

    # Split content into chunks
    chunks = split_content(content, filename)

    # Generate and save embeddings
    embeddings = [embed_chunk(chunk) for chunk in chunks]
    save_embeddings(chunks, embeddings)

    return jsonify({
        "status": "success",
        "chunks_indexed": len(chunks)
    })


# =====================
# QUIZ GENERATION
# =====================

@app.route("/generate-quiz", methods=["POST"])
def quiz():
    data = request.json
    subject = data.get("subject", "")
    topic = data.get("topic", "")
    count = data.get("count", 5)
    quiz_type = data.get("type", "mcq")

    # Retrieve relevant content for quiz generation
    query = f"{subject} {topic}"
    retrieved_chunks = retrieve(query, top_k=3)

    questions = generate_quiz(subject, topic, count, quiz_type, retrieved_chunks)

    return jsonify({"questions": questions})


# =====================
# SUMMARY GENERATION
# =====================

@app.route("/generate-summary", methods=["POST"])
def summary():
    data = request.json
    content = data.get("content", "")
    title = data.get("title", "Document")

    result = generate_summary(content, title)

    return jsonify(result)


# =====================
# FLASHCARD GENERATION
# =====================

@app.route("/generate-flashcards", methods=["POST"])
def flashcards():
    data = request.json
    content = data.get("content", "")
    subject = data.get("subject", "General")
    topic = data.get("topic", "Study Notes")
    count = data.get("count", 5)

    # If no content, retrieve from knowledge base
    if not content:
        query = f"{subject} {topic}"
        retrieved = retrieve(query, top_k=3)
        content = "\n".join(retrieved)

    cards = generate_flashcards(content, subject, topic, count)

    return jsonify({"flashcards": cards})


# =====================
# STUDY PLAN GENERATION
# =====================

@app.route("/generate-plan", methods=["POST"])
def plan():
    data = request.json
    title = data.get("title", "")
    module = data.get("module", "")
    description = data.get("description", "")
    days_remaining = data.get("days_remaining", 7)
    priority = data.get("priority", "medium")

    plan_text = generate_study_plan(title, module, description, days_remaining, priority)

    return jsonify({"plan": plan_text})


# =====================
# HELPERS
# =====================

def split_content(content, filename):
    """Split uploaded document content into chunks"""
    # Split by paragraphs or fixed size
    paragraphs = content.split("\n\n")
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current_chunk) + len(para) > 500:
            if current_chunk:
                chunks.append(f"[Source: {filename}]\n{current_chunk}")
            current_chunk = para
        else:
            current_chunk += "\n" + para if current_chunk else para

    if current_chunk:
        chunks.append(f"[Source: {filename}]\n{current_chunk}")

    return chunks if chunks else [f"[Source: {filename}]\n{content[:500]}"]


# =====================
# STARTUP
# =====================

print("Loading knowledge base...")
chunks = load_documents()
print(f"Loaded {len(chunks)} chunks")

print("Generating embeddings...")
embeddings = [embed_chunk(chunk) for chunk in chunks]

save_embeddings(chunks, embeddings)
print("Vector store ready!")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
