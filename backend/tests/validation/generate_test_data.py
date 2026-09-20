"""
Phase 0 — Validation Test Data Generator

Creates a labeled JSON dataset of document pairs covering:
  1. Exact copies (should be caught by Tier 1)
  2. Paraphrased pairs (should be caught by Tier 2)
  3. Clean / original pairs (should NOT be flagged — false-positive check)
  4. Heavily cited text (should NOT be flagged — citation filter check)

Run:  python -m tests.validation.generate_test_data
"""
from __future__ import annotations

import json
import random
from pathlib import Path

OUTPUT = Path(__file__).parent / "test_pairs.json"

# ── Base passages (diverse topics) ──────────────────────────────────────────

ORIGINALS = [
    # Science
    "Photosynthesis is the process by which green plants convert sunlight into chemical energy. "
    "Chlorophyll in the leaves absorbs light, driving the synthesis of glucose from carbon dioxide and water. "
    "This process releases oxygen as a byproduct, which is essential for aerobic life on Earth.",

    "The theory of general relativity, proposed by Albert Einstein in 1915, describes gravity as the curvature of spacetime "
    "caused by mass and energy. Massive objects like stars and planets warp the fabric of spacetime, and smaller objects follow "
    "curved paths through this warped geometry.",

    "Machine learning is a subset of artificial intelligence that enables systems to learn from data without being explicitly "
    "programmed. Supervised learning uses labeled training data, while unsupervised learning discovers hidden patterns in "
    "unlabeled datasets. Deep learning, a further subset, employs neural networks with many layers.",

    # History
    "The Industrial Revolution began in Britain in the late 18th century and transformed manufacturing processes. "
    "Factories replaced cottage industries, and steam power enabled mass production of goods. "
    "Urbanization accelerated as workers migrated from rural areas to cities seeking employment.",

    "The Renaissance was a cultural movement that began in Italy in the 14th century and spread across Europe. "
    "It was characterized by a renewed interest in classical Greek and Roman art, literature, and philosophy. "
    "Key figures include Leonardo da Vinci, Michelangelo, and Galileo Galilei.",

    # Technology
    "Blockchain technology provides a decentralized and immutable ledger for recording transactions. "
    "Each block contains a cryptographic hash of the previous block, creating a chain that is resistant to modification. "
    "This technology underpins cryptocurrencies like Bitcoin and Ethereum.",

    "Cloud computing delivers computing services over the internet, including servers, storage, databases, and software. "
    "The three main service models are Infrastructure as a Service, Platform as a Service, and Software as a Service. "
    "Major providers include Amazon Web Services, Microsoft Azure, and Google Cloud Platform.",

    # Environment
    "Climate change refers to long-term shifts in global temperatures and weather patterns. "
    "Human activities, particularly the burning of fossil fuels, have been the dominant driver of climate change since the 1800s. "
    "Rising temperatures lead to melting ice caps, rising sea levels, and more frequent extreme weather events.",

    "Coral reefs are among the most biologically diverse ecosystems on Earth. "
    "They provide habitat for approximately 25 percent of all marine species. "
    "However, ocean acidification and rising water temperatures threaten coral health through bleaching events.",

    # Social Science
    "Cognitive behavioral therapy is a structured form of psychotherapy that focuses on identifying and changing "
    "negative thought patterns. It is widely used to treat depression, anxiety disorders, and post-traumatic stress disorder. "
    "Research has demonstrated its effectiveness across diverse populations and cultural contexts.",
]

# ── Paraphrased versions (manually crafted to be clearly reworded) ──────────

PARAPHRASES = [
    # Science
    "Green plants use photosynthesis to transform light from the sun into stored chemical energy. "
    "The pigment chlorophyll, found within leaf cells, captures light energy to produce glucose using CO2 and H2O. "
    "A critical side effect of this biochemical reaction is the generation of molecular oxygen, vital for aerobic organisms.",

    "Einstein's 1915 theory of general relativity explains gravitational force as a consequence of spacetime being curved "
    "by the presence of mass and energy. Heavy celestial bodies such as stars distort spacetime around them, "
    "causing lighter objects to travel along curved trajectories.",

    "ML, a branch of AI, allows computer systems to improve through experience with data rather than through hard-coded rules. "
    "In supervised ML, models train on examples with known outputs; unsupervised approaches find structure in raw data. "
    "Deep learning extends this with multi-layered artificial neural networks.",

    # History
    "Starting in late-1700s Britain, the Industrial Revolution fundamentally changed how goods were made. "
    "Steam-powered factories overtook small-scale home workshops, enabling production at massive scale. "
    "This shift drew large numbers of rural inhabitants into rapidly growing urban centers.",

    "Beginning in 14th-century Italy, the Renaissance was an intellectual and artistic revival that eventually reached all of Europe. "
    "It involved a rediscovery of ancient Greco-Roman works in art, writing, and thought. "
    "Prominent contributors to this period were da Vinci, Michelangelo, and Galileo.",

    # Technology
    "A blockchain is a distributed, tamper-proof record-keeping system for tracking transactions. "
    "Every block stores a cryptographic fingerprint of its predecessor, forming a chain highly resistant to alteration. "
    "This foundational technology powers digital currencies such as Bitcoin and Ethereum.",

    "Cloud computing makes computing resources available on demand via the internet — servers, data storage, databases, and applications. "
    "Its primary delivery models are IaaS, PaaS, and SaaS. "
    "Leading vendors in this space are AWS, Azure, and GCP.",

    # Environment
    "Global climate change involves sustained alterations in worldwide temperature and weather trends. "
    "Since the 19th century, human activity — especially fossil fuel combustion — has been the primary catalyst. "
    "Consequences include polar ice loss, elevated sea levels, and increasingly severe weather phenomena.",

    "Coral reef ecosystems rank among the planet's most species-rich environments. "
    "Roughly a quarter of all ocean-dwelling species depend on reefs for shelter and food. "
    "Warming ocean waters and increasing acidity pose severe threats, triggering widespread coral bleaching.",

    # Social Science
    "CBT is a systematic psychotherapeutic approach centered on recognizing and modifying destructive thinking habits. "
    "Clinicians commonly employ it for treating major depression, various anxiety conditions, and PTSD. "
    "Numerous studies confirm its efficacy across a wide range of demographic and cultural groups.",
]

# ── Clean / original passages (completely unrelated to ORIGINALS) ───────────

CLEAN_TEXTS = [
    "The art of Japanese pottery has evolved over thousands of years, with each region developing its own distinctive style. "
    "Raku ware, originally created for tea ceremonies, is characterized by its hand-shaped forms and low firing temperatures. "
    "Modern potters continue to experiment with traditional glazing techniques.",

    "The migration patterns of Arctic terns are among the most remarkable in the animal kingdom. "
    "These small seabirds travel from Arctic to Antarctic and back each year, covering approximately 71,000 kilometers. "
    "Their round-trip journey takes advantage of summer conditions in both hemispheres.",

    "Urban planning in modern cities increasingly emphasizes walkability and mixed-use development. "
    "Transit-oriented design places residential, commercial, and recreational spaces within walking distance of public transport. "
    "This approach reduces car dependency and promotes community interaction.",

    "The history of spice trade routes shaped global commerce for centuries. "
    "Cinnamon, pepper, and cardamom were once valued as highly as gold and silver. "
    "Maritime routes from Southeast Asia to Europe drove exploration and colonization.",

    "Sourdough bread making relies on natural fermentation by wild yeast and lactic acid bacteria. "
    "The starter culture develops its unique flavor profile over days of careful feeding and temperature control. "
    "This ancient technique predates commercial yeast by thousands of years.",

    "The blue morpho butterfly of Central and South America displays iridescent blue wings "
    "that result from the microscopic structure of its scales rather than from pigments. "
    "This phenomenon, known as structural coloration, has inspired advances in materials science.",

    "Volcanic islands form through tectonic activity where magma from the Earth's mantle reaches the ocean surface. "
    "The Hawaiian island chain was created by a hotspot beneath the Pacific tectonic plate. "
    "As the plate moves over the hotspot, new islands form while older ones erode.",

    "Traditional Japanese garden design emphasizes harmony between natural elements and built structures. "
    "Rocks represent mountains, raked gravel symbolizes water, and carefully pruned trees evoke the passage of time. "
    "These gardens serve as spaces for contemplation and meditation.",

    "The development of the printing press by Johannes Gutenberg in the 1440s revolutionized the spread of information. "
    "Movable type allowed books to be produced far more quickly and cheaply than hand copying. "
    "This innovation is widely considered one of the most important inventions in human history.",

    "Acoustic properties of concert halls are carefully engineered to optimize sound quality. "
    "Factors such as reverberation time, early reflections, and spatial impression all contribute to the audience experience. "
    "The shape and materials of the hall profoundly influence how music is perceived.",
]

# ── Heavily cited passages (should not be flagged) ──────────────────────────

CITED_TEXTS = [
    'According to Smith and Johnson (2023), "Photosynthesis is the process by which green plants convert sunlight '
    'into chemical energy" (p. 45). This finding aligns with earlier research by Williams et al. (2019), '
    "who demonstrated that chlorophyll efficiency varies significantly across species [12].",

    'As noted by Einstein (1915), general relativity describes gravity as the curvature of spacetime. '
    'Hawking (1988) later observed that "massive objects like stars and planets warp the fabric of spacetime" [3]. '
    "This interpretation has been confirmed through numerous experiments (Will, 2014).",

    '"Machine learning is a subset of artificial intelligence that enables systems to learn from data" '
    "(Mitchell, 1997, p. 2). According to Goodfellow et al. (2016), deep learning extends this paradigm "
    "through multi-layered neural architectures [7, 8]. Recent meta-analyses confirm these findings (ibid).",

    'The Industrial Revolution, as described by Hobsbawm (1962), "began in Britain in the late 18th century '
    'and transformed manufacturing processes" (p. 29). According to Thompson (1963), urbanization '
    "accelerated dramatically during this period [14, 15, 16].",

    'As stated by Nakamoto (2008), "blockchain technology provides a decentralized and immutable ledger '
    'for recording transactions." Further analysis by Buterin (2014) extended this concept to smart contracts, '
    "noting that each block contains a cryptographic hash of the previous block (op. cit.).",
]


def build_dataset() -> list[dict]:
    """Build the full labeled dataset."""
    pairs = []
    pair_id = 0

    # ── 1. Exact copies ────────────────────────────────────────────────────
    for i, text in enumerate(ORIGINALS):
        pairs.append({
            "id": pair_id,
            "category": "exact_copy",
            "expected_flagged": True,
            "expected_tier": "tier1_lexical",
            "input_text": text,
            "reference_text": text,  # identical
            "description": f"Exact copy of passage {i}",
        })
        pair_id += 1

    # ── 2. Near-exact copies (minor edits) ─────────────────────────────────
    for i, text in enumerate(ORIGINALS[:5]):
        # Swap a few words
        words = text.split()
        if len(words) > 10:
            # Swap two random words
            idx_a, idx_b = random.sample(range(5, len(words) - 1), 2)
            words[idx_a], words[idx_b] = words[idx_b], words[idx_a]
        modified = " ".join(words)
        pairs.append({
            "id": pair_id,
            "category": "near_exact",
            "expected_flagged": True,
            "expected_tier": "tier1_lexical",
            "input_text": modified,
            "reference_text": text,
            "description": f"Near-exact copy with word swaps of passage {i}",
        })
        pair_id += 1

    # ── 3. Paraphrased pairs ───────────────────────────────────────────────
    for i, (original, paraphrase) in enumerate(zip(ORIGINALS, PARAPHRASES)):
        pairs.append({
            "id": pair_id,
            "category": "paraphrase",
            "expected_flagged": True,
            "expected_tier": "tier2_semantic",
            "input_text": paraphrase,
            "reference_text": original,
            "description": f"Paraphrase of passage {i}",
        })
        pair_id += 1

    # ── 4. Clean / original pairs (FALSE POSITIVE check) ──────────────────
    for i, clean in enumerate(CLEAN_TEXTS):
        # Test against a random original — should NOT match
        ref = ORIGINALS[i % len(ORIGINALS)]
        pairs.append({
            "id": pair_id,
            "category": "clean_original",
            "expected_flagged": False,
            "expected_tier": None,
            "input_text": clean,
            "reference_text": ref,
            "description": f"Clean text vs unrelated reference {i}",
        })
        pair_id += 1

    # ── 5. Cited / quoted text (should NOT be flagged as plagiarism) ──────
    for i, cited in enumerate(CITED_TEXTS):
        ref = ORIGINALS[i % len(ORIGINALS)]
        pairs.append({
            "id": pair_id,
            "category": "cited_text",
            "expected_flagged": False,
            "expected_tier": None,
            "input_text": cited,
            "reference_text": ref,
            "description": f"Properly cited text that overlaps with reference {i}",
        })
        pair_id += 1

    return pairs


def main():
    random.seed(42)
    pairs = build_dataset()

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(pairs, indent=2), encoding="utf-8")

    # Summary
    categories = {}
    for p in pairs:
        cat = p["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"Generated {len(pairs)} test pairs -> {OUTPUT}")
    for cat, count in categories.items():
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
