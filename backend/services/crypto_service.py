"""
Symmetric encryption for sensitive credentials stored in the database.

Uses Fernet (AES-128-CBC + HMAC-SHA256) from the `cryptography` package,
which is already installed as a transitive dependency of python-jose.

The Fernet key is derived from SECRET_KEY using SHA-256 and base64url
encoding — no extra env var required.
"""
import base64
import hashlib

from cryptography.fernet import Fernet

from config import settings


def _fernet() -> Fernet:
    """Derive a 32-byte Fernet key from SECRET_KEY."""
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt(value: str) -> str:
    """Encrypt a plaintext string and return a base64url token."""
    if not value:
        return value
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    """Decrypt a token produced by encrypt(). Returns plaintext."""
    if not value:
        return value
    return _fernet().decrypt(value.encode()).decode()
