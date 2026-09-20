# Veritas AI — Master Implementation Plan

**Goal:** upgrade the existing 3-tier plagiarism/paraphrase detection engine (FastAPI + PostgreSQL + SQLAlchemy + scikit-learn TF-IDF + sentence-transformers + Tavily) to be measurably accurate and genuinely scalable, not just "seems to work" in manual testing.

**Core principle driving every phase below:** accuracy without measurement is a guess, and power without a persisted corpus is just live API calls with good math on top. Every phase either adds measurement, fixes a scaling wall, or grows the corpus. Do not skip Phase 0.

---

## Phase 0 — Validation harness (build this before changing any pipeline code)

**Why first:** none of the phases below can be verified as an improvement without a way to measure accuracy before/after.

- Collect 100–200 labeled document pairs covering:
  - Exact copies
  - Paraphrased pairs (run some text through a paraphrasing tool yourself to generate these)
  - Clean/original pairs (should score low — this is your false-positive check)
  - Pairs with heavy legitimate citation (should NOT be flagged as plagiarism — tests your boilerplate/citation filter specifically)
- Write a script that runs the current pipeline against this set and reports **precision, recall, and false-positive rate**, broken out per tier (Tier 1 lexical, Tier 2 semantic, Tier 3 web).
- Re-run this harness after every phase below and record the delta. If a change doesn't move these numbers in the right direction, don't ship it just because it "seems more sophisticated."

---

## Phase 1 — Fix Tier 2 scaling (semantic embeddings)

**Problem:** embedding comparisons are almost certainly a brute-force loop against the reference table. This is the most expensive comparison in the system and the first thing that breaks past a few thousand documents.

- Add the `pgvector` extension to the existing PostgreSQL database (no new infrastructure required).
- Add a `vector(384)` column to the reference-document-chunks table (matches `all-MiniLM-L6-v2`'s output dimension).
- Build an HNSW index on that column.
- Replace the current Tier 2 comparison loop with an indexed `ORDER BY embedding <=> query_embedding LIMIT k` query.
- Write a one-time backfill script to embed and store vectors for all existing reference documents.
- **Validate:** re-run Phase 0 harness, report accuracy AND latency delta.

---

## Phase 2 — Fix the "no reference documents" case

**Why this is high priority, not an edge case:** most users will run a check with zero uploaded reference documents. Right now this silently degrades Tiers 1 & 2 to empty results, with only raw Tavily search still functioning — and the user isn't told this happened.

### 2a — Upgrade Tavily settings
- `search_depth`: `"basic"` → `"advanced"`
- `include_raw_content`: `False` → `True`
- `max_results`: `3` → `5`
- timeout: `15s` → `30s`

### 2b — Route web content through your real engines instead of crude word overlap
- Replace `_quick_text_similarity` (word overlap) with the same sentence-transformer model used in Tier 2.
- When `raw_content` is available, chunk it into sentences and find the best-matching passage via semantic embeddings — treat fetched web pages as ad-hoc reference documents for that single check, reusing Tier 1/2 comparison functions rather than a third bespoke method.
- Use TF-IDF as a fast pre-filter on page content before running the more expensive embedding comparison on it (mirrors the Tier 1 → Tier 2 gating pattern already used elsewhere).
- Raise the web-search chunk cap from `20` → `50` for better coverage on large documents.

### 2c — Reliability and cost controls (required, not optional polish)
- **Cache** Tavily results by a normalized hash of the query chunk, with a TTL (e.g. 7 days), stored in Postgres. Without this: (a) you burn through the 1,000-searches/month free tier fast, and (b) two identical checks can return different scores if Tavily's live index shifts between them, which breaks reproducibility.
- **Fail gracefully:** wrap the Tavily call in try/catch. If Tier 3 fails or hits a rate limit, Tiers 1 & 2 should still return results, and the response should explicitly say "web search unavailable for this check" rather than silently returning a misleading score.
- **De-duplicate** near-identical web results (content hash or similarity clustering) before comparison, so syndicated/mirrored articles don't get triple-counted and inflate the match score.

### 2d — Report honestly
- In the API response and `ResultsDashboard`, explicitly state which tiers actually ran and produced results for a given check. If local `ReferenceDocs` was empty, say so — don't imply a full 3-tier check happened identically every time.

**Validate:** re-run Phase 0 harness specifically on the empty-`ReferenceDocs` cases.

---

## Phase 3 — Fix Tier 1 scaling (lexical matching)

**Problem:** character n-gram TF-IDF cosine similarity computed pairwise against the whole reference corpus doesn't scale the way MinHash/LSH bucketing does.

- Add MinHash + LSH bucketing (`datasketch` library) in front of the existing TF-IDF step.
- Bucket candidates via LSH first; only run TF-IDF cosine similarity on documents that land in the same bucket — not the full corpus.
- Keep the existing character n-gram logic as-is; this phase changes *what gets compared against*, not the comparison method itself.
- **Validate:** re-run Phase 0 harness and report accuracy AND latency delta as corpus size grows (test with a synthetically duplicated corpus of a few thousand documents if your real one is still small).

---

## Phase 4 — Build your own corpus (this is what makes it *powerful*, not just accurate)

**Why this matters more than any algorithm change:** Turnitin's actual advantage over any new entrant isn't its algorithm — it's a corpus of 70+ billion web pages and 1+ billion student papers, built over 15+ years. No amount of algorithmic sophistication compensates for having nothing to compare against. This phase is slow and compounding, not a quick win — but it's the only real path to closing that gap.

- With explicit user consent/opt-in (flag this clearly in ToS — real privacy implications here), persist checked documents into the reference table after each check completes.
- Persist fetched Tavily `raw_content` into the same table (or a dedicated `WebCache` table feeding the same comparison pipeline), so future checks benefit from web content already fetched, without a new API call.
- Add basic dedup so the same document/source isn't stored multiple times.
- Pull in free structured corpora as a standing background reference set: CrossRef, Semantic Scholar, OpenAlex APIs, and/or a Wikipedia dump — this gives every check *something* substantial to compare against by default, even for a brand-new user who's uploaded nothing.
- **This step has no shortcut.** It grows at the rate your real traffic generates it. Budget for this being a multi-month effort, not a sprint.

---

## Phase 5 — Reporting clarity (cheap, high trust payoff)

- Report Tier 1 match %, Tier 2 semantic match %, and Tier 3 web-match hits as **separate** numbers with separate highlighted spans — never blend them into one score.
- For every flagged span, show *why* (exact match / paraphrase / web hit) so a human reviewer can evaluate it rather than just trust a number.
- Measure the existing citation/boilerplate filter against the Phase 0 validation set specifically for false-positive impact — this filter is supposed to protect against exactly the failure mode that got Turnitin's AI detector disabled at several universities, so it needs its own accuracy number, not just "seems to work."

---

## Phase 6 — AI-generated text detection (optional, separate scope)

Only take this on once Phases 0–5 are solid. This is a genuinely different problem (statistical/classifier-based detection of AI-generated text, not corpus-matching) and deserves its own model, its own UI section, and its own accuracy reporting — bolting it onto the existing similarity pipeline as a fourth blended score will recreate the exact "confusing black-box number" problem Phase 5 exists to fix elsewhere.

---

## Suggested execution order

1. Phase 0 — validation harness
2. Phase 1 — pgvector for Tier 2
3. Phase 2 — fix no-reference-docs case (Tavily → real engines + caching + failure handling)
4. Phase 3 — LSH/MinHash for Tier 1
5. Phase 5 — reporting clarity (cheap, do this once 1–3 are stable)
6. Phase 4 — corpus building (start early, but treat as an ongoing background effort, not a milestone with an end date)
7. Phase 6 — AI-text detection, only if genuinely in scope

## What "accurate and powerful" means, concretely

- **Accurate** = measured against Phase 0's labeled set, with a known false-positive rate on cited/legitimate text — not "seems to catch things when tested by hand."
- **Powerful** = has enough corpus breadth (Phase 4) that a real check has something substantial to compare against — not just good algorithms pointed at an empty table.

Don't let the pursuit of "powerful" (more corpus, more sources) skip past "accurate" (measured, calibrated). An unmeasured tool with a huge corpus will confidently flag legitimately cited text as plagiarism — which actively damages trust in real use.
