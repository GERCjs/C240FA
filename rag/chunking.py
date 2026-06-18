from typing import List
import os
import re

KNOWLEDGE_BASE = "knowledge_base"


def load_documents() -> List[str]:

    chunks = []

    for filename in os.listdir(KNOWLEDGE_BASE):

        if filename.endswith(".txt"):

            filepath = os.path.join(
                KNOWLEDGE_BASE,
                filename
            )

            with open(
                filepath,
                "r",
                encoding="utf-8"
            ) as file:

                content = file.read()

                file_chunks = re.split(
                    r"(?=\[CHUNK_ID:)",
                    content
                )

                file_chunks = [
                    chunk.strip()
                    for chunk in file_chunks
                    if chunk.strip()
                ]

                chunks.extend(file_chunks)

    return chunks


if __name__ == "__main__":

    chunks = load_documents()

    print("Total Chunks:", len(chunks))

    print("\nFirst Chunk:\n")

    print(chunks[0])