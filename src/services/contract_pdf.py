"""Generate a signed contract PDF by overlaying company details on the template."""

import io
import logging
from datetime import datetime

import aioboto3
import fitz  # pymupdf

from src.core.infrastructure.config import settings

logger = logging.getLogger(__name__)

# PDF page is 596 × 842 points (A4).
# Coordinates found via page.get_text("dict") span analysis.

# Date blank:  x=131-213, y=77-88  (top title line)
_DATE_RECT = fitz.Rect(131, 74, 214, 90)
_DATE_INSERT = (214, 87)  # right-align end-point for date text

# Company info blanks on the "לבין" line (y=174-187):
#   company name blank  x=417-499
#   ח.פ blank          x=309-381
#   address blank       x=193-264
# We white-out the entire info zone and re-insert formatted text.
_INFO_WHITEBOX = fitz.Rect(113, 172, 520, 190)
_INFO_INSERT = (520, 186)  # right-align start (RTL)

# Signature labels are at y=630-641.
# Signature image areas are placed above the drawn underline ~y=660.
_RS_SIG_RECT = fitz.Rect(345, 641, 490, 690)  # right side (רוני רודיק)
_COMPANY_SIG_RECT = fitz.Rect(75, 641, 290, 690)  # left side (נציג החברה)


async def _download_s3_bytes(key: str) -> bytes:
    session = aioboto3.Session()
    bucket = settings.aws_s3_bucket_name
    async with session.client(  # type: ignore[attr-defined]
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        endpoint_url=settings.aws_s3_endpoint_url,
    ) as s3:
        resp = await s3.get_object(Bucket=bucket, Key=key)
        return await resp["Body"].read()


async def generate_signed_contract(
    company_name: str,
    company_id: str,
    address: str,
    signed_at: datetime,
    company_signature_png_bytes: bytes,
) -> bytes:
    """Overlay company details and signatures on the RS contract PDF template.

    Returns raw PDF bytes suitable for email attachment.
    """
    template_bytes = await _download_s3_bytes(settings.rs_contract_template_s3_key)
    rs_sig_bytes = await _download_s3_bytes(settings.rs_signature_s3_key)

    doc = fitz.open(stream=template_bytes, filetype="pdf")
    page = doc[0]

    white = fitz.Color(1, 1, 1)
    black = fitz.Color(0, 0, 0)

    # ── Date ──────────────────────────────────────────────────────────────────
    date_str = signed_at.strftime("%-d/%-m/%Y")
    page.draw_rect(_DATE_RECT, color=white, fill=white)
    page.insert_text(
        _DATE_INSERT,
        date_str,
        fontsize=10,
        fontname="helv",
        color=black,
        right_to_left=False,
    )

    # ── Company info (name · ח.פ · address) ──────────────────────────────────
    page.draw_rect(_INFO_WHITEBOX, color=white, fill=white)
    # Build the info string in Hebrew display order (RTL text, LTR numbers)
    info_line = f"{company_name}  ח.פ. {company_id}  מרח׳: {address}"
    page.insert_text(
        _INFO_INSERT,
        info_line,
        fontsize=9,
        fontname="helv",
        color=black,
        right_to_left=True,
    )

    # ── RS agency signature ───────────────────────────────────────────────────
    page.insert_image(_RS_SIG_RECT, stream=rs_sig_bytes, keep_proportion=True)

    # ── Company signature ─────────────────────────────────────────────────────
    page.insert_image(
        _COMPANY_SIG_RECT, stream=company_signature_png_bytes, keep_proportion=True
    )

    buf = io.BytesIO()
    doc.save(buf, deflate=True)
    return buf.getvalue()
