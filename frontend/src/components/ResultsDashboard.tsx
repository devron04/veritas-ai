import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileText, Download, ShieldCheck, AlertTriangle, FileSpreadsheet,
  ArrowLeft, RefreshCw, Layers, CheckCircle, Split
} from "lucide-react";
import { fetchAnalysis, downloadReport } from "../hooks/useApi";
import type { Analysis } from "../types";
import { getScoreColor, getScoreCategory } from "../types";
import { HighlightedText } from "./HighlightedText";
import { FindingsList } from "./FindingsList";
import { SourcesList } from "./SourcesList";

export const ResultsDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "findings" | "sources">("text");
  const [downloading, setDownloading] = useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAnalysis(id);
      setAnalysis(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load analysis results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id || !analysis) return;
    try {
      setDownloading(true);
      const blob = await downloadReport(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${analysis.filename.replace(/\.[^/.]+$/, "")}_plagiarism_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <RefreshCw size={40} color="#2563eb" className="animate-spin" style={{ margin: "0 auto 16px" }} />
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Loading Analysis Report...</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: 6 }}>
          Retrieving flagged passages and similarity matrices
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", padding: 24, textAlign: "center" }} className="glass-panel">
        <AlertTriangle size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>Analysis Not Available</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error || "The requested analysis could not be located."}</p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} />
          <span>Return to Scanner</span>
        </Link>
      </div>
    );
  }

  const overallScore = analysis.overall_score || 0;
  const originalityScore = analysis.originality_score ?? Math.max(0, 100 - overallScore);
  const scoreColor = getScoreColor(overallScore);
  const scoreCategory = getScoreCategory(overallScore);

  // SVG Gauge calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const findings = Array.isArray(analysis.findings) ? analysis.findings : [];
  const quotedCount = findings.filter((f) => f && f.is_quoted).length;

  // Compute document stats from original text
  const docText = analysis.original_text || "";
  const totalCharacters = docText.length;
  // Use Intl.Segmenter (Unicode standard) to match MS Word / Google Docs word count
  const totalWords = (() => {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("en", { granularity: "word" });
      let count = 0;
      for (const segment of segmenter.segment(docText)) {
        if (segment.isWordLike) count++;
      }
      return count;
    }
    // Fallback: split on non-word characters
    return (docText.match(/\w+/g) || []).length;
  })();

  return (
    <div className="results-container animate-fade-in">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div>
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none", marginBottom: 8 }}
          >
            <ArrowLeft size={14} />
            <span>Scan Another Document</span>
          </Link>
          <h1 className="doc-info-title">
            <FileText size={26} color="#3b82f6" />
            <span>{analysis.filename}</span>
          </h1>
          <div className="doc-meta">
            <span>Analyzed on {new Date(analysis.created_at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}</span>
            <span> • </span>
            <span style={{ color: "#94a3b8" }}>
              {totalWords.toLocaleString()} words
            </span>
            <span> • </span>
            <span style={{ color: "#94a3b8" }}>
              {totalCharacters.toLocaleString()} characters
            </span>
            <span> • </span>
            <span style={{ textTransform: "capitalize", color: "#60a5fa", fontWeight: 600 }}>
              {scoreCategory} Document Profile
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            <Download size={16} />
            <span>{downloading ? "Generating PDF..." : "Download Official PDF"}</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="stats-grid">
        {/* Gauge Card */}
        <div className="glass-panel gauge-card">
          <div className="gauge-svg-container">
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="12"
              />
              {/* Animated Progress ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={scoreColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="gauge-center-text">
              <div className="gauge-score" style={{ color: scoreColor }}>
                {overallScore.toFixed(0)}%
              </div>
              <div className="gauge-label">Plagiarism</div>
            </div>
          </div>
        </div>

        {/* Stat 1: Originality */}
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Originality Score</span>
            <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#059669" }}>
            {originalityScore.toFixed(0)}%
          </div>
          <div className="stat-desc">Unique & unflagged phrasing content</div>
        </div>

        {/* Stat 2: Total Chunks */}
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Total Passages</span>
            <div className="stat-icon" style={{ background: "rgba(37, 99, 235, 0.15)", color: "#3b82f6" }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-value">{analysis.total_chunks}</div>
          <div className="stat-desc">Sentence clusters analyzed</div>
        </div>

        {/* Stat 3: Flagged Chunks */}
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Flagged Passages</span>
            <div className="stat-icon" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#ef4444" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: analysis.flagged_chunks > 0 ? "#ef4444" : "#94a3b8" }}>
            {analysis.flagged_chunks}
          </div>
          <div className="stat-desc">Matches exceeding threshold</div>
        </div>

        {/* Stat 4: Quoted & Cited */}
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Properly Cited</span>
            <div className="stat-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#7c3aed" }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#7c3aed" }}>{quotedCount}</div>
          <div className="stat-desc">Excluded from plagiarism tally</div>
        </div>
      </div>

      {/* Tiers Breakdown */}
      {analysis.tiers_used && (() => {
        const t1 = analysis.tiers_used.tier1_matches ?? 0;
        const t2 = analysis.tiers_used.tier2_matches ?? 0;
        const t3 = analysis.tiers_used.tier3_matches ?? 0;
        const totalMatches = t1 + t2 + t3;
        const t1Pct = totalMatches > 0 ? ((t1 / totalMatches) * 100).toFixed(0) : "0";
        const t2Pct = totalMatches > 0 ? ((t2 / totalMatches) * 100).toFixed(0) : "0";
        const t3Pct = totalMatches > 0 ? ((t3 / totalMatches) * 100).toFixed(0) : "0";

        return (
          <div className="glass-panel" style={{ marginTop: 20, padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={18} color="#3b82f6" />
              Detection Tier Contribution Breakdown
            </h3>

            {totalMatches > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Tier 1: Lexical */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>
                        Tier 1: Lexical (Exact Copy)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t1} match{t1 !== 1 ? "es" : ""}</span>
                      <span style={{
                        background: "rgba(16, 185, 129, 0.15)", color: "#10b981",
                        padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {t1Pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #10b981, #059669)",
                      width: `${t1Pct}%`, transition: "width 1s ease-in-out",
                    }} />
                  </div>
                </div>

                {/* Tier 2: Semantic */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>
                        Tier 2: Semantic AI (Paraphrase)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t2} match{t2 !== 1 ? "es" : ""}</span>
                      <span style={{
                        background: "rgba(37, 99, 235, 0.15)", color: "#3b82f6",
                        padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {t2Pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                      width: `${t2Pct}%`, transition: "width 1s ease-in-out",
                    }} />
                  </div>
                </div>

                {/* Tier 3: Web */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" }}>
                        Tier 3: Web Search (Internet)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{t3} match{t3 !== 1 ? "es" : ""}</span>
                      <span style={{
                        background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8",
                        padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700,
                      }}>
                        {t3Pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #0ea5e9, #0ea5e9)",
                      width: `${t3Pct}%`, transition: "width 1s ease-in-out",
                    }} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div className="stat-card" style={{ padding: 12, background: "rgba(37, 99, 235, 0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: analysis.tiers_used.tier1_lexical ? "#10b981" : "var(--text-dim)" }}>
                    Tier 1: Lexical (TF-IDF)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {analysis.tiers_used.tier1_lexical ? "Enabled (Exact matches)" : "Skipped"}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: 12, background: "rgba(37, 99, 235, 0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: analysis.tiers_used.tier2_semantic ? "#10b981" : "var(--text-dim)" }}>
                    Tier 2: Semantic AI
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {analysis.tiers_used.tier2_semantic ? "Enabled (Paraphrasing)" : "Skipped"}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: 12, background: "rgba(37, 99, 235, 0.03)", border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: analysis.tiers_used.tier3_web ? "#38bdf8" : "var(--text-dim)" }}>
                    Tier 3: Web Search
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {analysis.tiers_used.tier3_web ? "Enabled (Live internet)" : "Skipped/Failed"}
                  </div>
                </div>
              </div>
            )}

            {analysis.tiers_used.web_search_note && (
              <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} />
                {analysis.tiers_used.web_search_note}
              </div>
            )}
          </div>
        );
      })()}

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          type="button"
          className={`view-tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          <FileText size={16} />
          <span>Highlighted Document</span>
        </button>

        <button
          type="button"
          className={`view-tab-btn ${activeTab === "findings" ? "active" : ""}`}
          onClick={() => setActiveTab("findings")}
        >
          <FileSpreadsheet size={16} />
          <span>All Flagged Findings ({findings.length})</span>
        </button>

        <button
          type="button"
          className={`view-tab-btn ${activeTab === "sources" ? "active" : ""}`}
          onClick={() => setActiveTab("sources")}
        >
          <Split size={16} />
          <span>Matched Sources</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "text" && (
        <HighlightedText
          text={analysis.original_text || ""}
          findings={findings}
        />
      )}

      {activeTab === "findings" && (
        <FindingsList findings={findings} />
      )}

      {activeTab === "sources" && (
        <SourcesList findings={findings} />
      )}
    </div>
  );
};
