from __future__ import annotations

try:
    import bcrypt
except ImportError:  # pragma: no cover - exercised only in incomplete envs
    bcrypt = None


def hash_password(password: str) -> str:
    if bcrypt is None:
        raise RuntimeError("bcrypt is required for password hashing")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode(
        "utf-8"
    )


def verify_password(password: str, hashed_password: str) -> bool:
    if bcrypt is None:
        raise RuntimeError("bcrypt is required for password verification")
    if not hashed_password:
        return False
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
