import chromadb

from chunking import load_documents
from embedding import embed_chunk

# Create ChromaDB client
client = chromadb.EphemeralClient()

# Create collection
collection = client.get_or_create_collection(
    name="student_knowledge"
)


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