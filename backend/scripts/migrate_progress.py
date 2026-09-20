"""Migration: Add progress columns to analyses table."""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.models.database import engine

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS progress FLOAT DEFAULT 0.0;"
        ))
        await conn.execute(text(
            "ALTER TABLE analyses ADD COLUMN IF NOT EXISTS progress_message VARCHAR(256);"
        ))
    print("[OK] Migration: progress + progress_message columns added to analyses table.")

if __name__ == "__main__":
    asyncio.run(migrate())
