"""
Phase 5 migration: Add per-tier score columns and forensic flag_reason to the findings table.
Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
"""
import asyncio
import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.models.database import engine


async def migrate():
    async with engine.begin() as conn:
        # PostgreSQL supports ADD COLUMN IF NOT EXISTS
        await conn.execute(text("""
            ALTER TABLE findings ADD COLUMN IF NOT EXISTS tfidf_score FLOAT DEFAULT 0.0;
        """))
        await conn.execute(text("""
            ALTER TABLE findings ADD COLUMN IF NOT EXISTS semantic_score FLOAT DEFAULT 0.0;
        """))
        await conn.execute(text("""
            ALTER TABLE findings ADD COLUMN IF NOT EXISTS flag_reason TEXT;
        """))
    print("[OK] Migration complete: tfidf_score, semantic_score, flag_reason added to findings table.")


if __name__ == "__main__":
    asyncio.run(migrate())
