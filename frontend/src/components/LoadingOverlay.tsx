import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, FileText, Split, Cpu, Network, FileCheck } from "lucide-react";

interface LoadingOverlayProps {
  filename: string;
}

const PIPELINE_STEPS = [
  { icon: FileText, label: "Extracting document structure & formatting" },
  { icon: Split, label: "Sentence tokenization & citation detection" },
  { icon: Cpu, label: "TF-IDF lexical overlap & n-gram matching" },
  { icon: Network, label: "Sentence-Transformer semantic embeddings scan" },
  { icon: FileCheck, label: "Synthesizing similarity report & confidence metrics" },
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ filename }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Increment step to give realistic visual feedback while awaiting async API
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-modal-backdrop">
      <div className="glass-panel loading-modal-card animate-fade-in">
        <div style={{ display: "inline-flex", padding: 16, borderRadius: "50%", background: "rgba(37, 99, 235, 0.15)", marginBottom: 16 }}>
          <Loader2 size={36} color="#3b82f6" className="animate-spin" />
        </div>

        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 6 }}>
          Analyzing Plagiarism & Paraphrasing
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
          Scanning <span style={{ color: "#60a5fa", fontWeight: 600 }}>{filename}</span> across hybrid detection layers
        </p>

        <div className="loading-steps">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div
                key={idx}
                className={`loading-step-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
              >
                {isDone ? (
                  <CheckCircle2 size={18} color="#10b981" />
                ) : isActive ? (
                  <Loader2 size={18} color="#2563eb" className="animate-spin" />
                ) : (
                  <Icon size={18} color="var(--text-dim)" />
                )}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24, padding: "10px 14px", borderRadius: 8, background: "rgba(37, 99, 235, 0.03)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          Large documents with 50+ pages are chunked into batched tensor matrices for optimal speed.
        </div>
      </div>
    </div>
  );
};
