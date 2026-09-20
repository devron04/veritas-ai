import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { FileUpload } from "./components/FileUpload";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { AnalysisHistory } from "./components/AnalysisHistory";
import { ReferenceDocs } from "./components/ReferenceDocs";
import "./styles/components.css";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />

        <main style={{ flex: "1 0 auto" }}>
          <Routes>
            <Route path="/" element={<FileUpload />} />
            <Route path="/results/:id" element={<ResultsDashboard />} />
            <Route path="/history" element={<AnalysisHistory />} />
            <Route path="/references" element={<ReferenceDocs />} />
          </Routes>
        </main>

        <footer
          style={{
            borderTop: "1px solid rgba(30, 64, 130, 0.08)",
            padding: "24px 20px",
            textAlign: "center",
            fontSize: "0.825rem",
            color: "var(--text-dim)",
            background: "#ffffff",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <strong style={{ color: "#1e40af" }}>Veritas AI</strong> <span style={{ color: "#94a3b8" }}>•</span> Intelligent Plagiarism & Paraphrase Detector
            </div>
            <div style={{ display: "flex", gap: 16, color: "#94a3b8" }}>
              <span>Originality</span>
              <span>•</span>
              <span>Clarity</span>
              <span>•</span>
              <span>Trust</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
