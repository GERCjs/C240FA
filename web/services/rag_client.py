from __future__ import annotations

import os

import requests


DEFAULT_TIMEOUT = 60


def _base_url() -> str:
    return os.environ.get("RAG_API_URL", "http://127.0.0.1:5000").rstrip("/")


def post_json(path: str, payload: dict, timeout: int = DEFAULT_TIMEOUT) -> dict:
    response = requests.post(f"{_base_url()}{path}", json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()
