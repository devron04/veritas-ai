import React, { useState } from "react";
import type { Finding } from "../types";
import { getScoreColor } from "../types";
import { ShieldAlert, ExternalLink, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface HighlightedTextProps {
  text?: string;
  findings?: Finding[];
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text = "", findings = [] }) => {
  const safeFindings = Array.isArray(findings) ? findings : [];
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    safeFindings.length > 0 ? safeFindings[0].id : null
  );

  const selectedFinding = safeFindings.find((f) => f.id === selectedFindingId) || null;
  const selectedIndex = safeFindings.findIndex((f) => f.id === selectedFindingId);

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelectedFindingId(safeFindings[selectedIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (selectedIndex < safeFindings.length - 1) {
      setSelectedFindingId(safeFindings[selectedIndex + 1].id);
    }
  };

  // Render text with highlights
  // Build segments based on finding positions
  const renderHighlightedContent = () => {
    const docText = text || "";
    if (!docText) {
      return (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          No document text available to display.
        </div>
      );
    }

    if (safeFindings.length === 0) {
      return <div>{docText}</div>;
    }

    // Sort findings by start_char
    const validFindings = safeFindings
      .filter((f) => f.start_char !== null && f.end_char !== null && f.start_char !== undefined && f.end_char !== undefined && f.start_char >= 0 && f.end_char <= docText.length)
      .sort((a, b) => (a.start_char || 0) - (b.start_char || 0));

    if (validFindings.length === 0) {
      return <div>{docText}</div>;
    }

    const elements: React.ReactNode[] = [];
    let currentPos = 0;

    validFindings.forEach((finding, idx) => {
      const start = finding.start_char || 0;
      const end = finding.end_char || 0;

      // Handle non-highlighted text before this finding
      if (start > currentPos) {
        elements.push(
          <span key={`text-${idx}`}>{text.substring(currentPos, start)}</span>
        );
      }

      // Determine highlight style
      let highlightClass = "hl-passage ";
      if (finding.is_quoted) {
        highlightClass += "hl-quoted";
      } else {
        highlightClass += "hl-exact"; // Red for all plagiarism
      }

      if (finding.id === selectedFindingId) {
        highlightClass += " active";
      }

      // Tooltip to explain *why*
      const matchReason = "Plagiarized match";

      elements.push(
        <mark
          key={`finding-${finding.id}`}
          className={highlightClass}
          onClick={() => setSelectedFindingId(finding.id)}
          title={`${matchReason}: ${(finding.similarity_score * 100).toFixed(0)}% from ${finding.source_name || "Unknown"}`}
        >
          {text.substring(start, end)}
        </mark>
      );

      currentPos = Math.max(currentPos, end);
    });

    // Trailing text
    if (currentPos < text.length) {
      elements.push(
        <span key="text-end">{text.substring(currentPos)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="highlight-layout">
      {/* Main Document Reader */}
      <div className="glass-panel text-viewer-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Interactive Document Passage View
          </span>
          <div style={{ display: "flex", gap: 14, fontSize: "0.75rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-exact)" }} />
              <span>Plagiarized</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--color-quoted)" }} />
              <span>Cited / Quoted</span>
            </span>
          </div>
        </div>

        <div style={{ lineHeight: 1.85, fontSize: "1rem" }}>
          {renderHighlightedContent()}
        </div>
      </div>

      {/* Detail Inspector Sidebar */}
      <div className="glass-panel inspector-card">
        <div className="inspector-title">
          <ShieldAlert size={18} color="#2563eb" />
          <span>Passage Inspector</span>
        </div>

        {findings.length > 0 && selectedFinding ? (
          <div>
            {/* Inspector Navigation Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Match {selectedIndex + 1} of {findings.length}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 8px" }}
                  onClick={handlePrev}
                  disabled={selectedIndex <= 0}
                  title="Previous match"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 8px" }}
                  onClick={handleNext}
                  disabled={selectedIndex >= findings.length - 1}
                  title="Next match"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Match Score & Badges */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: getScoreColor(selectedFinding.similarity_score * 100) }}>
                  {(selectedFinding.similarity_score * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Similarity Overlap</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                {!selectedFinding.is_quoted ? (
                  <span className="badge badge-exact">
                    Plagiarized Match
                  </span>
                ) : (
                  <span className="badge badge-quoted">
                    <Quote size={10} /> Cited Text
                  </span>
                )}
              </div>
            </div>

            {/* Original Passage Snippet */}
            <div className="match-source-box">
              <label>Flagged In Document</label>
              <p style={{ color: "#1e293b", fontStyle: "italic", fontSize: "0.875rem", lineHeight: 1.5 }}>
                "{selectedFinding.chunk_text}"
              </p>
            </div>

            {/* Matched Reference Snippet */}
            <div className="match-source-box" style={{ borderColor: "rgba(37, 99, 235, 0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ color: "#3b82f6" }}>Matched Source Material</label>
                {selectedFinding.match_type === "web" && selectedFinding.source_name && (
                  <a
                    href={selectedFinding.source_name}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.75rem" }}
                  >
                    <span>View URL</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 6, wordBreak: "break-all" }}>
                {selectedFinding.source_name || "Unknown Reference Source"}
              </div>

              <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.5 }}>
                {selectedFinding.source_text || "Context matched from reference vector index."}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "0.9rem" }}>No flagged passages found in this document.</p>
            <p style={{ fontSize: "0.775rem", color: "var(--text-dim)", marginTop: 6 }}>
              All passages scored within normal original thresholds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
