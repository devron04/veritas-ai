import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ShieldCheck, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordStrong = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (!passwordStrong) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      await register(email, fullName, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px 12px 40px",
    borderRadius: 12, border: "1.5px solid #e2e8f0",
    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s", fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: "#ffffff", borderRadius: 24,
        boxShadow: "0 20px 60px rgba(37, 99, 235, 0.12)",
        padding: "48px 40px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src="/logo.jpg"
            alt="Veritas AI"
            style={{
              width: 72, height: 72, borderRadius: 20,
              objectFit: "cover", marginBottom: 16,
              boxShadow: "0 8px 24px rgba(37,99,235,0.2)",
            }}
          />
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>
            Create account
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Join Veritas AI — detect plagiarism intelligently
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: 14,
            borderRadius: 12, background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626",
            marginBottom: 24, fontSize: "0.875rem",
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#374151", fontSize: "0.875rem", marginBottom: 6 }}>
              Full name
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Jane Smith"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#374151", fontSize: "0.875rem", marginBottom: 6 }}>
              Email address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@university.edu"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#374151", fontSize: "0.875rem", marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 6, fontSize: "0.78rem", color: passwordStrong ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                {passwordStrong ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {passwordStrong ? "Strong password" : "At least 8 characters required"}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontWeight: 600, color: "#374151", fontSize: "0.875rem", marginBottom: 6 }}>
              Confirm password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter password"
                style={{ ...inputStyle, paddingRight: 44, borderColor: confirmPassword.length > 0 ? (passwordsMatch ? "#10b981" : "#ef4444") : "#e2e8f0" }}
                onFocus={e => e.target.style.borderColor = passwordsMatch ? "#10b981" : "#ef4444"}
                onBlur={e => e.target.style.borderColor = confirmPassword.length > 0 ? (passwordsMatch ? "#10b981" : "#ef4444") : "#e2e8f0"}
              />
              {confirmPassword.length > 0 && (
                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: passwordsMatch ? "#10b981" : "#ef4444" }}>
                  {passwordsMatch ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
              )}
            </div>
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: "0.95rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s", fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 4px 16px rgba(37,99,235,0.3)",
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 28, color: "#64748b", fontSize: "0.875rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
