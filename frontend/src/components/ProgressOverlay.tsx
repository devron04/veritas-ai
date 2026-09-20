import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, CheckCircle2, FileText, Split, Cpu, Network, FileCheck,
  AlertCircle, Sparkles,
} from "lucide-react";
import { pollAnalysisStatus } from "../hooks/useApi";

interface ProgressOverlayProps {
  analysisId: string;
  filename: string;
}

const PIPELINE_STEPS = [
  { icon: FileText, label: "Extracting document structure", range: [0, 5] },
  { icon: Split,    label: "Chunking & citation detection", range: [5, 10] },
  { icon: Cpu,      label: "TF-IDF lexical overlap & n-gram matching", range: [10, 30] },
  { icon: Sparkles, label: "Semantic AI paraphrase detection", range: [30, 65] },
  { icon: Network,  label: "Web search & internet cross-reference", range: [65, 90] },
  { icon: FileCheck, label: "Synthesizing similarity report", range: [90, 100] },
];

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ analysisId, filename }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Queued for analysis...");
  const [status, setStatus] = useState<string>("processing");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const data = await pollAnalysisStatus(analysisId);
        setProgress(data.progress);
        setMessage(data.progress_message || "Processing...");
        setStatus(data.status);

        if (data.status === "completed") {
          setProgress(100);
          setMessage("Analysis complete! Redirecting...");
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => navigate(`/results/${analysisId}`), 800);
        } else if (data.status === "failed") {
          setProgress(100);
          setError(data.error_message || "Analysis failed unexpectedly.");
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        // Network hiccup — don't kill the polling
      }
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [analysisId, navigate]);

  const activeStepIndex = PIPELINE_STEPS.findIndex(
    (step) => progress < step.range[1]
  );

  return (
    <div className="loading-modal-backdrop">
      <div className="glass-panel loading-modal-card animate-fade-in" style={{ maxWidth: 520 }}>
        {/* Header icon */}
        <div style={{
          display: "inline-flex", padding: 16, borderRadius: "50%",
          background: status === "failed"
            ? "rgba(239, 68, 68, 0.08)"
            : "rgba(37, 99, 235, 0.08)",
          marginBottom: 16,
        }}>
          {status === "failed" ? (
            <AlertCircle size={36} color="#ef4444" />
          ) : (
            <Loader2 size={36} color="#2563eb" className="animate-spin" />
          )}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
          {status === "failed" ? "Analysis Failed" : "Analyzing Document"}
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
          {status === "failed" ? (
            <span style={{ color: "#dc2626" }}>{error}</span>
          ) : (
            <>Scanning <span style={{ color: "#2563eb", fontWeight: 600 }}>{filename}</span></>
          )}
        </p>

        {/* Progress bar */}
        {status !== "failed" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 8,
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {message}
              </span>
              <span style={{
                fontSize: "1.1rem", fontWeight: 800,
                background: "linear-gradient(135deg, #1e40af, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {Math.round(progress)}%
              </span>
            </div>

            {/* Main progress bar */}
            <div style={{
              height: 12, borderRadius: 6,
              background: "rgba(37, 99, 235, 0.08)",
              overflow: "hidden", position: "relative",
            }}>
              <div style={{
                height: "100%", borderRadius: 6,
                background: "linear-gradient(90deg, #1e40af, #2563eb, #3b82f6)",
                width: `${progress}%`,
                transition: "width 0.5s ease-out",
                boxShadow: "0 0 12px rgba(37, 99, 235, 0.3)",
              }} />
              {/* Shimmer effect */}
              {progress < 100 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  animation: "shimmer 2s infinite",
                }} />
              )}
            </div>
          </div>
        )}

        {/* Pipeline steps */}
        <div className="loading-steps">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = progress >= step.range[1];
            const isActive = idx === activeStepIndex;

            return (
              <div
                key={idx}
                className={`loading-step-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} color="#059669" />
                ) : isActive ? (
                  <Loader2 size={18} color="#2563eb" className="animate-spin" />
                ) : (
                  <Icon size={18} color="var(--text-dim)" />
                )}
                <span>{step.label}</span>
                {isDone && (
                  <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#059669", fontWeight: 600 }}>
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {status !== "failed" && (
          <div style={{
            marginTop: 20, padding: "10px 14px", borderRadius: 8,
            background: "rgba(37, 99, 235, 0.04)",
            fontSize: "0.75rem", color: "var(--text-dim)",
            border: "1px solid rgba(37, 99, 235, 0.08)",
          }}>
            Large documents with 50+ pages are chunked into batched tensor matrices for optimal speed.
          </div>
        )}

        {status === "failed" && (
          <button
            onClick={() => navigate("/")}
            className="btn btn-primary"
            style={{ marginTop: 16, padding: "10px 24px" }}
          >
            Try Again
          </button>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
