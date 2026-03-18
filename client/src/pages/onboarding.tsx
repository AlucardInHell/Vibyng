import { useState, useRef } from "react";
import { Music, Camera, ChevronRight, Check, Loader2 } from "lucide-react";

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Jazz", "Classical",
  "Folk", "Indie", "Metal", "Reggae", "Blues", "Country", "Soul", "Funk",
  "Trap", "House", "Techno", "Ambient", "Latin"
];

interface OnboardingProps {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [username, setUsername] = useState(user.username || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : prev.length < 5 ? [...prev, genre] : prev
    );
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          avatarUrl,
          bio: selectedGenres.length > 0 ? `🎵 ${selectedGenres.join(", ")}` : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Errore durante il salvataggio");
        return;
      }
      const updatedUser = await res.json();
      if (avatarUrl) {
        await fetch("/api/uploads/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: avatarUrl, userId: user.id }),
        });
      }
      onComplete({ ...user, displayName, username, avatarUrl });
    } catch {
      setError("Errore di connessione. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  const s = {
    page: { minHeight: "100vh", background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0f0a1e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Segoe UI', sans-serif" },
    card: { width: "100%", maxWidth: 420, background: "#1a1030", borderRadius: 20, padding: 28, border: "1px solid #2d1f50", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" },
    label: { color: "#9c88cc", fontSize: 12, fontWeight: 600 as const, display: "block" as const, marginBottom: 6 },
    input: { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#0f0a1e", border: "1px solid #2d1f50", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
    btn: { width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "white", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(124,58,237,0.4)" },
  };

  return (
    <div style={s.page}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #7c3aed, #db2777)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}>
            <Music size={26} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: 0 }}>Benvenuto su Vibyng!</h1>
          <p style={{ color: "#9c88cc", fontSize: 14, marginTop: 6 }}>Completa il tuo profilo in pochi secondi</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: n === step ? 24 : 8, height: 8, borderRadius: 4, background: n <= step ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#2d1f50", transition: "all 0.3s" }} />
          ))}
        </div>

        <div style={s.card}>

          {/* STEP 1 — Nome e Username */}
          {step === 1 && (
            <div>
              <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Come ti chiami?</h2>
              <p style={{ color: "#9c88cc", fontSize: 13, marginBottom: 20 }}>Scegli come vuoi apparire su Vibyng</p>

              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>NOME VISUALIZZATO</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Il tuo nome" style={s.input} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={s.label}>USERNAME</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))} placeholder="@username" style={s.input} />
              </div>

              {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <button onClick={() => { if (!displayName.trim() || !username.trim()) { setError("Compila tutti i campi"); return; } setError(""); setStep(2); }} style={s.btn}>
                Avanti <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2 — Foto profilo */}
          {step === 2 && (
            <div>
              <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Aggiungi una foto</h2>
              <p style={{ color: "#9c88cc", fontSize: 13, marginBottom: 20 }}>Metti la tua faccia sulla community!</p>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", background: avatarUrl ? "transparent" : "linear-gradient(135deg, #7c3aed, #db2777)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid #2d1f50" }}>
                    {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "white", fontSize: 36, fontWeight: 700 }}>{displayName.charAt(0)}</span>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "2px solid #1a1030", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Camera size={14} color="white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </div>
                <p style={{ color: "#9c88cc", fontSize: 13 }}>Clicca sull'icona per scegliere una foto</p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ ...s.btn, background: "#2d1f50", boxShadow: "none", flex: 1 }}>
                  Indietro
                </button>
                <button onClick={() => setStep(3)} style={{ ...s.btn, flex: 2 }}>
                  {avatarUrl ? "Avanti" : "Salta"} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Generi musicali */}
          {step === 3 && (
            <div>
              <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Che musica ami?</h2>
              <p style={{ color: "#9c88cc", fontSize: 13, marginBottom: 16 }}>Scegli fino a 5 generi preferiti</p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {GENRES.map(genre => (
                  <button key={genre} onClick={() => toggleGenre(genre)} style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${selectedGenres.includes(genre) ? "#7c3aed" : "#2d1f50"}`, background: selectedGenres.includes(genre) ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#0f0a1e", color: "white", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    {selectedGenres.includes(genre) && <Check size={12} />}
                    {genre}
                  </button>
                ))}
              </div>

              {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ ...s.btn, background: "#2d1f50", boxShadow: "none", flex: 1 }}>
                  Indietro
                </button>
                <button onClick={handleComplete} disabled={isLoading} style={{ ...s.btn, flex: 2, opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={18} />}
                  {isLoading ? "Salvataggio..." : "Inizia!"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
