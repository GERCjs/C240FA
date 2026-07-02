from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
ALLOWED_MIMES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def allowed_file(file: FileStorage) -> bool:
    extension = Path(file.filename or "").suffix.lower()
    return extension in ALLOWED_EXTENSIONS or file.mimetype in ALLOWED_MIMES


def save_upload(file: FileStorage) -> tuple[str, Path, int]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    original = secure_filename(file.filename or "document")
    extension = Path(original).suffix.lower()
    filename = f"{uuid4().hex}{extension}"
    target = UPLOAD_DIR / filename
    file.save(target)
    return filename, target, os.path.getsize(target)


def extract_text(path: Path, original_name: str) -> str:
    extension = Path(original_name).suffix.lower()
    if extension in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if extension == ".pdf":
        return _extract_pdf(path)
    if extension == ".docx":
        return _extract_docx(path)
    return ""


def _extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return "[PDF content extraction requires pypdf]"
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(path: Path) -> str:
    try:
        from docx import Document
    except ImportError:
        return "[DOCX content extraction requires python-docx]"
    document = Document(str(path))
    return "\n".join(paragraph.text for paragraph in document.paragraphs)
