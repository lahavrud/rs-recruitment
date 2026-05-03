"""Tests for contract PDF generation service."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch


async def test_generate_signed_contract_returns_pdf_bytes():
    """generate_signed_contract overlays text/images and returns valid PDF bytes."""
    import fitz

    fake_pdf = fitz.open()
    fake_pdf.new_page()
    import io

    buf = io.BytesIO()
    fake_pdf.save(buf)
    pdf_bytes = buf.getvalue()

    fake_sig_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50

    with (
        patch(
            "src.services.contract_pdf._download_s3_bytes",
            new_callable=AsyncMock,
            side_effect=[pdf_bytes, fake_sig_png],
        ),
    ):
        from src.services.contract_pdf import generate_signed_contract

        result = await generate_signed_contract(
            company_name="חברת בדיקה",
            company_id="123456789",
            address="רח׳ הדוגמה 1, תל אביב",
            signed_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
            company_signature_png_bytes=fake_sig_png,
        )

    assert isinstance(result, bytes)
    assert result[:4] == b"%PDF"
