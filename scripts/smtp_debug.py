"""
Local debug SMTP server — prints all received emails to stdout.
Run with: uv run python scripts/smtp_debug.py

Listens on localhost:1025 (no auth, no TLS).
Configure .env: SMTP_HOST=localhost SMTP_PORT=1025 SMTP_USE_TLS=false
"""

import asyncio

from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Debugging


async def main() -> None:
    handler = Debugging()
    controller = Controller(handler, hostname="0.0.0.0", port=1025)
    controller.start()
    print("Debug SMTP server running on 0.0.0.0:1025 — press Ctrl+C to stop")
    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        pass
    finally:
        controller.stop()


if __name__ == "__main__":
    asyncio.run(main())
