import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileSearch, History, Database, Cpu } from "lucide-react";
import { healthCheck } from "../hooks/useApi";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await healthCheck();
      if (mounted) setIsHealthy(ok);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="brand-logo">
          <img
            src="/logo.jpg"
            alt="Veritas AI"
            className="brand-logo-img"
          />
          <div>
            <span style={{ color: "#1e293b" }}>Veritas</span>
            <span className="gradient-text" style={{ marginLeft: 5 }}>AI</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            <FileSearch size={16} />
            <span>Scan Document</span>
          </Link>

          <Link
            to="/history"
            className={`nav-link ${location.pathname === "/history" ? "active" : ""}`}
          >
            <History size={16} />
            <span>Analysis History</span>
          </Link>

          <Link
            to="/references"
            className={`nav-link ${location.pathname === "/references" ? "active" : ""}`}
          >
            <Database size={16} />
            <span>Reference Corpus</span>
          </Link>
        </nav>

        {/* Server Health Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="status-pill"
            style={{
              borderColor: isHealthy ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              background: isHealthy ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              color: isHealthy ? "#059669" : "#dc2626",
            }}
          >
            <span
              className="status-dot"
              style={{
                background: isHealthy ? "#10b981" : "#ef4444",
                boxShadow: isHealthy ? "0 0 6px #10b981" : "0 0 6px #ef4444",
              }}
            />
            <span>{isHealthy ? "Engine Online" : "Connecting..."}</span>
          </div>

          <div
            title="Hybrid SBERT + TF-IDF Active"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.75rem",
              color: "var(--text-dim)",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(37, 99, 235, 0.04)",
              border: "1px solid rgba(37, 99, 235, 0.1)",
            }}
          >
            <Cpu size={14} color="#2563eb" />
            <span>Hybrid NLP</span>
          </div>
        </div>
      </div>
    </header>
  );
};
