import React from "react";
import type { Finding } from "../types";
import { getScoreColor, getMatchTypeLabel } from "../types";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

interface SourcesListProps {
  findings?: Finding[];
}

interface AggregatedSource {
  sourceName: string;
  matchCount: number;
  avgSimilarity: number;
  maxSimilarity: number;
  matchTypes: Set<string>;
  sampleSnippet: string;
  isWeb: boolean;
}

export const SourcesList: React.FC<SourcesListProps> = ({ findings = [] }) => {
  const safeFindings = Array.isArray(findings) ? findings : [];
  // Aggregate findings by source
  const sourceMap = new Map<string, AggregatedSource>();

  safeFindings.forEach((f) => {
    const key = f.source_name || "Internal Reference Corpus";
    const existing = sourceMap.get(key);

    if (existing) {
      existing.matchCount += 1;
      existing.avgSimilarity =
        (existing.avgSimilarity * (existing.matchCount - 1) + f.similarity_score) /
        existing.matchCount;
      existing.maxSimilarity = Math.max(existing.maxSimilarity, f.similarity_score);
      existing.matchTypes.add(f.match_type);
    } else {
      sourceMap.set(key, {
        sourceName: key,
        matchCount: 1,
        avgSimilarity: f.similarity_score,
        maxSimilarity: f.similarity_score,
        matchTypes: new Set([f.match_type]),
        sampleSnippet: f.source_text || "",
        isWeb: f.match_type === "web" || key.startsWith("http"),
      });
    }
  });

  const sources = Array.from(sourceMap.values()).sort(
    (a, b) => b.maxSimilarity - a.maxSimilarity
  );

  return (
    <div className="glass-panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
            Attributed Reference Sources
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Found {sources.length} unique source documents / locations matching flagged passages.
          </p>
        </div>
      </div>

      {sources.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sources.map((src, idx) => {
            const maxScorePercent = (src.maxSimilarity * 100).toFixed(0);
            const avgScorePercent = (src.avgSimilarity * 100).toFixed(0);
            const scoreColor = getScoreColor(src.maxSimilarity * 100);

            return (
              <div
                key={idx}
                style={{
                  padding: 18,
                  borderRadius: "var(--radius-md)",
                  background: "rgba(241, 245, 249, 0.45)",
                  border: "1px solid var(--border-glass)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {src.isWeb ? (
                      <ExternalLink size={16} color="#38bdf8" />
                    ) : (
                      <BookOpen size={16} color="#3b82f6" />
                    )}

                    <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                      {src.sourceName}
                    </span>

                    {src.isWeb && (
                      <a
                        href={src.sourceName}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "2px 8px", fontSize: "0.75rem", borderRadius: 4 }}
                      >
                        Visit Site
                      </a>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {Array.from(src.matchTypes).map((type) => (
                      <span key={type} className={`badge badge-${type}`} style={{ fontSize: "0.7rem" }}>
                        {getMatchTypeLabel(type)}
                      </span>
                    ))}
                    <span style={{ fontSize: "0.775rem", color: "var(--text-dim)", alignSelf: "center" }}>
                      {src.matchCount} matched {src.matchCount === 1 ? "passage" : "passages"}
                    </span>
                  </div>

                  {src.sampleSnippet && (
                    <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: 10, fontStyle: "italic", borderLeft: "2px solid rgba(37, 99, 235, 0.4)", paddingLeft: 10 }}>
                      "{src.sampleSnippet.length > 180 ? src.sampleSnippet.substring(0, 177) + "..." : src.sampleSnippet}"
                    </p>
                  )}
                </div>

                <div style={{ textAlign: "right", minWidth: 140 }}>
                  <div style={{ fontSize: "1.45rem", fontWeight: 800, color: scoreColor }}>
                    {maxScorePercent}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    Peak Overlap
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Avg: {avgScorePercent}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
          <ShieldCheck size={40} color="#10b981" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "1rem", fontWeight: 600 }}>Zero External Sources Matched</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: 4 }}>
            The checked document contains completely original phrasing relative to all known reference indices.
          </p>
        </div>
      )}
    </div>
  );
};
