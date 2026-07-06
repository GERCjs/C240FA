import chromadb
import re

from chunking import load_documents
from embedding import embed_chunk

# Create ChromaDB client
client = chromadb.EphemeralClient()

# Create collection
collection = client.get_or_create_collection(
    name="student_knowledge"
)

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "can",
    "do",
    "does",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
}

FIELD_WEIGHT = 2.0
BODY_WEIGHT = 1.0
SEMANTIC_WEIGHT = 0.75
KEYWORD_WEIGHT = 0.25


def save_embeddings(chunks, embeddings):

    for i, (chunk, embedding) in enumerate(
        zip(chunks, embeddings)
    ):

        collection.add(
            documents=[chunk],
            embeddings=[embedding],
            ids=[str(i)]
        )


def retrieve(query, top_k=3):

    query_embedding = embed_chunk(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    return results["documents"][0]


def retrieve_ranked(query, top_k=2, candidate_k=None):
    """Retrieve a wider candidate set and rerank chunks for AI chat."""

    if top_k <= 0:
        return []

    total_chunks = collection.count()
    if total_chunks == 0:
        return []

    candidate_count = candidate_k or max(top_k * 4, 8)
    candidate_count = min(candidate_count, total_chunks)

    query_embedding = embed_chunk(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=candidate_count,
        include=["documents", "distances"]
    )

    documents = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]

    ranked = []
    for index, chunk in enumerate(documents):
        distance = distances[index] if index < len(distances) else 0
        semantic_score = 1 / (1 + distance)
        keyword_score = _keyword_score(query, chunk)
        final_score = (
            SEMANTIC_WEIGHT * semantic_score
            + KEYWORD_WEIGHT * keyword_score
        )

        ranked.append(
            {
                "chunk": chunk,
                "score": final_score,
                "index": index
            }
        )

    ranked.sort(key=lambda item: (-item["score"], item["index"]))

    return [item["chunk"] for item in ranked[:top_k]]


def _keyword_score(query, chunk):
    query_tokens = _tokenize(query)
    if not query_tokens:
        return 0

    priority_text = _extract_priority_text(chunk)
    priority_tokens = _tokenize(priority_text)
    body_tokens = _tokenize(chunk)

    matched_weight = 0
    max_weight = len(query_tokens) * FIELD_WEIGHT

    for token in query_tokens:
        if token in priority_tokens:
            matched_weight += FIELD_WEIGHT
        elif token in body_tokens:
            matched_weight += BODY_WEIGHT

    return matched_weight / max_weight


def _extract_priority_text(chunk):
    priority_lines = []

    for line in chunk.splitlines():
        if re.match(r"^(Subject|Topic|Keywords):", line, re.IGNORECASE):
            priority_lines.append(line)

    return "\n".join(priority_lines)


def _tokenize(text):
    tokens = set()

    for token in re.findall(r"[a-z0-9]+", text.lower()):
        if token in STOPWORDS or len(token) <= 1:
            continue

        tokens.add(token)

        if len(token) > 3 and token.endswith("s"):
            tokens.add(token[:-1])

    return tokens


if __name__ == "__main__":

    print("Loading knowledge base...")

    chunks = load_documents()

    print(f"Loaded {len(chunks)} chunks")

    print("Generating embeddings...")

    embeddings = [
        embed_chunk(chunk)
        for chunk in chunks
    ]

    print(f"Generated {len(embeddings)} embeddings")

    print("Saving embeddings to ChromaDB...")

    save_embeddings(
        chunks,
        embeddings
    )

    print("Vector database ready!\n")

    query = input(
        "Enter your question: "
    )

    results = retrieve(
        query,
        top_k=3
    )

    print("\nTop Retrieved Chunks:\n")

    for i, chunk in enumerate(results):

        print("=" * 80)

        print(f"Result {i + 1}")

        print("=" * 80)

        print(chunk)

        print()
