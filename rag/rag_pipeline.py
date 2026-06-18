from chunking import load_documents
from embedding import embed_chunk
from retrieval import save_embeddings
from retrieval import retrieve
from generator import generate_answer


def build_vector_store():

    print("Loading knowledge base...")

    chunks = load_documents()

    print(f"Loaded {len(chunks)} chunks")

    print("Generating embeddings...")

    embeddings = [
        embed_chunk(chunk)
        for chunk in chunks
    ]

    save_embeddings(
        chunks,
        embeddings
    )

    print("Vector store ready!")

    return chunks


def main():

    build_vector_store()

    while True:

        question = input(
            "\nAsk a question (or type exit): "
        )

        if question.lower() == "exit":
            break

        retrieved_chunks = retrieve(
            question,
            top_k=3
        )

        # Debug Output
        print("\nRetrieved Chunks:\n")

        for chunk in retrieved_chunks:
            print(chunk[:300])  # Only show the first 300 characters of each chunk
            print("-" * 50)

        answer = generate_answer(
            question,
            retrieved_chunks
        )

        print("\n" + "=" * 80)
        print("AI Answer")
        print("=" * 80)
        print(answer)


if __name__ == "__main__":
    main()