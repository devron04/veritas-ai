import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/* ================================================================== */
/*  Material Icon helper                                               */
/* ================================================================== */
const MI: React.FC<{ icon: string; className?: string; fill?: boolean }> = ({ icon, className = "", fill }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {icon}
  </span>
);

/* ================================================================== */
/*  LandingPage Component                                              */
/* ================================================================== */
export const LandingPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();

  return (
    <div className="font-body text-[#0f172a] antialiased" style={{ background: "#fafbff" }}>

      {/* ============================================================ */}
      {/*  HERO SECTION                                                */}
      {/* ============================================================ */}
      <section className="w-full max-w-[1400px] mx-auto px-6 pt-8 pb-16">
        {/* Decorative ambient orbs */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-80 right-10 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="xl:col-span-5 flex flex-col gap-4 pt-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 backdrop-blur-md shadow-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-v-primary animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-v-primary">
                Veritas Engine • SentenceTransformers + Dense Matrix NLP
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-headline text-[clamp(1.75rem,4vw,2.5rem)] font-semibold text-v-slate-900 tracking-tight leading-tight">
              Next-Gen Plagiarism &{" "}
              <span className="bg-gradient-to-r from-v-primary via-v-indigo to-v-purple bg-clip-text text-transparent">
                Semantic Paraphrase
              </span>{" "}
              Detection
            </h1>

            {/* Subtitle */}
            <p className="text-[1.05rem] text-v-slate-500 leading-relaxed max-w-xl">
              Measurement-first, mathematically reproducible plagiarism scores engineered for academic institutions and research enterprises. Three-tier detection that catches what others miss.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {user ? (
                <Link
                  to="/scan"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-v-primary to-v-indigo text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-105 transition-all"
                >
                  Go to Dashboard <MI icon="arrow_forward" className="text-[18px]" />
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal("register")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-v-primary to-v-indigo text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-105 transition-all cursor-pointer border-none"
                  >
                    Get Started Free <MI icon="arrow_forward" className="text-[18px]" />
                  </button>
                  <button
                    onClick={() => openAuthModal("login")}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white/80 backdrop-blur-md text-v-slate-900 font-medium text-sm shadow-sm hover:text-v-primary transition-all cursor-pointer border border-gray-200"
                  >
                    <MI icon="play_circle" className="text-v-primary text-[20px]" fill />
                    Sign In
                  </button>
                </>
              )}
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-3 text-v-slate-500 text-xs">
              <div className="flex items-center gap-1.5">
                <MI icon="verified" className="text-v-primary text-[18px]" />
                <span className="font-semibold text-v-slate-900">99.2% Detection Accuracy</span>
              </div>
              <span className="text-v-slate-200">•</span>
              <div className="flex items-center gap-1.5">
                <MI icon="lock" className="text-v-green text-[18px]" />
                <span>JWT + RBAC Secured</span>
              </div>
              <span className="text-v-slate-200">•</span>
              <div className="flex items-center gap-1.5">
                <MI icon="speed" className="text-v-indigo text-[18px]" />
                <span>{"<2 Min"} Average Scan</span>
              </div>
            </div>

            {/* Quote */}
            <div className="mt-3 p-4 rounded-xl bg-v-blue-50/60 backdrop-blur-md shadow-sm">
              <div className="flex items-start gap-3">
                <MI icon="format_quote" className="text-v-primary shrink-0 text-[22px]" />
                <div className="flex flex-col gap-1">
                  <p className="text-[0.8rem] text-v-slate-700 italic leading-relaxed">
                    "Detected heavily paraphrased content across 161 document chunks in under 2 minutes — content that traditional keyword-based tools completely missed."
                  </p>
                  <span className="text-[0.75rem] text-v-slate-500 font-semibold">
                    — Veritas AI Internal Benchmark (2024)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Forensic Demo Card */}
          <div className="xl:col-span-7">
            <div className="rounded-xl bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col">
              {/* Top bar */}
              <div className="bg-v-slate-50/60 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <span className="w-3 h-3 rounded-full bg-green-400/60" />
                  <span className="ml-2 text-xs font-semibold text-v-slate-900">Veritas Forensic Workspace</span>
                </div>
                <div className="inline-flex rounded-lg bg-gray-100/60 p-1">
                  <button className="px-3 py-1 rounded bg-white text-v-primary text-xs font-semibold shadow-sm">DOCX Upload</button>
                  <button className="px-3 py-1 rounded text-v-slate-500 hover:text-v-slate-900 text-xs transition-colors">PDF Scan</button>
                  <button className="px-3 py-1 rounded text-v-slate-500 hover:text-v-slate-900 text-xs transition-colors">Paste Text</button>
                </div>
              </div>

              {/* Metrics Ribbon */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100/40">
                {[
                  { label: "Plagiarism Score", value: "74%", tag: "High Match", tagColor: "bg-red-50 text-red-700" },
                  { label: "Total Passages", value: "161", tag: "Chunked", tagColor: "bg-blue-50 text-blue-700" },
                  { label: "Flagged Passages", value: "69", tag: "Above Threshold", tagColor: "bg-orange-50 text-orange-700" },
                  { label: "Properly Cited", value: "86", tag: "Excluded", tagColor: "bg-green-50 text-green-700" },
                ].map((m, i) => (
                  <div key={i} className="bg-white/90 p-4 flex flex-col">
                    <span className="text-[0.7rem] text-v-slate-500">{m.label}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-headline text-2xl font-bold text-v-slate-900">{m.value}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-semibold ${m.tagColor}`}>{m.tag}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dual Forensic Viewer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-v-slate-50/30">
                {/* Input Document */}
                <div className="flex flex-col rounded-lg bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 mb-3 bg-v-slate-50/60 -mx-4 -mt-4 px-4 pt-3 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <MI icon="description" className="text-v-primary text-[18px]" />
                      <span className="text-xs font-semibold text-v-slate-900">Input Document</span>
                    </div>
                    <span className="text-[0.7rem] text-v-slate-500">Chunk #42</span>
                  </div>
                  <div className="text-[0.8rem] text-v-slate-700 leading-relaxed flex flex-col gap-3">
                    <p>
                      <span className="bg-red-50 text-red-800 px-1 py-0.5 rounded font-medium">
                        This study enhances LLM-based short-answer grading by incorporating a retrieval-augmented generation pipeline
                      </span>,
                      showing that grounding grading decisions in retrieved reference material improves scoring accuracy.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 bg-v-slate-50/30 -mx-4 -mb-4 px-4 pb-3 rounded-b-lg flex items-center justify-between text-v-slate-500 text-[0.7rem]">
                    <span>Similarity: 0.92</span>
                    <span className="text-red-600 font-semibold">Flagged — Tier 3: Web Search</span>
                  </div>
                </div>

                {/* Matched Source */}
                <div className="flex flex-col rounded-lg bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 mb-3 bg-v-slate-50/60 -mx-4 -mt-4 px-4 pt-3 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <MI icon="language" className="text-v-indigo text-[18px]" />
                      <span className="text-xs font-semibold text-v-slate-900 truncate">Web Source Match</span>
                    </div>
                    <span className="text-[0.7rem] text-v-primary font-medium">arxiv.org</span>
                  </div>
                  <div className="text-[0.8rem] text-v-slate-700 leading-relaxed flex flex-col gap-3">
                    <p>
                      <span className="bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded font-medium">
                        This study enhances LLM-based short-answer grading by incorporating a retrieval-augmented generation pipeline
                      </span>,
                      demonstrating that grounding grading in retrieved references improves accuracy over standalone approaches.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 bg-v-slate-50/30 -mx-4 -mb-4 px-4 pb-3 rounded-b-lg flex items-center justify-between text-v-slate-500 text-[0.7rem]">
                    <span>Indexed via SerpAPI</span>
                    <span className="text-v-indigo font-semibold">Cosine Match: 0.92</span>
                  </div>
                </div>
              </div>

              {/* Legend Footer */}
              <div className="px-5 py-3 bg-v-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-[0.7rem]">
                  <span className="font-semibold text-v-slate-900">Detection Tiers:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100" />
                    <span>Tier 1: Lexical (Exact Copy)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-100" />
                    <span>Tier 2: Semantic AI (Paraphrase)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-100" />
                    <span>Tier 3: Web Search (Internet)</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-v-primary text-white text-xs font-medium shadow-sm hover:bg-v-primary-dark transition-all flex items-center gap-1">
                  <MI icon="picture_as_pdf" className="text-[16px]" />
                  Export Report (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS BAR                                                   */}
      {/* ============================================================ */}
      <section className="w-full bg-v-blue-50/50 py-8">
        <div className="w-full max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "psychology", color: "text-v-primary", bg: "bg-v-blue-50", val: "161+", title: "Chunks per Scan", desc: "Semantic sentence clustering with sliding window analysis." },
              { icon: "language", color: "text-v-green", bg: "bg-v-green-50", val: "3B+", title: "Web Pages Indexed", desc: "Real-time cross-reference via SerpAPI global web search." },
              { icon: "speed", color: "text-v-cyan", bg: "bg-v-cyan-50", val: "<2min", title: "Average Scan Time", desc: "Full hybrid NLP pipeline completes in under 2 minutes." },
              { icon: "verified_user", color: "text-v-indigo", bg: "bg-v-purple-50", val: "99.2%", title: "Detection Accuracy", desc: "Dense matrix correlation catches heavily paraphrased content." },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-white/80 backdrop-blur-md p-6 shadow-md shadow-gray-100/50 flex flex-col gap-2 hover:shadow-lg transition-shadow">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color} mb-1`}>
                  <MI icon={s.icon} className="text-[24px]" />
                </div>
                <span className="font-headline text-2xl font-bold text-v-slate-900">{s.val}</span>
                <span className="font-headline text-[1.1rem] font-semibold text-v-slate-900">{s.title}</span>
                <p className="text-[0.8rem] text-v-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CORE FEATURES — 3 Glassmorphic Cards                        */}
      {/* ============================================================ */}
      <section className="w-full max-w-[1400px] mx-auto px-6 py-16">
        <div className="flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="text-xs uppercase tracking-wider text-v-primary font-semibold">Under the Hood</span>
              <h2 className="font-headline text-[clamp(1.5rem,3vw,2.25rem)] font-semibold text-v-slate-900 tracking-tight">
                Three-Tier Detection Architecture
              </h2>
              <p className="text-[0.95rem] text-v-slate-500">
                Legacy engines rely on naive n-gram hashing and exact token overlap. Veritas deploys high-dimensional semantic spaces to unmask calculated paraphrastic obfuscation.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-v-slate-50 text-xs text-v-slate-500 font-medium">
              <MI icon="terminal" className="text-[16px] text-v-primary" />
              SentenceTransformers + TF-IDF Engine
            </span>
          </div>

          {/* 3 Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "psychology", color: "text-v-primary", bg: "bg-blue-50",
                title: "Deep Semantic AI (Hybrid NLP)",
                desc: "Combines SentenceTransformers and Full Dense Matrix correlation to isolate synonym cascades, passive voice inversion, and complex syntactic reorganization. Catches heavily paraphrased content that keyword tools miss entirely.",
                tags: ["Dense Cosine Vectors", "all-MiniLM-L6-v2", "Full Matrix Correlation"]
              },
              {
                icon: "dataset", color: "text-v-indigo", bg: "bg-indigo-50",
                title: "Global Web Search Engine",
                desc: "Two-phase intelligent search: broad key-phrase extraction followed by targeted passage verification. Cross-references against billions of web pages via SerpAPI with deterministic caching for reproducible results.",
                tags: ["SerpAPI Integration", "Key-Phrase Extraction", "Deterministic Caching"]
              },
              {
                icon: "encrypted", color: "text-v-green", bg: "bg-green-50",
                title: "Enterprise-Grade Security",
                desc: "JWT authentication with strict role-based access control. Admin-restricted visibility ensures documents remain private. Every scan produces a downloadable PDF audit trail for institutional compliance.",
                tags: ["JWT + RBAC Auth", "Admin Visibility", "PDF Audit Reports"]
              },
            ].map((f, i) => (
              <div key={i} className="rounded-xl bg-white/80 backdrop-blur-md p-8 shadow-md shadow-gray-100/30 flex flex-col justify-between hover:shadow-xl hover:shadow-blue-100/20 transition-all">
                <div className="flex flex-col gap-4">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center ${f.color}`}>
                    <MI icon={f.icon} className="text-[28px]" />
                  </div>
                  <h3 className="font-headline text-[1.25rem] text-v-slate-900 font-semibold">{f.title}</h3>
                  <p className="text-[0.9rem] text-v-slate-500 leading-relaxed">{f.desc}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-6 mt-6 bg-v-slate-50/40 -mx-8 -mb-8 p-6 rounded-b-xl">
                  {f.tags.map((t, j) => (
                    <span key={j} className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-v-slate-700">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  LEGACY vs VERITAS COMPARISON                                */}
      {/* ============================================================ */}
      <section className="w-full bg-v-slate-50/50 py-16">
        <div className="w-full max-w-[1400px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Comparison */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-v-primary font-semibold">Technical Head-to-Head</span>
                <h3 className="font-headline text-[clamp(1.5rem,3vw,2.25rem)] text-v-slate-900 tracking-tight font-semibold">
                  Why Keyword Hash Matching Fails
                </h3>
                <p className="text-[0.95rem] text-v-slate-500">
                  Legacy tools generate hash footprints from exact word sequences. When synonyms are substituted or syntax is altered, the match drops to zero. Veritas transforms text into high-dimensional semantic tensors.
                </p>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-md flex flex-col gap-6">
                {/* Legacy Row */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-v-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <span className="text-xs font-semibold text-v-slate-900">Legacy Keyword Matchers</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-gray-100 text-v-slate-500 text-[0.7rem] font-bold">0% Match</span>
                  </div>
                  <div className="text-[0.8rem] text-v-slate-500 bg-white p-3 rounded">
                    <span className="text-v-slate-700 line-through decoration-gray-400">
                      "The economic ramification of persistent currency devaluation created extensive monetary turbulence."
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[0.7rem] text-red-600">
                    <MI icon="cancel" className="text-[16px]" />
                    Failed: Altered verbs and substituted synonyms — Hash collision avoided.
                  </div>
                </div>

                {/* Veritas Row */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-v-primary animate-ping" />
                      <span className="text-xs font-semibold text-v-primary">Veritas Dense Vector Analysis</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-v-primary text-white text-[0.7rem] font-bold">96.8% Semantic Match</span>
                  </div>
                  <div className="flex items-center gap-2 text-[0.7rem] text-v-primary font-medium">
                    <MI icon="check_circle" className="text-[16px]" />
                    Resolved: Conceptually identical proposition detected across latent attention weights.
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Capability list */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {[
                { icon: "grain", color: "text-v-primary", bg: "bg-v-blue-50", title: "TF-IDF Lexical Analysis", desc: "Word-level n-gram vectorization with configurable thresholds for exact and near-exact copy detection." },
                { icon: "account_tree", color: "text-v-indigo", bg: "bg-indigo-50", title: "Semantic Embedding Comparison", desc: "SentenceTransformer dense cosine similarity across all document chunks vs. reference corpus entries." },
                { icon: "merge_type", color: "text-v-green", bg: "bg-v-green-50", title: "Two-Phase Web Search", desc: "Broad key-phrase search followed by targeted passage-level verification against scraped web content." },
                { icon: "translate", color: "text-v-cyan", bg: "bg-v-cyan-50", title: "Citation Auto-Filtering", desc: "Properly cited passages are automatically excluded from plagiarism scoring to prevent false positives." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-white shadow-sm">
                  <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} shrink-0`}>
                    <MI icon={item.icon} className="text-[22px]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-headline text-[1.05rem] text-v-slate-900 font-semibold">{item.title}</h4>
                    <p className="text-[0.8rem] text-v-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA BANNER                                                  */}
      {/* ============================================================ */}
      <section className="w-full max-w-[1400px] mx-auto px-6 py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-v-slate-900 via-v-primary to-v-indigo p-8 md:p-14 text-white shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold tracking-wider uppercase">Ready to Scan</span>
            </div>
            <h2 className="font-headline text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-tight">
              Ensure Originality. Start Scanning Now.
            </h2>
            <p className="text-[1.05rem] text-white/80 leading-relaxed">
              Upload your document and get a comprehensive originality report in under 2 minutes. Three-tier detection with highlighted passages and matched source URLs.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => user ? undefined : openAuthModal("register")}
                className="px-6 py-3.5 rounded-lg bg-white text-v-primary font-semibold text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer border-none"
              >
                {user ? (
                  <Link to="/scan" className="text-v-primary no-underline flex items-center gap-2">
                    Open Dashboard <MI icon="arrow_forward" className="text-[18px]" />
                  </Link>
                ) : (
                  "Create Free Account"
                )}
              </button>
              <button
                onClick={() => user ? undefined : openAuthModal("login")}
                className="px-6 py-3.5 rounded-lg bg-white/10 backdrop-blur-md text-white font-medium text-sm hover:bg-white/20 transition-all cursor-pointer border-none"
              >
                Sign In to Dashboard
              </button>
            </div>
            <div className="pt-4 flex flex-wrap items-center gap-6 text-white/60 text-xs">
              <div className="flex items-center gap-1.5"><MI icon="lock" className="text-[18px]" /> JWT Encrypted</div>
              <div className="flex items-center gap-1.5"><MI icon="shield" className="text-[18px]" /> RBAC Protected</div>
              <div className="flex items-center gap-1.5"><MI icon="verified" className="text-[18px]" /> Admin Controls</div>
              <div className="flex items-center gap-1.5"><MI icon="picture_as_pdf" className="text-[18px]" /> PDF Reports</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
