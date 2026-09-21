import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { FileUpload } from "./components/FileUpload";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { AnalysisHistory } from "./components/AnalysisHistory";
import { ReferenceDocs } from "./components/ReferenceDocs";
import { AuthModal } from "./components/AuthModal";
import { AuthProvider } from "./hooks/useAuth";
import "./styles/components.css";

// ---------------------------------------------------------------------------
// Inner App (needs to be inside BrowserRouter to use useLocation)
// ---------------------------------------------------------------------------
const AppInner: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <AuthModal />

      <main style={{ flex: "1 0 auto" }}>
        <Routes>
          {/* Main Application Routes */}
          <Route path="/" element={<FileUpload />} />
          <Route path="/scan" element={<FileUpload />} />
          <Route path="/results/:id" element={<ResultsDashboard />} />
          <Route path="/history" element={<AnalysisHistory />} />
          <Route path="/references" element={<ReferenceDocs />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
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
            <strong style={{ color: "#1e40af" }}>Veritas AI</strong> <span style={{ color: "#94a3b8" }}>•</span> Intelligent Plagiarism &amp; Paraphrase Detector
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
  );
};

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
