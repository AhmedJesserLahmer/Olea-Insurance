import { useState, useEffect, useRef } from "react";
import axios from "axios";

/* ===== AI Chat Bubble Component ===== */
function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm AssurBot 🛡️\nTell me about yourself (age, family, budget, needs) and I'll match you with the perfect insurance bundle!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/rag", { question: q });
      setMessages(prev => [...prev, { role: "ai", text: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't reach the server. Make sure the backend is running." }]);
    }
    setLoading(false);
  };

  const bubbleBtn = {
    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
    width: 60, height: 60, borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 20px rgba(37,99,235,0.5), 0 0 40px rgba(124,58,237,0.2)",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  const panel = {
    position: "fixed", bottom: 96, right: 24, zIndex: 9998,
    width: 380, maxHeight: 520,
    background: "#0e1225", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, overflow: "hidden",
    display: "flex", flexDirection: "column",
    boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(37,99,235,0.1)",
    animation: "bubbleSlideUp 0.3s ease",
  };

  return (
    <>
      <style>{`
        @keyframes bubbleSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .chat-bubble-btn:hover { transform: scale(1.08) !important; }
        .chat-msg-ai { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.06); }
        .chat-msg-user { background: linear-gradient(135deg, #2563eb, #4f46e5); }
      `}</style>

      {/* Floating button */}
      <button className="chat-bubble-btn" style={bubbleBtn} onClick={() => setOpen(o => !o)} title="Ask AssurBot">
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={panel}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
            background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.1))",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif" }}>AssurBot AI</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Insurance Bundle Advisor</div>
            </div>
            <div style={{
              marginLeft: "auto", width: 8, height: 8, borderRadius: "50%",
              background: "#34d399", boxShadow: "0 0 8px #34d39988",
            }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "82%",
              }}>
                <div className={m.role === "user" ? "chat-msg-user" : "chat-msg-ai"} style={{
                  padding: "10px 14px", borderRadius: 14,
                  borderTopRightRadius: m.role === "user" ? 4 : 14,
                  borderTopLeftRadius: m.role === "ai" ? 4 : 14,
                  fontSize: 13, lineHeight: 1.55, color: "#fff", whiteSpace: "pre-wrap",
                  fontFamily: "'Inter',sans-serif",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div className="chat-msg-ai" style={{ padding: "12px 18px", borderRadius: 14, borderTopLeftRadius: 4, display: "flex", gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.4)", animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Describe yourself for a match..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(37,99,235,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: input.trim() ? "linear-gradient(135deg, #2563eb, #4f46e5)" : "rgba(255,255,255,0.05)",
                border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s, transform 0.1s", flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>

          {/* Footer */}
          <div style={{ padding: "0 14px 10px", textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
            Predictions are estimates — consult a professional.
          </div>
        </div>
      )}
    </>
  );
}


const BUNDLES = [
  {
    id: "basic_health",
    code: "BH-001",
    name: "Basic Health",
    category: "Health",
    icon: "🏥",
    accent: "#00D4FF",
    accentDim: "rgba(0,212,255,0.12)",
    accentBorder: "rgba(0,212,255,0.25)",
    premium: "$89/mo",
    premiumVal: 89,
    matchScore: 72,
    riskLevel: "Low",
    coverage: "$250,000",
    deductible: "$2,500",
    tagline: "Essential medical protection at accessible rates.",
    stats: { protection: 55, affordability: 92, flexibility: 48, comprehensiveness: 40 },
    features: [
      { label: "GP & Specialist Visits", included: true },
      { label: "Emergency Hospitalisation", included: true },
      { label: "Prescription Drugs", included: true },
      { label: "Mental Health Support", included: false },
      { label: "Dental Coverage", included: false },
      { label: "Vision Care", included: false },
      { label: "International Coverage", included: false },
    ],
    badge: null,
  },
  {
    id: "health_dental_vision",
    code: "HDV-002",
    name: "Health + Dental + Vision",
    category: "Health",
    icon: "👁️",
    accent: "#00FFB2",
    accentDim: "rgba(0,255,178,0.10)",
    accentBorder: "rgba(0,255,178,0.22)",
    premium: "$154/mo",
    premiumVal: 154,
    matchScore: 88,
    riskLevel: "Low",
    coverage: "$400,000",
    deductible: "$1,500",
    tagline: "Complete everyday health — body, teeth, and eyes.",
    stats: { protection: 72, affordability: 70, flexibility: 65, comprehensiveness: 74 },
    features: [
      { label: "GP & Specialist Visits", included: true },
      { label: "Emergency Hospitalisation", included: true },
      { label: "Prescription Drugs", included: true },
      { label: "Mental Health Support", included: true },
      { label: "Dental Coverage", included: true },
      { label: "Vision Care", included: true },
      { label: "International Coverage", included: false },
    ],
    badge: "POPULAR",
  },
  {
    id: "family_comprehensive",
    code: "FC-003",
    name: "Family Comprehensive",
    category: "Family",
    icon: "👨‍👩‍👧",
    accent: "#A78BFA",
    accentDim: "rgba(167,139,250,0.10)",
    accentBorder: "rgba(167,139,250,0.22)",
    premium: "$298/mo",
    premiumVal: 298,
    matchScore: 61,
    riskLevel: "Medium",
    coverage: "$800,000",
    deductible: "$1,000",
    tagline: "Broad household protection that scales with your family.",
    stats: { protection: 85, affordability: 45, flexibility: 80, comprehensiveness: 88 },
    features: [
      { label: "GP & Specialist Visits", included: true },
      { label: "Emergency Hospitalisation", included: true },
      { label: "Prescription Drugs", included: true },
      { label: "Mental Health Support", included: true },
      { label: "Dental Coverage", included: true },
      { label: "Vision Care", included: true },
      { label: "International Coverage", included: true },
    ],
    badge: null,
  },
  {
    id: "premium_health_life",
    code: "PHL-004",
    name: "Premium Health & Life",
    category: "Premium",
    icon: "⭐",
    accent: "#FFB547",
    accentDim: "rgba(255,181,71,0.10)",
    accentBorder: "rgba(255,181,71,0.22)",
    premium: "$421/mo",
    premiumVal: 421,
    matchScore: 94,
    riskLevel: "Low",
    coverage: "$2,000,000",
    deductible: "$500",
    tagline: "Private care, life insurance, and critical illness — all in one.",
    stats: { protection: 98, affordability: 28, flexibility: 90, comprehensiveness: 97 },
    features: [
      { label: "GP & Specialist Visits", included: true },
      { label: "Emergency Hospitalisation", included: true },
      { label: "Prescription Drugs", included: true },
      { label: "Mental Health Support", included: true },
      { label: "Dental Coverage", included: true },
      { label: "Vision Care", included: true },
      { label: "International Coverage", included: true },
    ],
    badge: "BEST MATCH",
  },
  {
    id: "auto_liability",
    code: "AL-005",
    name: "Auto Liability Basic",
    category: "Auto",
    icon: "🚗",
    accent: "#34D399",
    accentDim: "rgba(52,211,153,0.10)",
    accentBorder: "rgba(52,211,153,0.22)",
    premium: "$67/mo",
    premiumVal: 67,
    matchScore: 45,
    riskLevel: "Low",
    coverage: "$100,000",
    deductible: "$500",
    tagline: "Legal road coverage — compliant, simple, affordable.",
    stats: { protection: 38, affordability: 97, flexibility: 35, comprehensiveness: 30 },
    features: [
      { label: "Third-Party Liability", included: true },
      { label: "Legal Cost Coverage", included: true },
      { label: "Roadside Assistance", included: true },
      { label: "Collision Damage", included: false },
      { label: "Theft Protection", included: false },
      { label: "Replacement Vehicle", included: false },
      { label: "Natural Disaster Cover", included: false },
    ],
    badge: null,
  },
  {
    id: "auto_comprehensive",
    code: "AC-006",
    name: "Auto Comprehensive",
    category: "Auto",
    icon: "🛡️",
    accent: "#F87171",
    accentDim: "rgba(248,113,113,0.10)",
    accentBorder: "rgba(248,113,113,0.22)",
    premium: "$189/mo",
    premiumVal: 189,
    matchScore: 58,
    riskLevel: "Medium",
    coverage: "$500,000",
    deductible: "$250",
    tagline: "Full vehicle protection — from fender-benders to total loss.",
    stats: { protection: 90, affordability: 55, flexibility: 62, comprehensiveness: 85 },
    features: [
      { label: "Third-Party Liability", included: true },
      { label: "Legal Cost Coverage", included: true },
      { label: "Roadside Assistance", included: true },
      { label: "Collision Damage", included: true },
      { label: "Theft Protection", included: true },
      { label: "Replacement Vehicle", included: true },
      { label: "Natural Disaster Cover", included: false },
    ],
    badge: null,
  },
  {
    id: "home_standard",
    code: "HS-007",
    name: "Home Standard",
    category: "Home",
    icon: "🏠",
    accent: "#FBBF24",
    accentDim: "rgba(251,191,36,0.10)",
    accentBorder: "rgba(251,191,36,0.22)",
    premium: "$112/mo",
    premiumVal: 112,
    matchScore: 39,
    riskLevel: "Low",
    coverage: "$350,000",
    deductible: "$1,000",
    tagline: "Dependable structure and contents coverage for homeowners.",
    stats: { protection: 65, affordability: 78, flexibility: 55, comprehensiveness: 60 },
    features: [
      { label: "Building Cover", included: true },
      { label: "Contents Cover", included: true },
      { label: "Fire & Storm Damage", included: true },
      { label: "Public Liability", included: true },
      { label: "Accidental Damage", included: false },
      { label: "High-Value Items", included: false },
      { label: "Worldwide Possessions", included: false },
    ],
    badge: null,
  },
  {
    id: "home_premium",
    code: "HP-008",
    name: "Home Premium",
    category: "Home",
    icon: "🏡",
    accent: "#C084FC",
    accentDim: "rgba(192,132,252,0.10)",
    accentBorder: "rgba(192,132,252,0.22)",
    premium: "$234/mo",
    premiumVal: 234,
    matchScore: 52,
    riskLevel: "Low",
    coverage: "$1,200,000",
    deductible: "$500",
    tagline: "Premium home coverage — nothing left unprotected.",
    stats: { protection: 92, affordability: 38, flexibility: 85, comprehensiveness: 93 },
    features: [
      { label: "Building Cover", included: true },
      { label: "Contents Cover", included: true },
      { label: "Fire & Storm Damage", included: true },
      { label: "Public Liability", included: true },
      { label: "Accidental Damage", included: true },
      { label: "High-Value Items", included: true },
      { label: "Worldwide Possessions", included: true },
    ],
    badge: null,
  },
  {
    id: "renter_basic",
    code: "RB-009",
    name: "Renter's Basic",
    category: "Rental",
    icon: "🔑",
    accent: "#38BDF8",
    accentDim: "rgba(56,189,248,0.10)",
    accentBorder: "rgba(56,189,248,0.22)",
    premium: "$29/mo",
    premiumVal: 29,
    matchScore: 33,
    riskLevel: "Low",
    coverage: "$25,000",
    deductible: "$250",
    tagline: "Smart, affordable protection for renters on the move.",
    stats: { protection: 32, affordability: 99, flexibility: 40, comprehensiveness: 28 },
    features: [
      { label: "Personal Contents", included: true },
      { label: "Liability Protection", included: true },
      { label: "Temporary Accommodation", included: true },
      { label: "Electronics Cover", included: false },
      { label: "Accidental Damage", included: false },
      { label: "High-Value Jewellery", included: false },
      { label: "Worldwide Possessions", included: false },
    ],
    badge: null,
  },
  {
    id: "renter_premium",
    code: "RP-010",
    name: "Renter's Premium",
    category: "Rental",
    icon: "✨",
    accent: "#2DD4BF",
    accentDim: "rgba(45,212,191,0.10)",
    accentBorder: "rgba(45,212,191,0.22)",
    premium: "$79/mo",
    premiumVal: 79,
    matchScore: 41,
    riskLevel: "Low",
    coverage: "$80,000",
    deductible: "$150",
    tagline: "Premium renter's coverage for those with valuable belongings.",
    stats: { protection: 68, affordability: 88, flexibility: 72, comprehensiveness: 65 },
    features: [
      { label: "Personal Contents", included: true },
      { label: "Liability Protection", included: true },
      { label: "Temporary Accommodation", included: true },
      { label: "Electronics Cover", included: true },
      { label: "Accidental Damage", included: true },
      { label: "High-Value Jewellery", included: true },
      { label: "Worldwide Possessions", included: false },
    ],
    badge: null,
  },
];

const CATEGORIES = ["All", "Health", "Family", "Premium", "Auto", "Home", "Rental"];
const SORT_OPTIONS = ["Match Score", "Lowest Premium", "Coverage Amount", "Comprehensiveness"];
const STAT_KEYS = ["protection", "affordability", "flexibility", "comprehensiveness"];

function RadarChart({ stats, accent, size = 110 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const keys = STAT_KEYS;
  const n = keys.length;
  const pts = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = stats[k] / 100;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  });
  const gridPts = (scale) => keys.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(" ");
  const labelPts = keys.map((k, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + (r + 18) * Math.cos(angle), y: cy + (r + 18) * Math.sin(angle), label: k };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(s => (
        <polygon key={s} points={gridPts(s).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {keys.map((_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}
      <polygon points={polyPts} fill={accent + "28"} stroke={accent} strokeWidth="1.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={accent} />
      ))}
      {labelPts.map((l, i) => (
        <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="'JetBrains Mono', monospace"
          style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {l.label.slice(0, 4)}
        </text>
      ))}
    </svg>
  );
}

function StatBar({ label, value, accent, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 80 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</span>
        <span style={{ fontSize: 11, color: accent, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2, width: `${w}%`,
          background: `linear-gradient(90deg, ${accent}88, ${accent})`,
          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: `0 0 6px ${accent}66`,
        }} />
      </div>
    </div>
  );
}

function BundleCard({ bundle, isSelected, isPinned, onSelect, onPin, viewMode }) {
  const [hovered, setHovered] = useState(false);
  const active = isSelected || hovered;

  if (viewMode === "list") {
    return (
      <div
        onClick={() => onSelect(bundle.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "40px 1fr 120px 110px 110px 90px 90px 48px",
          alignItems: "center", gap: 0,
          padding: "0 20px",
          height: 56,
          background: isSelected ? bundle.accentDim : "transparent",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          borderLeft: isSelected ? `2px solid ${bundle.accent}` : "2px solid transparent",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 18 }}>{bundle.icon}</span>
        <div>
          <div style={{ fontSize: 13, color: active ? bundle.accent : "rgba(255,255,255,0.8)", fontWeight: 500, fontFamily: "'Syne', sans-serif", transition: "color 0.15s" }}>{bundle.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.code}</div>
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.premium}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.coverage}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.deductible}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ height: 4, width: 50, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${bundle.matchScore}%`, background: bundle.accent, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: bundle.accent, fontFamily: "'JetBrains Mono',monospace" }}>{bundle.matchScore}%</span>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: bundle.category === "Premium" ? "rgba(255,181,71,0.15)" : "rgba(255,255,255,0.06)", color: bundle.category === "Premium" ? "#FFB547" : "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.category}</span>
        <button
          onClick={e => { e.stopPropagation(); onPin(bundle.id); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: isPinned ? 1 : 0.25, transition: "opacity 0.2s" }}
        >📌</button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(bundle.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: 16, overflow: "hidden",
        border: `1px solid ${isSelected ? bundle.accent + "50" : "rgba(255,255,255,0.05)"}`,
        background: isSelected ? bundle.accentDim : "rgba(255,255,255,0.02)",
        cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
        transform: hovered && !isSelected ? "translateY(-3px)" : "none",
        boxShadow: isSelected ? `0 4px 24px ${bundle.accent}18, 0 0 0 1px ${bundle.accent}30` : hovered ? "0 8px 32px rgba(0,0,0,0.3)" : "none",
        animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      {/* Top bar accent line */}
      <div style={{ height: 2, background: isSelected ? bundle.accent : "rgba(255,255,255,0.07)", transition: "background 0.2s", boxShadow: isSelected ? `0 0 8px ${bundle.accent}` : "none" }} />

      {/* Badge */}
      {bundle.badge && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          padding: "3px 8px", borderRadius: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
          fontFamily: "'JetBrains Mono',monospace",
          background: bundle.badge === "BEST MATCH" ? bundle.accent : "rgba(255,255,255,0.1)",
          color: bundle.badge === "BEST MATCH" ? "#000" : "rgba(255,255,255,0.7)",
        }}>{bundle.badge}</div>
      )}

      <div style={{ padding: "18px 18px 14px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: bundle.accentDim, border: `1px solid ${bundle.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>{bundle.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 3 }}>{bundle.code}</div>
            <div style={{ fontSize: 15, color: active ? bundle.accent : "rgba(255,255,255,0.88)", fontWeight: 600, fontFamily: "'Syne', sans-serif", lineHeight: 1.2, transition: "color 0.2s" }}>{bundle.name}</div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onPin(bundle.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: isPinned ? 1 : 0.2, transition: "opacity 0.2s", flexShrink: 0, paddingTop: 2 }}
          >📌</button>
        </div>

        {/* Match score */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${bundle.matchScore}%`, background: `linear-gradient(90deg, ${bundle.accent}88, ${bundle.accent})`, borderRadius: 2, boxShadow: `0 0 6px ${bundle.accent}66` }} />
          </div>
          <span style={{ fontSize: 12, color: bundle.accent, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, flexShrink: 0 }}>{bundle.matchScore}% match</span>
        </div>

        {/* Key numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "PREMIUM", value: bundle.premium },
            { label: "COVERAGE", value: bundle.coverage },
            { label: "DEDUCTIBLE", value: bundle.deductible },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Radar chart */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <RadarChart stats={bundle.stats} accent={bundle.accent} size={110} />
        </div>

        {/* Features */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {bundle.features.slice(0, 4).map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: f.included ? bundle.accent : "rgba(255,255,255,0.15)", fontSize: 11 }}>{f.included ? "●" : "○"}</span>
              <span style={{ color: f.included ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>{f.label}</span>
            </div>
          ))}
          {bundle.features.length > 4 && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>+{bundle.features.length - 4} more features</div>
          )}
        </div>
      </div>

      {/* Bottom select indicator */}
      <div style={{
        padding: "10px 18px",
        background: isSelected ? `${bundle.accent}18` : "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "background 0.2s",
      }}>
        <span style={{ fontSize: 10, color: isSelected ? bundle.accent : "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>
          {isSelected ? "● SELECTED" : "○ SELECT"}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>{bundle.category}</span>
      </div>
    </div>
  );
}

function DetailPanel({ bundle, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
      animation: "fadeIn 0.2s ease both",
    }} onClick={onClose}>
      <div
        style={{
          width: 480, height: "100%", overflowY: "auto",
          background: "#0a0f1c",
          borderLeft: `1px solid ${bundle.accentBorder}`,
          animation: "slideIn 0.35s cubic-bezier(0.22,1,0.36,1) both",
          boxShadow: `-32px 0 80px rgba(0,0,0,0.6)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${bundle.accent}, ${bundle.accent}88)`, boxShadow: `0 0 12px ${bundle.accent}44` }} />
        <div style={{ padding: "28px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: bundle.accentDim, border: `1px solid ${bundle.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{bundle.icon}</div>
              <div>
                <div style={{ fontSize: 10, color: bundle.accent, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 2, marginBottom: 4 }}>{bundle.code} · {bundle.category}</div>
                <div style={{ fontSize: 22, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>{bundle.name}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.4)", width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 28, fontFamily: "'JetBrains Mono',monospace" }}>{bundle.tagline}</p>

          {/* Match score big */}
          <div style={{ background: bundle.accentDim, border: `1px solid ${bundle.accentBorder}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>MATCH SCORE</div>
              <div style={{ fontSize: 36, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: bundle.accent, lineHeight: 1 }}>{bundle.matchScore}%</div>
            </div>
            <RadarChart stats={bundle.stats} accent={bundle.accent} size={120} />
          </div>

          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
            {[
              { label: "Monthly Premium", value: bundle.premium },
              { label: "Max Coverage", value: bundle.coverage },
              { label: "Deductible", value: bundle.deductible },
              { label: "Risk Level", value: bundle.riskLevel },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.2, marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 16, color: bundle.accent, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Stat bars */}
          <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>PERFORMANCE METRICS</div>
            {STAT_KEYS.map((k, i) => (
              <StatBar key={k} label={k} value={bundle.stats[k]} accent={bundle.accent} delay={i * 80} />
            ))}
          </div>

          {/* Full features */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.5, marginBottom: 14 }}>COVERAGE DETAILS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
              {bundle.features.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.035)",
                  borderBottom: i < bundle.features.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <span style={{ fontSize: 13, color: f.included ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>{f.label}</span>
                  <span style={{
                    fontSize: 11, padding: "2px 10px", borderRadius: 4,
                    background: f.included ? `${bundle.accent}20` : "rgba(255,255,255,0.05)",
                    color: f.included ? bundle.accent : "rgba(255,255,255,0.2)",
                    fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
                  }}>{f.included ? "INCLUDED" : "EXCLUDED"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginBottom: 32 }}>
            <button style={{
              width: "100%", padding: "14px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg, ${bundle.accent}, ${bundle.accent}AA)`,
              color: "#000", fontSize: 13, fontFamily: "'Syne', sans-serif",
              fontWeight: 700, letterSpacing: 0.5, cursor: "pointer",
              boxShadow: `0 4px 20px ${bundle.accent}40`,
              transition: "all 0.2s",
            }}>Get This Plan →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BundleExplorer() {
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Match Score");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set(["premium_health_life"]));
  const [pinned, setPinned] = useState(new Set());
  const [viewMode, setViewMode] = useState("grid");
  const [detail, setDetail] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  const filtered = BUNDLES
    .filter(b => category === "All" || b.category === category)
    .filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "Match Score") return b.matchScore - a.matchScore;
      if (sort === "Lowest Premium") return a.premiumVal - b.premiumVal;
      if (sort === "Coverage Amount") return parseInt(b.coverage.replace(/\D/g, "")) - parseInt(a.coverage.replace(/\D/g, ""));
      if (sort === "Comprehensiveness") return b.stats.comprehensiveness - a.stats.comprehensiveness;
      return 0;
    });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePin = (id) => {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const compareList = BUNDLES.filter(b => selected.has(b.id));

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060b14; font-family: 'Inter', 'JetBrains Mono', sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .filter-btn { transition: all 0.2s ease !important; }
        .filter-btn:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.7) !important; }
        .search-input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important; }
        .compare-btn:hover { background: rgba(99,102,241,0.2) !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#060b14", color: "#fff" }}>

        {/* ── Navbar ── */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 56,
          background: "rgba(6,11,20,0.85)", backdropFilter: "blur(16px) saturate(1.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize: 16, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#fff", letterSpacing: -0.3 }}>AssurBot</span>
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, letterSpacing: 0.5 }}>AI</span>
          </div>

          {/* Search + view toggle */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search bundles…"
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "7px 12px 7px 32px",
                  color: "#fff", fontSize: 12, fontFamily: "'Inter',sans-serif",
                  outline: "none", width: 220, transition: "all 0.2s",
                }}
              />
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              {[["grid","⊞"],["list","☰"]].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "7px 12px", border: "none", cursor: "pointer", fontSize: 13,
                  background: viewMode === mode ? "rgba(99,102,241,0.18)" : "transparent",
                  color: viewMode === mode ? "#a5b4fc" : "rgba(255,255,255,0.3)",
                  transition: "all 0.15s",
                }}>{icon}</button>
              ))}
            </div>
          </div>
        </nav>

        {/* ── Hero section ── */}
        <div style={{
          padding: "36px 32px 0", position: "relative", overflow: "hidden",
        }}>
          {/* Gradient orbs */}
          <div style={{ position: "absolute", top: -80, right: 60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 20, left: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 600 }}>
            <h1 style={{ fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: "#fff", letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 8 }}>
              Find Your Perfect{" "}
              <span style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Coverage</span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              Compare 10 insurance bundles side by side. Filter, sort, and let AI match you with the best plan.
            </p>
          </div>
        </div>

        {/* ── Toolbar: filters, sort, compare ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "20px 32px 16px",
          flexWrap: "wrap", position: "relative", zIndex: 1,
        }}>
          {/* Category pills */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.025)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.05)" }}>
            {CATEGORIES.map(cat => (
              <button className="filter-btn" key={cat} onClick={() => setCategory(cat)} style={{
                padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 11, fontFamily: "'Inter',sans-serif", fontWeight: 500,
                background: category === cat ? "rgba(99,102,241,0.18)" : "transparent",
                color: category === cat ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                transition: "all 0.15s",
              }}>{cat}</button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 1.2, fontFamily: "'JetBrains Mono',monospace" }}>SORT</span>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "6px 10px",
              color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "'Inter',sans-serif", outline: "none", cursor: "pointer",
            }}>
              {SORT_OPTIONS.map(o => <option key={o} value={o} style={{ background: "#0c1220" }}>{o}</option>)}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>{filtered.length} bundles</span>
            {selected.size > 0 && (
              <button className="compare-btn" onClick={() => setCompareMode(true)} style={{
                padding: "6px 16px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)",
                background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                fontSize: 11, fontFamily: "'Inter',sans-serif", cursor: "pointer", fontWeight: 600,
                transition: "all 0.2s",
              }}>
                ⇄ Compare ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* List header (only in list mode) */}
        {viewMode === "list" && (
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 120px 110px 110px 90px 90px 48px",
            padding: "0 32px", height: 38, alignItems: "center",
            background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.05)",
            fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 1.5, gap: 0,
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            <span></span>
            <span>BUNDLE</span>
            <span>PREMIUM</span>
            <span>COVERAGE</span>
            <span>DEDUCTIBLE</span>
            <span>MATCH</span>
            <span>CATEGORY</span>
            <span></span>
          </div>
        )}

        {/* Grid / List */}
        <div style={{
          padding: viewMode === "grid" ? "24px 32px 100px" : "0 0 100px",
          display: viewMode === "grid" ? "grid" : "block",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((b, i) => (
            <div key={b.id} style={{ animationDelay: `${i * 0.04}s` }}>
              <BundleCard
                bundle={b}
                isSelected={selected.has(b.id)}
                isPinned={pinned.has(b.id)}
                onSelect={(id) => {
                  if (viewMode === "list") setDetail(b);
                  else toggleSelect(id);
                }}
                onPin={togglePin}
                viewMode={viewMode}
              />
            </div>
          ))}
        </div>

        {/* Compare panel */}
        {compareMode && compareList.length > 0 && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
            background: "rgba(8,12,22,0.95)", backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(99,102,241,0.15)",
            padding: "20px 32px 28px",
            animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "#a5b4fc", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1.5, fontWeight: 600 }}>SIDE-BY-SIDE COMPARISON</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              <button onClick={() => setCompareMode(false)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.4)", padding: "5px 14px", cursor: "pointer", fontSize: 11, fontFamily: "'Inter',sans-serif", transition: "all 0.15s" }}>Close</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
                <thead>
                  <tr>
                    <td style={{ padding: "8px 16px 8px 0", fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>FEATURE</td>
                    {compareList.map(b => (
                      <td key={b.id} style={{ padding: "8px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontFamily: "'Syne',sans-serif", fontWeight: 700, color: b.accent }}>{b.name}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace" }}>{b.premium}</div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Match Score", key: "matchScore", format: v => `${v}%` },
                    { label: "Coverage", key: "coverage", format: v => v },
                    { label: "Deductible", key: "deductible", format: v => v },
                    { label: "Risk Level", key: "riskLevel", format: v => v },
                  ].map(({ label, key, format }) => (
                    <tr key={label} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{label}</td>
                      {compareList.map(b => (
                        <td key={b.id} style={{ padding: "10px 24px", textAlign: "center", fontSize: 13, color: b.accent, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                          {format(b[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Feature rows */}
                  {compareList[0].features.map((f, fi) => (
                    <tr key={fi} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 16px 8px 0", fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{f.label}</td>
                      {compareList.map(b => (
                        <td key={b.id} style={{ padding: "8px 24px", textAlign: "center", fontSize: 14 }}>
                          {b.features[fi]?.included
                            ? <span style={{ color: b.accent }}>●</span>
                            : <span style={{ color: "rgba(255,255,255,0.15)" }}>○</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {detail && <DetailPanel bundle={detail} onClose={() => setDetail(null)} />}
      </div>

      {/* AI Chat Bubble */}
      <AIChatBubble />
    </>
  );
}
