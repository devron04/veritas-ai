"""
Phase 0 — Validation Harness

Runs the plagiarism detection pipeline against the labeled test pairs
and reports precision, recall, F1-score, and false-positive rate
broken out per tier and category.

Run:  python -m tests.validation.run_harness
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

# Ensure backend root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.services.chunker import chunk_text
from app.services.detector import DetectionResult, ReferenceEntry, run_detection

logging.basicConfig(
    level=logging.WARNING,  # suppress noisy INFO logs during harness run
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

TEST_DATA = Path(__file__).parent / "test_pairs.json"


@dataclass
class PairResult:
    pair_id: int
    category: str
    expected_flagged: bool
    actual_flagged: bool
    actual_score: float
    actual_match_type: str
    tiers_used: dict = field(default_factory=dict)
    latency_ms: float = 0.0


async def evaluate_pair(pair: dict) -> PairResult:
    """Run detection on a single test pair and return the result."""
    input_text = pair["input_text"]
    ref_text = pair["reference_text"]

    # Create reference entry
    ref_entries = [ReferenceEntry(text=ref_text, source_name="test_reference")]

    # Chunk the input
    input_chunks = chunk_text(input_text)

    start = time.perf_counter()

    result: DetectionResult = await run_detection(
        input_chunks=input_chunks,
        reference_entries=ref_entries,
        session=None,  # No DB session for harness — uses in-memory comparison
        enable_web_search=False,  # Don't burn API quota on test runs
    )

    elapsed_ms = (time.perf_counter() - start) * 1000

    # Determine if any unquoted match was found above suspicious threshold
    unquoted_matches = [m for m in result.matches if not m.is_quoted]
    actual_flagged = result.overall_score > 0 and len(unquoted_matches) > 0
    best_score = max((m.combined_score for m in unquoted_matches), default=0.0)
    best_type = ""
    if unquoted_matches:
        best_match = max(unquoted_matches, key=lambda m: m.combined_score)
        best_type = best_match.match_type

    return PairResult(
        pair_id=pair["id"],
        category=pair["category"],
        expected_flagged=pair["expected_flagged"],
        actual_flagged=actual_flagged,
        actual_score=best_score,
        actual_match_type=best_type,
        tiers_used=result.tiers_used,
        latency_ms=elapsed_ms,
    )


def compute_metrics(results: list[PairResult]) -> dict:
    """Compute precision, recall, F1, and false-positive rate."""
    tp = sum(1 for r in results if r.expected_flagged and r.actual_flagged)
    fp = sum(1 for r in results if not r.expected_flagged and r.actual_flagged)
    fn = sum(1 for r in results if r.expected_flagged and not r.actual_flagged)
    tn = sum(1 for r in results if not r.expected_flagged and not r.actual_flagged)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
    }


def print_report(results: list[PairResult]):
    """Print a formatted report to stdout."""
    total_time = sum(r.latency_ms for r in results)

    print("\n" + "=" * 72)
    print("  VERITAS AI -- PHASE 0 VALIDATION REPORT")
    print("=" * 72)
    print(f"\n  Total pairs tested: {len(results)}")
    print(f"  Total time: {total_time:.0f}ms ({total_time/1000:.1f}s)")
    print(f"  Avg latency per pair: {total_time/len(results):.0f}ms")

    # ── Overall metrics ──────────────────────────────────────────────────
    overall = compute_metrics(results)
    print("\n  -- OVERALL METRICS --")
    print(f"  Precision:           {overall['precision']:.2%}")
    print(f"  Recall:              {overall['recall']:.2%}")
    print(f"  F1 Score:            {overall['f1_score']:.2%}")
    print(f"  False Positive Rate: {overall['false_positive_rate']:.2%}")
    print(f"  TP={overall['true_positives']}  FP={overall['false_positives']}  "
          f"FN={overall['false_negatives']}  TN={overall['true_negatives']}")

    # ── Per-category breakdown ───────────────────────────────────────────
    categories = sorted(set(r.category for r in results))
    print("\n  -- PER-CATEGORY BREAKDOWN --")
    print(f"  {'Category':<20} {'Count':>5} {'Flagged':>7} {'Expected':>8} {'Accuracy':>8} {'Avg Score':>9}")
    print("  " + "-" * 60)

    for cat in categories:
        cat_results = [r for r in results if r.category == cat]
        count = len(cat_results)
        flagged = sum(1 for r in cat_results if r.actual_flagged)
        expected_flagged = sum(1 for r in cat_results if r.expected_flagged)
        correct = sum(
            1 for r in cat_results
            if r.expected_flagged == r.actual_flagged
        )
        accuracy = correct / count if count > 0 else 0.0
        avg_score = sum(r.actual_score for r in cat_results) / count if count > 0 else 0.0

        print(f"  {cat:<20} {count:>5} {flagged:>7} {expected_flagged:>8} {accuracy:>7.0%} {avg_score:>9.2f}")

    # ── Failures detail ──────────────────────────────────────────────────
    failures = [r for r in results if r.expected_flagged != r.actual_flagged]
    if failures:
        print(f"\n  -- FAILURES ({len(failures)}) --")
        for r in failures:
            status = "MISSED (FN)" if r.expected_flagged else "FALSE ALARM (FP)"
            print(f"  Pair {r.pair_id:>3} [{r.category:<20}] {status}  "
                  f"score={r.actual_score:.2f}  type={r.actual_match_type or 'none'}")

    print("\n" + "=" * 72)

    # ── Save JSON report ──────────────────────────────────────────────────
    report_path = Path(__file__).parent / "report.json"
    report = {
        "overall": overall,
        "per_category": {},
        "failures": [],
        "pair_results": [],
    }
    for cat in categories:
        cat_results = [r for r in results if r.category == cat]
        report["per_category"][cat] = compute_metrics(cat_results)

    for r in failures:
        report["failures"].append({
            "pair_id": r.pair_id,
            "category": r.category,
            "expected_flagged": r.expected_flagged,
            "actual_flagged": r.actual_flagged,
            "actual_score": r.actual_score,
        })

    for r in results:
        report["pair_results"].append({
            "pair_id": r.pair_id,
            "category": r.category,
            "expected": r.expected_flagged,
            "actual": r.actual_flagged,
            "score": round(r.actual_score, 4),
            "match_type": r.actual_match_type,
            "latency_ms": round(r.latency_ms, 1),
        })

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"  Full report saved to: {report_path}")


async def main():
    if not TEST_DATA.exists():
        print(f"Test data not found at {TEST_DATA}. Run generate_test_data.py first.")
        sys.exit(1)

    pairs = json.loads(TEST_DATA.read_text(encoding="utf-8"))
    print(f"Loaded {len(pairs)} test pairs from {TEST_DATA}")

    results: list[PairResult] = []
    for i, pair in enumerate(pairs):
        result = await evaluate_pair(pair)
        results.append(result)
        status = "OK" if result.expected_flagged == result.actual_flagged else "FAIL"
        print(f"  [{i+1:>3}/{len(pairs)}] {status:<4} {pair['category']:<20} "
              f"score={result.actual_score:.2f} ({result.latency_ms:.0f}ms)")

    print_report(results)


if __name__ == "__main__":
    asyncio.run(main())
