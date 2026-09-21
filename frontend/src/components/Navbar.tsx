import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileSearch, History, Database, Cpu, LogOut, UserCircle } from "lucide-react";
import { healthCheck } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, openAuthModal } = useAuth();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
    <>
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
        {user && (
          <nav className="nav-links">
            <Link
              to="/scan"
              className={`nav-link ${location.pathname === "/scan" ? "active" : ""}`}
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
        )}

        {/* Right side: status + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>


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
                onClick={() => setShowLogoutConfirm(true)}
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
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#fff", border: "none", cursor: "pointer",
                borderRadius: 8, padding: "7px 14px",
                fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
              }}
            >
              <UserCircle size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

    </header>

      {showLogoutConfirm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)",
            width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "16px",
            animation: "slideUp 0.2s ease-out"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "center" }}>
              <div style={{ margin: "0 auto", background: "#eff6ff", color: "#2563eb", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                <LogOut size={24} />
              </div>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem" }}>Sign Out</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>Are you sure you want to sign out of your account?</p>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", background: "#f1f5f9",
                  color: "#475569", border: "none", fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                  navigate("/login");
                }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", background: "#2563eb",
                  color: "#fff", border: "none", fontWeight: 600, cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#2563eb"}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
