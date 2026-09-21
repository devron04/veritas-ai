import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { History, FileText, Trash2, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { fetchAnalyses, deleteAnalysis } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import type { AnalysisSummary } from "../types";
import { getScoreColor } from "../types";

export const AnalysisHistory: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalyses();
      setAnalyses(res.analyses);
    } catch (err: any) {
      if (!isInitialLoad.current) {
        setError(err.response?.data?.detail || "Failed to load past analyses.");
      }
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this analysis report?")) return;
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert("Failed to delete analysis.");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }} className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <History size={26} color="#3b82f6" />
            <span>Analysis History</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 4 }}>
            Past document scans and similarity reports saved in your database
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div style={{
        padding: "10px 16px", marginBottom: 24, borderRadius: 8,
        background: isAdmin ? "rgba(16, 185, 129, 0.1)" : "rgba(37, 99, 235, 0.1)",
        border: `1px solid ${isAdmin ? "rgba(16, 185, 129, 0.2)" : "rgba(37, 99, 235, 0.2)"}`,
        color: isAdmin ? "#059669" : "#2563eb", fontSize: "0.85rem", fontWeight: 600,
        display: "inline-block"
      }}>
        {isAdmin ? "Admin View: Showing scans from all users" : "Showing your personal scan history"}
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 16,
            borderRadius: "var(--radius-md)",
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#dc2626",
            marginBottom: 20,
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <RefreshCw size={36} color="#2563eb" className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading history records...</p>
        </div>
      ) : analyses.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {analyses.map((item) => {
            const score = item.overall_score || 0;
            const scoreColor = getScoreColor(score);

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 auto" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(37, 99, 235, 0.12)",
                      border: "1px solid rgba(37, 99, 235, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3b82f6",
                    }}
                  >
                    <FileText size={22} />
                  </div>

                  <div>
                    <Link
                      to={`/results/${item.id}`}
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        textDecoration: "none",
                      }}
                    >
                      {item.filename}
                    </Link>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 4 }}>
                      Checked on {new Date(item.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} •{" "}
                      {item.total_chunks} passages checked • {item.flagged_chunks} flagged
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: scoreColor }}>
                      {score.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                      Plagiarism
                    </div>
                  </div>

                  <Link
                    to={`/results/${item.id}`}
                    className="btn btn-secondary"
                    style={{ padding: "8px 14px", fontSize: "0.85rem" }}
                  >
                    <span>View Report</span>
                    <ArrowRight size={14} />
                  </Link>

                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: "8px 10px" }}
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Delete record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: "center", padding: "64px 20px" }}>
          <History size={48} color="var(--text-dim)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No Prior Scans Recorded</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 6, marginBottom: 20 }}>
            Upload or paste your first document to initiate automated plagiarism and paraphrase checking.
          </p>
          <Link to="/" className="btn btn-primary">
            <span>Start New Scan</span>
          </Link>
        </div>
      )}
    </div>
  );
};
