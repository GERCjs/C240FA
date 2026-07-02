from __future__ import annotations

import re
from datetime import datetime


def sanitize_input(value) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = value.strip()
    cleaned = re.sub(r"[<>]", "", cleaned)
    cleaned = re.sub(r"javascript:", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"on\w+=", "", cleaned, flags=re.IGNORECASE)
    return cleaned


def sanitize_prompt(value) -> str:
    if not isinstance(value, str):
        return ""
    blocked_patterns = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"you\s+are\s+now",
        r"disregard\s+(all\s+)?previous",
        r"system\s*:\s*",
        r"\[INST\]",
        r"<<SYS>>",
    ]
    cleaned = value
    for pattern in blocked_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def is_valid_email(email: str) -> bool:
    return isinstance(email, str) and bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email))


def is_non_empty(value: str) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_valid_date(value: str) -> bool:
    if not value:
        return False
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            datetime.strptime(value, fmt)
            return True
        except ValueError:
            continue
    return False


def is_valid_priority(priority: str) -> bool:
    return priority in {"low", "medium", "high"}
