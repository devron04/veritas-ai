import asyncio
import logging
from sqlalchemy import select
from sqlalchemy import select
from app.models.database import Document, ReferenceChunk, get_session, Base, engine
from app.services.chunker import chunk_text
from app.services.embedding import get_embeddings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async for session in get_session():
        # Get all documents that don't have chunks yet
        result = await session.execute(select(Document))
        documents = result.scalars().all()
        
        for doc in documents:
            # check if chunks exist
            chunk_check = await session.execute(
                select(ReferenceChunk).where(ReferenceChunk.document_id == doc.id).limit(1)
            )
            if chunk_check.scalar_one_or_none():
                logger.info(f"Skipping document {doc.filename}, chunks already exist.")
                continue
                
            logger.info(f"Processing document: {doc.filename}")
            chunks = chunk_text(doc.text_content)
            if not chunks:
                continue
                
            chunk_texts = [c.text for c in chunks]
            embeddings = get_embeddings(chunk_texts)
            
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                ref_chunk = ReferenceChunk(
                    document_id=doc.id,
                    chunk_index=i,
                    text=chunk.text,
                    embedding=emb
                )
                session.add(ref_chunk)
                
            await session.commit()
            logger.info(f"Saved {len(chunks)} chunks for {doc.filename}")
            
        logger.info("Backfill complete.")
        break

if __name__ == "__main__":
    asyncio.run(main())
