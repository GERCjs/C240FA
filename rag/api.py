from flask import Flask
from flask import request
from flask import jsonify
from chunking import load_documents
from embedding import embed_chunk
from retrieval import save_embeddings

from retrieval import retrieve
from generator import generate_answer

app = Flask(__name__)

@app.route("/chat", methods=["POST"])
def chat():

    data = request.json

    question = data["question"]

    print("Question:", question)

    retrieved_chunks = retrieve(
        question,
        top_k=3
    )

    print("Retrieved:", len(retrieved_chunks))

    answer = generate_answer(
        question,
        retrieved_chunks
    )

    print("Answer:", answer)

    return jsonify({
        "answer": answer
    })

chunks = load_documents()

embeddings = [
    embed_chunk(chunk)
    for chunk in chunks
]

save_embeddings(
    chunks,
    embeddings
)

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )