import React, { useState } from "react";
import type { Finding } from "../types";
import { getScoreColor, getMatchTypeLabel } from "../types";
import { Search, Filter, Quote, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface FindingsListProps {
  findings?: Finding[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings = [] }) => {
  const safeFindings = Array.isArray(findings) ? findings : [];
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const filteredFindings = safeFindings.filter((f) => {
    const matchesSearch =
      f.chunk_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.source_name && f.source_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.source_text && f.source_text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === "all") return true;
    if (filterType === "cited") return f.is_quoted;
    if (filterType === "plagiarized") return !f.is_quoted && f.similarity_score >= 0.8;
    if (filterType === "suspicious") return !f.is_quoted && f.similarity_score >= 0.5 && f.similarity_score < 0.8;
    return f.match_type === filterType;
  });

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      {/* Search & Filter Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div style={{ position: "relative", minWidth: 280, flex: "1 1 auto", maxWidth: 450 }}>
          <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search within flagged passages or source names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(241, 245, 249, 0.6)",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-sm)",
              padding: "9px 14px 9px 38px",
              color: "var(--text-main)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} color="var(--text-dim)" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: "rgba(241, 245, 249, 0.6)",
              border: "1px solid var(--border-glass)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 14px",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Findings ({findings.length})</option>
            <option value="plagiarized">Plagiarized (&ge; 80%)</option>
            <option value="suspicious">Suspicious (50-79%)</option>
            <option value="cited">Properly Cited</option>
            <option value="exact">Exact Match</option>
            <option value="paraphrase">Paraphrase</option>
            <option value="web">Web Source</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        {filteredFindings.length > 0 ? (
          <table className="findings-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Match %</th>
                <th>Passage Snippet</th>
                <th>Source Material</th>
                <th style={{ width: 130 }}>Classification</th>
                <th style={{ width: 80, textAlign: "center" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((finding) => {
                const scorePercent = (finding.similarity_score * 100).toFixed(0);
                const scoreColor = getScoreColor(finding.similarity_score * 100);
                const isExpanded = expandedRowId === finding.id;

                return (
                  <React.Fragment key={finding.id}>
                    <tr onClick={() => toggleExpand(finding.id)} style={{ cursor: "pointer" }}>
                      <td>
                        <div style={{ fontWeight: 800, color: scoreColor, fontSize: "1.05rem" }}>
                          {scorePercent}%
                        </div>
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{ width: `${scorePercent}%`, background: scoreColor }}
                          />
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, color: "#1e293b", maxWidth: 440, lineHeight: 1.5 }}>
                          "{finding.chunk_text.length > 120 ? finding.chunk_text.substring(0, 118) + "..." : finding.chunk_text}"
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 600 }}>
                          {finding.source_name || "Reference Index"}
                        </div>
                        {finding.match_type === "web" && (
                          <span style={{ fontSize: "0.75rem", color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <span>Web match</span>
                            <ExternalLink size={10} />
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className={`badge badge-${finding.match_type}`}>
                            {getMatchTypeLabel(finding.match_type)}
                          </span>
                          {finding.is_quoted && (
                            <span className="badge badge-quoted">
                              <Quote size={10} /> Cited
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "center", color: "var(--text-dim)" }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ background: "rgba(10, 15, 26, 0.7)", padding: 20 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div style={{ padding: 14, borderRadius: 8, background: "rgba(37, 99, 235, 0.03)", border: "1px solid var(--border-subtle)" }}>
                              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: 700, marginBottom: 6 }}>
                                Full Passage in Analyzed Document
                              </div>
                              <p style={{ fontSize: "0.9rem", color: "#1e293b", lineHeight: 1.6, fontStyle: "italic" }}>
                                "{finding.chunk_text}"
                              </p>
                            </div>

                            <div style={{ padding: 14, borderRadius: 8, background: "rgba(37, 99, 235, 0.03)", border: "1px solid rgba(37, 99, 235, 0.25)" }}>
                              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#3b82f6", fontWeight: 700, marginBottom: 6 }}>
                                Matched Content from Source ({finding.source_name})
                              </div>
                              <p style={{ fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.6 }}>
                                {finding.source_text || "Context matched from reference vector embeddings."}
                              </p>
                            </div>
                          </div>

                          {/* Forensic "Why Flagged" Section */}
                          <div style={{
                            marginTop: 16, padding: 16, borderRadius: 8,
                            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(139, 92, 246, 0.08))",
                            border: "1px solid rgba(139, 92, 246, 0.2)",
                          }}>
                            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#7c3aed", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                              Why This Was Flagged
                            </div>

                            {finding.flag_reason && (
                              <p style={{ fontSize: "0.875rem", color: "#e2e8f0", lineHeight: 1.6, marginBottom: 14 }}>
                                {finding.flag_reason}
                              </p>
                            )}

                            {/* Individual Tier Score Bars */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                              {/* TF-IDF Score */}
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Lexical (TF-IDF)</span>
                                  <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 700 }}>
                                    {((finding.tfidf_score || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 3,
                                    background: "linear-gradient(90deg, #10b981, #059669)",
                                    width: `${((finding.tfidf_score || 0) * 100).toFixed(0)}%`,
                                    transition: "width 0.8s ease",
                                  }} />
                                </div>
                              </div>

                              {/* Semantic Score */}
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Semantic AI</span>
                                  <span style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 700 }}>
                                    {((finding.semantic_score || 0) * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 3,
                                    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                                    width: `${((finding.semantic_score || 0) * 100).toFixed(0)}%`,
                                    transition: "width 0.8s ease",
                                  }} />
                                </div>
                              </div>

                              {/* Combined Score */}
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Combined</span>
                                  <span style={{ fontSize: "0.75rem", color: scoreColor, fontWeight: 700 }}>
                                    {scorePercent}%
                                  </span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 3,
                                    background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
                                    width: `${scorePercent}%`,
                                    transition: "width 0.8s ease",
                                  }} />
                                </div>
                              </div>
                            </div>

                            {/* Tier badge */}
                            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Flagged by:</span>
                              {finding.match_type === "web" && (
                                <span style={{
                                  background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8",
                                  padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700,
                                }}>Tier 3 — Web Search</span>
                              )}
                              {finding.match_type === "exact" && (
                                <span style={{
                                  background: "rgba(16, 185, 129, 0.15)", color: "#10b981",
                                  padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700,
                                }}>Tier 1 — Lexical</span>
                              )}
                              {finding.match_type === "paraphrase" && (
                                <span style={{
                                  background: "rgba(37, 99, 235, 0.15)", color: "#3b82f6",
                                  padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700,
                                }}>Tier 2 — Semantic AI</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "1rem" }}>No findings match your current filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
