"""Candidate self-service profile + resume operations (Sprint 11 / #608).

Single-row primitives for the authenticated candidate's own profile:
identity-field patches, resume replace (with storage cleanup of the
previous file), and resume removal. All callers must come through
``get_current_candidate`` — there's no admin override path here; admin
candidate edits live in ``src/services/admin/candidates.py``.
"""

from __future__ import annotations

import logging
import re

from src.core.services.storage import StorageProvider
from src.models import CandidateProfile
from src.schemas import CandidateMeUpdate

logger = logging.getLogger(__name__)

_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
_MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB
_MIME_BY_EXT = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
}
_SAFE_FILENAME = re.compile(r"^[\w.\-]+$")


def apply_identity_patch(profile: CandidateProfile, patch: CandidateMeUpdate) -> None:
    """Apply only the fields the candidate is allowed to change on themselves.

    Partial-update semantics: omitted keys leave the existing value alone.
    Email is NOT in the schema (#608 / Sprint 11 MVP) — the router rejects
    requests that try to include it.
    """
    data = patch.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"] is not None:
        profile.full_name = data["full_name"]
    # phone and linkedin_url are nullable on the model — explicit-null on the
    # patch clears the column (omitting the key leaves it alone).
    if "phone" in data:
        profile.phone = data["phone"]
    if "linkedin_url" in data:
        profile.linkedin_url = data["linkedin_url"]


async def replace_resume(
    profile: CandidateProfile,
    content: bytes,
    filename: str,
    content_type: str | None,
    storage: StorageProvider,
) -> str:
    """Replace the candidate's profile-level resume, deleting the prior file.

    Returns the new storage key. The Application snapshots (#604) are
    independent and not touched by this operation.

    Raises ``ValueError`` on validation failure (extension, magic bytes,
    size). The previous file is removed best-effort AFTER the new upload
    succeeds so a failed upload doesn't leave the candidate with no resume.
    """
    from src.core.services.file_validation import validate_document_magic_bytes

    if not filename or not _SAFE_FILENAME.match(filename.replace(" ", "_")):
        raise ValueError("Unsafe resume filename")

    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if f".{ext}" not in _ALLOWED_EXTENSIONS:
        raise ValueError("Invalid file type. Allowed: PDF, DOC, DOCX")
    if len(content) > _MAX_RESUME_BYTES:
        raise ValueError("File size exceeds 10MB limit")
    if not validate_document_magic_bytes(content, ext):
        raise ValueError("Resume file content does not match the declared file type")

    new_key = await storage.upload_file(
        file_content=content,
        file_name=f"resumes/{filename}",
        content_type=content_type or _MIME_BY_EXT.get(ext, "application/octet-stream"),
    )

    old_key = profile.resume_path
    profile.resume_path = new_key

    if old_key and old_key != new_key:
        try:
            await storage.delete_file(old_key)
        except Exception:
            # Best-effort cleanup — leaving a stale file behind is preferable
            # to blocking the candidate's update on a storage outage.
            logger.exception("Failed to delete previous resume %s", old_key)

    return new_key


async def remove_resume(profile: CandidateProfile, storage: StorageProvider) -> None:
    """Idempotent resume removal: delete the file (best-effort) + null the path.

    No-op when there is no resume on file. Application snapshots are untouched.
    """
    old_key = profile.resume_path
    profile.resume_path = None
    if old_key:
        try:
            await storage.delete_file(old_key)
        except Exception:
            logger.exception("Failed to delete resume %s during remove", old_key)
