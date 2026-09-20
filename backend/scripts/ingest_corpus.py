"""
Corpus Ingestion CLI tool for Veritas AI.

Allows bulk ingestion of reference documents from:
1. Local directories of files (.pdf, .docx, .txt)
2. Curated open academic seed datasets (Computer Science, AI, Biology, Physics, Ethics, etc.)
3. Corpus status reporting (--stats)

Usage:
  python -m scripts.ingest_corpus --stats
  python -m scripts.ingest_corpus --seed academic
  python -m scripts.ingest_corpus --dir path/to/documents
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select, func
from app.models.database import Document, ReferenceChunk, async_session, init_db
from app.services.parser import extract_text
from app.services.chunker import chunk_text
from app.services.embedding import get_embeddings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ingest_corpus")


# Curated academic seed dataset
ACADEMIC_CORPUS = [
    {
        "filename": "[Seed] CS - Theory of Computation and Complexity.txt",
        "text": (
            "The theory of computation examines how efficiently problems can be solved on a model of computation, "
            "using an algorithm. A Turing machine is a mathematical model of computation describing an abstract machine "
            "that manipulates symbols on a strip of tape according to a table of rules. The Church-Turing thesis posits "
            "that any algorithmic procedure can be simulated by a Turing machine. Computational complexity theory categorizes "
            "computational problems according to their resource usage, primarily time and memory. The complexity classes "
            "P and NP represent problems solvable in polynomial time and verifiable in polynomial time, respectively. "
            "The P versus NP problem remains one of the premier unsolved questions in computer science and mathematics. "
            "NP-complete problems, such as the Boolean satisfiability problem (SAT), the Traveling Salesperson Problem, "
            "and graph coloring, share the property that an efficient solution to any one would imply efficient solutions "
            "for all problems in NP."
        ),
    },
    {
        "filename": "[Seed] AI - Transformers and Attention Mechanisms.txt",
        "text": (
            "The Transformer architecture, introduced by Vaswani et al. in 2017, revolutionized deep learning and natural "
            "language processing by replacing recurrent neural networks with multi-head self-attention mechanisms. Self-attention "
            "enables the model to weigh the relevance of different words in a sequence regardless of their positional distance. "
            "The scaled dot-product attention computes compatibility scores between query, key, and value vectors using softmax "
            "normalization. Positional encodings are injected to retain information regarding sequence order. Large language models "
            "such as BERT, GPT, and LLaMA utilize transformer decoder or encoder stacks trained on massive web corpora via "
            "masked language modeling or autoregressive next-token prediction. Techniques such as FlashAttention and rotary "
            "position embeddings (RoPE) have substantially reduced quadratic computational bottlenecks for long-context sequences."
        ),
    },
    {
        "filename": "[Seed] AI - Machine Learning Foundations and Generalization.txt",
        "text": (
            "Machine learning is a subset of artificial intelligence where algorithms identify patterns in empirical data "
            "to make predictions or decisions without explicit programming. Supervised learning utilizes pairs of input features "
            "and ground-truth targets, minimizing loss functions such as cross-entropy or mean squared error via stochastic gradient "
            "descent. The bias-variance tradeoff characterizes the tension between an underfitted model that fails to capture underlying "
            "structure and an overfitted model that memorizes training noise. Regularization techniques, including L1 (Lasso) and L2 "
            "(Ridge) penalties, dropout, and early stopping, encourage generalization to unseen validation sets. Deep neural networks "
            "compose multiple non-linear transformations, learning hierarchical representations from raw signals."
        ),
    },
    {
        "filename": "[Seed] Biology - Photosynthesis and Cellular Respiration.txt",
        "text": (
            "Photosynthesis is the biological process by which autotrophic organisms convert light energy into chemical energy. "
            "In plant chloroplasts, chlorophyll molecules in the thylakoid membrane absorb solar photons, initiating light-dependent "
            "reactions that photolyze water molecules into electrons, protons, and oxygen gas. The resulting proton gradient powers "
            "ATP synthase to synthesize adenosine triphosphate (ATP) and reduce NADP+ to NADPH. In the Calvin cycle (light-independent "
            "reactions), the enzyme RuBisCO catalyzes the fixation of carbon dioxide into glyceraldehyde 3-phosphate (G3P), which is "
            "subsequently metabolized into glucose. Cellular respiration reverses this energetic flow in the mitochondria, oxidizing "
            "glucose through glycolysis, the Krebs cycle, and oxidative phosphorylation to generate cellular energy."
        ),
    },
    {
        "filename": "[Seed] Biology - Molecular Genetics and CRISPR Gene Editing.txt",
        "text": (
            "Deoxyribonucleic acid (DNA) stores genetic instructions through sequences of four nucleotide bases: adenine, thymine, "
            "cytosine, and guanine. During transcription, RNA polymerase synthesizes messenger RNA (mRNA) complementary to the DNA "
            "template strand. Ribosomes translate codons in mRNA into polypeptide chains according to the universal genetic code. "
            "CRISPR-Cas9 is an RNA-guided gene-editing endonuclease derived from bacterial adaptive immune systems. The Cas9 protein "
            "complexes with a single guide RNA (sgRNA) that directs sequence-specific double-strand breaks at complementary genomic "
            "loci adjacent to a protospacer adjacent motif (PAM). Cells repair these double-strand breaks via non-homologous end "
            "joining (NHEJ) or homology-directed repair (HDR), enabling targeted gene knockouts or insertions with high precision."
        ),
    },
    {
        "filename": "[Seed] Physics - General Relativity and Spacetime Curvature.txt",
        "text": (
            "Albert Einstein's theory of general relativity, formulated in 1915, reformulates gravitation as a geometric property "
            "of four-dimensional spacetime rather than a Newtonian force. The Einstein field equations equate the spacetime curvature "
            "tensor to the energy-momentum tensor of matter and radiation. Massive bodies curve the metric tensor of spacetime, causing "
            "freely falling test particles and photons to follow geodesics through this warped manifold. Observable consequences include "
            "gravitational time dilation, gravitational lensing, perihelion precession of planetary orbits, and the existence of black "
            "holes characterized by event horizons. The detection of gravitational waves by LIGO in 2015 provided empirical verification "
            "of spacetime ripples caused by merging binary black holes."
        ),
    },
    {
        "filename": "[Seed] Physics - Quantum Mechanics and Entanglement.txt",
        "text": (
            "Quantum mechanics governs the physical behavior of matter and energy at microscopic subatomic scales. The state of a quantum "
            "system is described by a wave function in a complex Hilbert space, whose evolution is governed by the time-dependent "
            "Schrodinger equation. The Copenhagen interpretation asserts that observing a system causes the wave function to collapse into "
            "an eigenstate with probability proportional to the square of its probability amplitude. Werner Heisenberg's uncertainty "
            "principle bounds the precision of simultaneously measuring complementary observables, such as position and momentum. "
            "Quantum entanglement represents non-local correlations between particles where the measurement of one instantaneously "
            "determines the quantum state of the other, defying classical local realism as demonstrated by violations of Bell inequalities."
        ),
    },
    {
        "filename": "[Seed] Ethics - Academic Integrity and Plagiarism.txt",
        "text": (
            "Academic integrity forms the cornerstone of scholarly inquiry, predicated on core values of honesty, trust, fairness, "
            "respect, responsibility, and courage. Plagiarism is the unauthorized representation of another author's thoughts, words, "
            "or ideas as one's own, whether intentionally or through inadequate attribution. Traditional lexical plagiarism involves verbatim "
            "copying without quotation marks or citations. Paraphrase plagiarism occurs when an author rewrites another's argument with "
            "cosmetic word substitutions while retaining the conceptual structure without attribution. Self-plagiarism, or duplicate "
            "submission, occurs when previous work is resubmitted without disclosure. Rigorous citation standards, such as APA, IEEE, "
            "and Chicago style, preserve intellectual provenance and protect researchers' scholarly contributions."
        ),
    },
    {
        "filename": "[Seed] History - The Scientific Revolution and Enlightenment.txt",
        "text": (
            "The Scientific Revolution during the sixteenth and seventeenth centuries marked a profound epistemological transition "
            "from scholastic dogma toward empirical observation, mathematical formulation, and experimental falsification. Nicolaus "
            "Copernicus challenged the geocentric Ptolemaic model with a heliocentric cosmology, later defended and expanded by Johannes "
            "Kepler and Galileo Galilei. Francis Bacon formulated the inductive method, advocating systematic experimentation, while Rene "
            "Descartes established rationalism and Cartesian dualism. Sir Isaac Newton's Philosophiae Naturalis Principia Mathematica "
            "unified terrestrial and celestial mechanics under universal gravitation and three laws of motion. This laid intellectual "
            "foundations for the Enlightenment, emphasizing individual reason, secular governance, and human rights."
        ),
    },
    {
        "filename": "[Seed] Systems - Distributed Systems and Consensus Protocols.txt",
        "text": (
            "Distributed computing systems consist of autonomous nodes coordinating actions through network message passing. Key "
            "challenges arise from network partitions, independent clock skew, and unpredictable node failures. The CAP theorem states "
            "that a distributed data store can simultaneously provide at most two of three guarantees: Consistency, Availability, and "
            "Partition tolerance. Consensus algorithms ensure distributed nodes agree on shared state despite failures. Leslie Lamport's "
            "Paxos protocol established provably correct consensus via multiple voting rounds. The Raft consensus algorithm achieved "
            "widespread adoption by decomposing consensus into leader election, log replication, and safety invariants. Byzantine Fault "
            "Tolerant (BFT) protocols tolerate malicious actors, providing foundation for distributed ledgers and fault-tolerant databases."
        ),
    },
]


async def show_stats():
    """Print database reference corpus statistics."""
    await init_db()
    async with async_session() as session:
        # Count documents
        doc_count_res = await session.execute(select(func.count(Document.id)))
        total_docs = doc_count_res.scalar() or 0

        # Count chunks
        chunk_count_res = await session.execute(select(func.count(ReferenceChunk.id)))
        total_chunks = chunk_count_res.scalar() or 0

        # Breakdown by category
        res = await session.execute(select(Document.filename, Document.word_count, Document.created_at).order_by(Document.created_at.desc()).limit(10))
        recent_docs = res.all()

        submissions = 0
        web_promoted = 0
        seeds = 0
        manual = 0

        all_docs_res = await session.execute(select(Document.filename))
        for (fname,) in all_docs_res.all():
            if fname.startswith("[Submission]"):
                submissions += 1
            elif fname.startswith("[Web]"):
                web_promoted += 1
            elif fname.startswith("[Seed]"):
                seeds += 1
            else:
                manual += 1

    print("\n" + "=" * 65)
    print("  VERITAS AI -- REFERENCE CORPUS STATISTICS")
    print("=" * 65)
    print(f"  Total Reference Documents:   {total_docs}")
    print(f"  Total Reference Chunks:      {total_chunks}")
    if total_docs > 0:
        print(f"  Avg Chunks per Document:     {total_chunks / total_docs:.1f}")
    print("\n  -- Origin Breakdown --")
    print(f"  Curated Seeds ([Seed]):      {seeds}")
    print(f"  Student Submissions:         {submissions}")
    print(f"  Web-Promoted Matches:        {web_promoted}")
    print(f"  Manual File Uploads:         {manual}")

    if recent_docs:
        print("\n  -- Most Recent Documents (up to 10) --")
        for fname, words, created in recent_docs:
            created_str = created.strftime("%Y-%m-%d %H:%M") if created else "unknown"
            print(f"  - {fname:<45} ({words:>5} words, {created_str})")

    print("=" * 65 + "\n")


async def seed_academic_corpus():
    """Ingest curated academic dataset into reference corpus."""
    await init_db()
    async with async_session() as session:
        added = 0
        skipped = 0

        for item in ACADEMIC_CORPUS:
            filename = item["filename"]
            text = item["text"]
            content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

            # Check if exists
            existing = await session.execute(select(Document).where(Document.content_hash == content_hash))
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            doc = Document(
                filename=filename,
                content_hash=content_hash,
                text_content=text,
                word_count=len(text.split()),
            )
            session.add(doc)
            await session.flush()

            chunks = chunk_text(text)
            if chunks:
                chunk_texts = [c.text for c in chunks]
                embeddings = get_embeddings(chunk_texts)
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    session.add(ReferenceChunk(
                        document_id=doc.id,
                        chunk_index=i,
                        text=chunk.text,
                        embedding=emb,
                    ))

            await session.commit()
            added += 1
            print(f"  [+] Ingested: {filename} ({len(chunks)} chunks)")

    print(f"\nDone! Added {added} academic documents ({skipped} already existed).")


async def ingest_directory(dir_path: Path):
    """Recursively parse and ingest all .pdf, .docx, .txt files from a directory."""
    if not dir_path.is_dir():
        print(f"Error: {dir_path} is not a valid directory.")
        return

    allowed = {".pdf", ".docx", ".txt"}
    files = [f for f in dir_path.rglob("*") if f.is_file() and f.suffix.lower() in allowed]

    if not files:
        print(f"No supported files (.pdf, .docx, .txt) found in {dir_path}")
        return

    print(f"Found {len(files)} candidate files to ingest from {dir_path}")

    await init_db()
    async with async_session() as session:
        added = 0
        skipped = 0
        errors = 0

        for f in files:
            try:
                content_bytes = f.read_bytes()
                if not content_bytes:
                    skipped += 1
                    continue

                text = extract_text(content_bytes, f.name)
                if not text.strip():
                    skipped += 1
                    continue

                content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

                existing = await session.execute(select(Document).where(Document.content_hash == content_hash))
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue

                doc = Document(
                    filename=f.name,
                    content_hash=content_hash,
                    text_content=text,
                    word_count=len(text.split()),
                )
                session.add(doc)
                await session.flush()

                chunks = chunk_text(text)
                if chunks:
                    chunk_texts = [c.text for c in chunks]
                    embeddings = get_embeddings(chunk_texts)
                    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                        session.add(ReferenceChunk(
                            document_id=doc.id,
                            chunk_index=i,
                            text=chunk.text,
                            embedding=emb,
                        ))

                await session.commit()
                added += 1
                print(f"  [+] Ingested: {f.name} ({len(chunks)} chunks, {doc.word_count} words)")
            except Exception as e:
                errors += 1
                print(f"  [!] Error processing {f.name}: {e}")

    print(f"\nDirectory ingestion complete: {added} added, {skipped} skipped (duplicates/empty), {errors} errors.")


def main():
    parser = argparse.ArgumentParser(description="Veritas AI Reference Corpus Ingestion CLI")
    parser.add_argument("--stats", action="store_true", help="Display corpus statistics and status")
    parser.add_argument("--seed", choices=["academic"], help="Ingest curated open academic domain corpus")
    parser.add_argument("--dir", type=str, help="Directory containing documents (.pdf, .docx, .txt) to ingest")

    args = parser.parse_args()

    if args.stats:
        asyncio.run(show_stats())
    elif args.seed == "academic":
        asyncio.run(seed_academic_corpus())
    elif args.dir:
        asyncio.run(ingest_directory(Path(args.dir)))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
