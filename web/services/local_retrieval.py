from __future__ import annotations

import re
from pathlib import Path


KNOWLEDGE_FOLDER = Path(__file__).resolve().parents[2] / "knowledge_base"


def read_knowledge_files(folder: Path = KNOWLEDGE_FOLDER) -> list[str]:
    return [
        path.read_text(encoding="utf-8")
        for path in folder.iterdir()
        if path.suffix == ".txt"
    ]


def tokenize(text: str) -> list[str]:
    return re.findall(r"\b[a-z0-9]+\b", (text or "").lower())


def parse_chunks(text: str) -> list[dict]:
    raw_chunks = [
        chunk.strip()
        for chunk in re.split(r"(?=\[CHUNK_ID:\s*)", text)
        if chunk.strip()
    ]
    return [_parse_chunk(chunk) for chunk in raw_chunks]


def _field(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def _parse_chunk(chunk_text: str) -> dict:
    keywords = _field(r"^Keywords:\s*(.+)$", chunk_text)
    return {
        "chunk_id": _field(r"^\[CHUNK_ID:\s*(.+?)\]", chunk_text),
        "subject": _field(r"^Subject:\s*(.+)$", chunk_text),
        "topic": _field(r"^Topic:\s*(.+)$", chunk_text),
        "keywords": [word.strip() for word in re.split(r",\s*", keywords) if word.strip()],
        "difficulty": _field(r"^Difficulty:\s*(.+)$", chunk_text),
        "explanation": _field(r"^Explanation:\s*(.+)$", chunk_text),
        "usefulFor": _field(r"^Useful For:\s*(.+)$", chunk_text),
        "content": chunk_text,
    }


def load_knowledge_chunks() -> list[dict]:
    chunks: list[dict] = []
    for text in read_knowledge_files():
        chunks.extend(parse_chunks(text))
    return chunks


def build_index(chunks: list[dict]) -> list[dict]:
    indexed = []
    for chunk in chunks:
        keyword_terms = []
        for keyword in chunk.get("keywords", []):
            keyword_terms.extend(tokenize(keyword))
        terms = set(
            tokenize(chunk.get("topic", ""))
            + tokenize(chunk.get("explanation", ""))
            + tokenize(chunk.get("usefulFor", ""))
            + keyword_terms
        )
        indexed.append({**chunk, "searchTerms": list(terms)})
    return indexed


def count_matches(question: str, chunk: dict) -> dict:
    question_tokens = set(tokenize(question))
    matched_keywords = []
    score = 0
    question_lower = (question or "").lower()

    for keyword in chunk.get("keywords", []):
        keyword_lower = keyword.lower()
        if keyword_lower and keyword_lower in question_lower:
            matched_keywords.append(keyword)
            score += 2

    topic = chunk.get("topic", "")
    if topic and topic.lower() in question_lower:
        if topic not in matched_keywords:
            matched_keywords.append(topic)
        score += 2

    for term in chunk.get("searchTerms", []):
        if term in question_tokens and term not in matched_keywords:
            matched_keywords.append(term)
            score += 1

    return {"score": score, "matched_keywords": matched_keywords}


def find_relevant_chunks(question: str, chunks: list[dict], limit: int = 3) -> list[dict]:
    scored = []
    for chunk in build_index(chunks):
        matches = count_matches(question, chunk)
        scored.append(
            {
                "chunk_id": chunk.get("chunk_id", ""),
                "subject": chunk.get("subject", ""),
                "topic": chunk.get("topic", ""),
                "difficulty": chunk.get("difficulty", ""),
                "explanation": chunk.get("explanation", ""),
                "relevance_score": matches["score"],
                "matched_keywords": matches["matched_keywords"],
                "content": chunk.get("content", ""),
            }
        )
    return sorted(
        [item for item in scored if item["relevance_score"] > 0],
        key=lambda item: item["relevance_score"],
        reverse=True,
    )[:limit]
