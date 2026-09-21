import React, { useState, useEffect } from "react";
import { useAuth, type AuthModalView } from "../hooks/useAuth";
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AuthModal: React.FC = () => {
  const { authModalView, closeAuthModal, openAuthModal, login, register } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AuthModalView>(authModalView);
  
  // Sync local view with global view
  useEffect(() => {
    if (authModalView) setView(authModalView);
  }, [authModalView]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalView) return null;

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordStrong = password.length >= 8;

  const handleClose = () => {
    // reset state
    setEmail("");
    setPassword("");
    setFullName("");
    setConfirmPassword("");
    setError(null);
    closeAuthModal();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      handleClose();
      navigate("/scan"); // Go to dashboard after login
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (!passwordStrong) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      await register(email, fullName, password);
      handleClose();
      navigate("/scan"); // Go to dashboard after register
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleView = (newView: AuthModalView) => {
    setError(null);
    setView(newView);
    openAuthModal(newView);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px 12px 40px",
    borderRadius: 12, border: "1.5px solid #e2e8f0",
    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s", fontFamily: "inherit",
  };

  const isLogin = view === "login";

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999999, animation: "fadeIn 0.2s ease-out", padding: 20
    }}>
      <div style={{
        background: "#fff",
        width: "100%",
        maxWidth: 420,
        borderRadius: 24,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        position: "relative",
        animation: "slideUp 0.3s ease-out"
      }}>
        {/* Close Button */}
        <button 
          onClick={handleClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "#f1f5f9", border: "none", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#64748b", transition: "all 0.2s", zIndex: 10
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
        >
          <X size={18} />
        </button>

        <div style={{
          background: "linear-gradient(135deg, #2563eb, #4f46e5)",
          padding: "40px 32px 32px",
          color: "#fff",
          textAlign: "center"
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: "rgba(255,255,255,1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 8px 16px rgba(0,0,0,0.1)", overflow: "hidden"
          }}>
            <img src="/favicon.jpg" alt="Veritas AI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 700 }}>
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
            {isLogin ? "Enter your details to access your dashboard." : "Join Veritas AI and secure your content."}
          </p>
        </div>

        <div style={{ padding: "32px" }}>
          {error && (
            <div style={{
              background: "#fef2f2", color: "#b91c1c", padding: "12px 16px",
              borderRadius: 8, fontSize: "0.85rem", marginBottom: 20,
              display: "flex", alignItems: "flex-start", gap: 10, border: "1px solid #fecaca"
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <div style={{ position: "relative" }}>
                <User size={18} color="#94a3b8" style={{ position: "absolute", left: 14, top: 14 }} />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>
            )}

            <div style={{ position: "relative" }}>
              <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: 14, top: 14 }} />
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            <div style={{ position: "relative" }}>
              <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: 14, top: 14 }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 12, top: 12,
                  background: "none", border: "none", color: "#94a3b8", cursor: "pointer"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {!isLogin && (
              <div style={{ position: "relative" }}>
                <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: 14, top: 14 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: confirmPassword.length > 0 ? (passwordsMatch ? "#10b981" : "#ef4444") : "#e2e8f0"
                  }}
                  onFocus={(e) => {
                    if (confirmPassword.length === 0) e.target.style.borderColor = "#2563eb";
                  }}
                />
                {confirmPassword.length > 0 && passwordsMatch && (
                  <CheckCircle2 size={18} color="#10b981" style={{ position: "absolute", right: 14, top: 14 }} />
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#93c5fd" : "#2563eb",
                color: "#fff",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 8,
                transition: "background 0.2s",
                boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#2563eb"; }}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
          
          <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.9rem", color: "#64748b" }}>
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button 
                  onClick={() => toggleView("register")}
                  style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button 
                  onClick={() => toggleView("login")}
                  style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
