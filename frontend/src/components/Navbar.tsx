import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileSearch, History, Database, Cpu, LogOut, UserCircle } from "lucide-react";
import { healthCheck } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

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

        {/* Right side: status + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!isAuthPage && (
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
          )}

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

          {/* User section */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: "0.85rem",
                cursor: "pointer", flexShrink: 0,
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }} title={user.full_name}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                title="Sign out"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "6px 10px",
                  color: "#64748b", cursor: "pointer", fontSize: "0.8rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          ) : !isAuthPage ? (
            <Link
              to="/login"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#fff", borderRadius: 8, padding: "7px 14px",
                fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}
            >
              <UserCircle size={14} />
              <span>Sign In</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
};
