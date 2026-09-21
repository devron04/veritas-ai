import React, { useState, useRef } from "react";
import { UploadCloud, FileText, Clipboard, Sparkles, AlertCircle, FileCheck, ArrowRight } from "lucide-react";
import { analyzeFile, analyzeText } from "../hooks/useApi";
import { ProgressOverlay } from "./ProgressOverlay";

const SAMPLE_TEXT = `Artificial intelligence is rapidly transforming contemporary scientific inquiry and software development. In this study, we explore methods of modern natural language processing to benchmark automated plagiarism detection across academic literature. According to Vaswani et al. (2017), self-attention mechanisms allow models to compute representations of sequences without regard to their distance in input or output sequences. Machine learning algorithms, specifically deep neural networks, excel at capturing contextual semantic embeddings that surpass traditional lexical bag-of-words heuristics. However, improper attribution remains a persistent ethical dilemma in academia and creative industries alike.`;

export const FileUpload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [addToRepository, setAddToRepository] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const validExtensions = [".pdf", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMsg(`Invalid file type (${ext}). Please select a .pdf, .docx, or .txt file.`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = () => {
    setActiveTab("paste");
    setPastedText(SAMPLE_TEXT);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (activeTab === "upload") {
      if (!selectedFile) {
        setErrorMsg("Please choose or drop a document to scan.");
        return;
      }
      try {
        setIsSubmitting(true);
        const result = await analyzeFile(selectedFile, addToRepository);
        // Backend returns immediately with status="processing" — start polling
        setAnalysisId(result.id);
      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMsg(err.response?.data?.detail || "Failed to start analysis. Ensure backend is running.");
      }
    } else {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setErrorMsg("Please enter at least 20 characters of text to scan.");
        return;
      }
      try {
        setIsSubmitting(true);
        const result = await analyzeText(pastedText, "direct_input.txt", addToRepository);
        // Backend returns immediately with status="processing" — start polling
        setAnalysisId(result.id);
      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMsg(err.response?.data?.detail || "Failed to start analysis. Ensure backend is running.");
      }
    }
  };

  const wordCount = pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0;
  const charCount = pastedText.length;

  return (
    <>
      {isSubmitting && analysisId && (
        <ProgressOverlay
          analysisId={analysisId}
          filename={activeTab === "upload" ? selectedFile?.name || "document" : "Pasted Text"}
        />
      )}

      <div className="hero-section">
        <div className="hero-tag">
          <Sparkles size={14} />
          <span>Hybrid Lexical + Semantic Detection</span>
        </div>

        <h1 className="hero-title">
          Verify Document Originality with <br />
          <span className="gradient-text">Precision Intelligence</span>
        </h1>

        <p className="hero-subtitle">
          Advanced plagiarism & paraphrase scanner powered by scikit-learn TF-IDF,
          Sentence-Transformers embeddings, and citation-aware heuristics.
        </p>
      </div>

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Error Alert */}
        {errorMsg && (
          <div
            className="animate-fade-in"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#dc2626",
              marginBottom: 20,
              fontSize: "0.9rem",
            }}
          >
            <AlertCircle size={18} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="glass-panel" style={{ padding: 28 }}>
          {/* Top Bar with Tab Switcher & Sample Loader */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div className="tab-switcher">
              <button
                type="button"
                className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
                onClick={() => setActiveTab("upload")}
              >
                <UploadCloud size={16} />
                <span>Upload Document</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === "paste" ? "active" : ""}`}
                onClick={() => setActiveTab("paste")}
              >
                <Clipboard size={16} />
                <span>Paste Text</span>
              </button>
            </div>


          </div>

          {/* TAB 1: File Upload */}
          {activeTab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <div
                className={`dropzone ${isDragging ? "drag-active" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon-circle">
                  <UploadCloud size={32} />
                </div>
                <h3 className="dropzone-title">
                  {selectedFile ? "Replace Document" : "Choose a file or drag & drop"}
                </h3>
                <p className="dropzone-hint">
                  Supports Adobe PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt)
                </p>

                {selectedFile && (
                  <div className="file-pill" onClick={(e) => e.stopPropagation()}>
                    <FileCheck size={18} color="#2563eb" />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{selectedFile.name}</span>
                    <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Paste Text */}
          {activeTab === "paste" && (
            <div>
              <textarea
                className="paste-textarea"
                placeholder="Paste your essay, thesis chapter, article, or research text here to scan..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <div className="textarea-footer">
                <span>Direct analysis with character position tracking</span>
                <span>
                  <strong>{wordCount}</strong> words • <strong>{charCount}</strong> characters
                </span>
              </div>
            </div>
          )}

          {/* Submit Action & Repository Toggle */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={addToRepository}
                onChange={(e) => setAddToRepository(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                Index in institutional repository <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>(protects against future peer copying)</span>
              </span>
            </label>

            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "12px 28px", fontSize: "1rem" }}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <span>Scan for Plagiarism</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Informational Feature Highlights */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 28 }}>
          <div className="glass-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "#2563eb", fontWeight: 700, fontSize: "0.925rem" }}>
              <Sparkles size={16} />
              <span>Paraphrase Detection</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
              Captures rewritten sentences and synonym substitution using transformer vector embeddings.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "#059669", fontWeight: 700, fontSize: "0.925rem" }}>
              <FileCheck size={16} />
              <span>Citation Exclusions</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
              Properly quoted passages with author & year references (APA, MLA, IEEE) are flagged separately.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "#0284c7", fontWeight: 700, fontSize: "0.925rem" }}>
              <FileText size={16} />
              <span>Automated PDF Reports</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
              Generate and download publication-ready forensic PDF summaries with color-coded matches.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
