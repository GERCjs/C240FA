from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

def embed_chunk(chunk: str):

    embedding = embedding_model.encode(
        chunk,
        normalize_embeddings=True
    )

    return embedding.tolist()


if __name__ == "__main__":

    embedding = embed_chunk(
        "What is a database?"
    )

    print("Vector Length:", len(embedding))

    print(embedding[:10])