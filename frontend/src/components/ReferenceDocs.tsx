import React, { useEffect, useState, useRef } from "react";
import { Database, UploadCloud, Trash2, FileText, Plus, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { fetchDocuments, uploadReferenceDoc, deleteDocument } from "../hooks/useApi";
import type { ReferenceDocument } from "../types";

export const ReferenceDocs: React.FC = () => {
  const [documents, setDocuments] = useState<ReferenceDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDocuments();
      setDocuments(res.documents);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load reference documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);
      const newDoc = await uploadReferenceDoc(file);
      setDocuments((prev) => [newDoc, ...prev]);
      setSuccessMsg(`"${file.name}" was indexed into the reference corpus.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload reference document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from the reference corpus?`)) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSuccessMsg(`Removed "${name}" from the corpus.`);
    } catch (err) {
      alert("Failed to delete document from corpus.");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }} className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={26} color="#3b82f6" />
            <span>Reference Corpus</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 4 }}>
            The offline vector database that uploaded documents are checked against using TF-IDF and semantic embeddings
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Plus size={16} />
            <span>{uploading ? "Indexing Document..." : "Add Reference Document"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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

      {successMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 14,
            borderRadius: "var(--radius-md)",
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6ee7b7",
            marginBottom: 20,
            fontSize: "0.875rem",
          }}
        >
          <Sparkles size={16} color="#10b981" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Corpus Info Card */}
      <div className="glass-panel" style={{ padding: 20, marginBottom: 24, background: "rgba(37, 99, 235, 0.06)", borderColor: "rgba(37, 99, 235, 0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Sparkles size={18} color="#3b82f6" />
          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
            How the Reference Corpus Operates
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          When you check a new paper or PDF for plagiarism, the engine breaks it into sentences and runs a fast TF-IDF character n-gram cosine pass, followed by deep transformer vector comparisons against every document indexed here. You can upload reference articles, previous student submissions, books, or published papers.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <RefreshCw size={36} color="#2563eb" className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading reference documents...</p>
        </div>
      ) : documents.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="glass-panel"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                  }}
                >
                  <FileText size={20} />
                </div>

                <div>
                  {(() => {
                    const fname = doc.filename;
                    let label = "Uploaded";
                    let displayName = fname;
                    let bg = "rgba(168, 85, 247, 0.15)";
                    let border = "rgba(168, 85, 247, 0.35)";
                    let color = "#d8b4fe";

                    if (fname.startsWith("[Submission]")) {
                      label = "Submission";
                      displayName = fname.replace("[Submission]", "").trim();
                      bg = "rgba(37, 99, 235, 0.15)";
                      border = "rgba(37, 99, 235, 0.35)";
                      color = "#60a5fa";
                    } else if (fname.startsWith("[Seed]")) {
                      label = "Academic Seed";
                      displayName = fname.replace("[Seed]", "").trim();
                      bg = "rgba(16, 185, 129, 0.15)";
                      border = "rgba(16, 185, 129, 0.35)";
                      color = "#6ee7b7";
                    } else if (fname.startsWith("[Web]")) {
                      label = "Web Promoted";
                      displayName = fname.replace("[Web]", "").trim();
                      bg = "rgba(245, 158, 11, 0.15)";
                      border = "rgba(245, 158, 11, 0.35)";
                      color = "#fcd34d";
                    }

                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.975rem", fontWeight: 700, color: "#1e293b" }}>
                          {displayName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: bg,
                            border: `1px solid ${border}`,
                            color: color,
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 4 }}>
                    Indexed on {new Date(doc.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })} •{" "}
                    <strong>{doc.word_count.toLocaleString()}</strong> words extracted
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ padding: "6px 10px" }}
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  title="Remove from corpus"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: "center", padding: "64px 20px" }}>
          <UploadCloud size={48} color="var(--text-dim)" style={{ margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Corpus is Currently Empty</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 6, marginBottom: 20 }}>
            Upload source documents (.pdf, .docx, .txt) to seed your local plagiarism detection database.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={16} />
            <span>Upload Reference Material</span>
          </button>
        </div>
      )}
    </div>
  );
};
