import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { FileUpload } from "./components/FileUpload";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { AnalysisHistory } from "./components/AnalysisHistory";
import { ReferenceDocs } from "./components/ReferenceDocs";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import "./styles/components.css";

// ---------------------------------------------------------------------------
// Protected Route — redirects to /login if not authenticated
// ---------------------------------------------------------------------------
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #e2e8f0", borderTopColor: "#2563eb",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// ---------------------------------------------------------------------------
// Inner App (needs to be inside BrowserRouter to use useLocation)
// ---------------------------------------------------------------------------
const AppInner: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <main style={{ flex: "1 0 auto" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><FileUpload /></ProtectedRoute>} />
          <Route path="/results/:id" element={<ProtectedRoute><ResultsDashboard /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><AnalysisHistory /></ProtectedRoute>} />
          <Route path="/references" element={<ProtectedRoute><ReferenceDocs /></ProtectedRoute>} />

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
