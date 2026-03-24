import { useState } from "react";
import { useLocation } from "wouter";
import { Music, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleReset = async () => {
    if (!password || password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Errore sconosciuto");
        return;
      }
      setSuccess("✅ Password reimpostata con successo! Puoi ora accedere.");
      setTimeout(() => setLocation("/"), 2000);
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0f0a1e 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
          }}>
            <Music size={30} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 32, fontWeight: 800, letterSpacing: -1, margin: 0 }}>vibyng</h1>
          <p style={{ color: "#9c88cc", fontSize: 14, marginTop: 6 }}>Reimposta la tua password</p>
        </div>

        <div style={{
          background: "#1a1030",
          borderRadius: 20,
          padding: 28,
          border: "1px solid #2d1f50",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#9c88cc", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>NUOVA PASSWORD</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                style={{
                  width: "100%", padding: "12px 44px 12px 14px", borderRadius: 10,
                  background: "#0f0a1e", border: "1px solid #2d1f50",
                  color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#9c88cc", cursor: "pointer", padding: 0,
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#9c88cc", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>CONFERMA PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleReset()}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                background: "#0f0a1e", border: "1px solid #2d1f50",
                color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              color: "#f87171", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
              color: "#4ade80", fontSize: 13,
            }}>
              {success}
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={isLoading}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: isLoading ? "#4b2d8a" : "linear-gradient(135deg, #7c3aed, #db2777)",
              color: "white", fontWeight: 700, fontSize: 16, cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}
          >
            {isLoading && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            Reimposta password
          </button>
        </div>

        <p style={{ color: "#5a4a7a", fontSize: 12, textAlign: "center", marginTop: 20 }}>
          Vibyng © 2025 — La community della musica indipendente
        </p>
      </div>
    </div>
  );
}
