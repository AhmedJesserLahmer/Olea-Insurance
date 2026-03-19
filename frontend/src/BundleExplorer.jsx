import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import oleaBanner from "./assets/olea-sunset.svg";

const rawApiBase = (import.meta.env.VITE_API_URL || "").trim();
const DEFAULT_PROD_API_BASE = "VITE_API_URL";
const API_BASE = rawApiBase
  ? rawApiBase.replace(/\/+$/, "")
  : (import.meta.env.DEV ? "http://localhost:8000" : DEFAULT_PROD_API_BASE);
const isApiNotConfigured = !API_BASE && !import.meta.env.DEV;

function apiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

const bundleMeta = {
  0: { code: "BH-001", name: "Basic Health", monthly: "$89/mo", tint: "#2dd4bf" },
  1: { code: "HDV-002", name: "Health + Dental + Vision", monthly: "$154/mo", tint: "#0ea5e9" },
  2: { code: "FC-003", name: "Family Comprehensive", monthly: "$298/mo", tint: "#8b5cf6" },
  3: { code: "PHL-004", name: "Premium Health & Life", monthly: "$421/mo", tint: "#f97316" },
  4: { code: "AL-005", name: "Auto Liability Basic", monthly: "$67/mo", tint: "#22c55e" },
  5: { code: "AC-006", name: "Auto Comprehensive", monthly: "$189/mo", tint: "#14b8a6" },
  6: { code: "HS-007", name: "Home Standard", monthly: "$112/mo", tint: "#3b82f6" },
  7: { code: "HP-008", name: "Home Premium", monthly: "$234/mo", tint: "#a855f7" },
  8: { code: "RB-009", name: "Renter's Basic", monthly: "$29/mo", tint: "#f43f5e" },
  9: { code: "RP-010", name: "Renter's Premium", monthly: "$79/mo", tint: "#ef4444" },
};

const initialProfile = {
  age: 34,
  annual_income: 38000,
  adult_dependents: 1,
  child_dependents: 0,
  infant_dependents: 0,
  existing_policyholder: false,
  previous_claims_filed: 0,
  years_without_claims: 2,
  policy_amendments_count: 0,
  vehicles_on_policy: 0,
  custom_riders_requested: 1,
  deductible_tier: 2,
  days_since_quote: 10,
  previous_policy_duration_months: 0,
  grace_period_extensions: 0,
  has_employer_id: false,
  has_broker_id: false,
  broker_id: "Unknown",
  region_code: "Unknown",
  acquisition_channel: "Direct_Website",
  payment_schedule: "Annual_Upfront",
  employment_status: "Employed",
  notes: "",
};

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function RecommendationCard({ item, isTop }) {
  const meta = bundleMeta[item.bundle_id] || {
    code: item.bundle_code,
    name: item.bundle_name,
    monthly: "N/A",
    tint: "#f97316",
  };

  return (
    <article className={`rec-card ${isTop ? "top" : ""}`} style={{ "--tint": meta.tint }}>
      <div className="rec-head">
        <p>{meta.code}</p>
        <span>{formatPercent(item.confidence)}</span>
      </div>
      <h4>{meta.name}</h4>
      <small>{meta.monthly}</small>
    </article>
  );
}

export default function BundleExplorer() {
  const [profile, setProfile] = useState(initialProfile);
  const [prediction, setPrediction] = useState(null);
  const [savedPredictions, setSavedPredictions] = useState([]);

  const [ragQuestion, setRagQuestion] = useState("");
  const [ragAnswer, setRagAnswer] = useState("Ask OLEA Assistant anything about insurance bundles.");

  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingRag, setLoadingRag] = useState(false);
  const [predictError, setPredictError] = useState("");
  const [ragError, setRagError] = useState("");

  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState({ full_name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("olea_token") || "");
  const [user, setUser] = useState(null);

  const canPredict = useMemo(() => !loadingPredict && Number(profile.age) >= 18 && !!token, [loadingPredict, profile.age, token]);
  const canAskRag = useMemo(() => ragQuestion.trim().length > 0 && !loadingRag && !!token, [ragQuestion, loadingRag, token]);

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const update = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const loadCurrentUser = async (sessionToken) => {
    const res = await axios.get(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    setUser(res.data);
  };

  const loadSavedPredictions = async (sessionToken) => {
    const res = await axios.get(apiUrl("/predictions/me"), {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    setSavedPredictions(res.data || []);
  };

  useEffect(() => {
    const hydrateAuth = async () => {
      if (!token) {
        setUser(null);
        setSavedPredictions([]);
        return;
      }

      try {
        await loadCurrentUser(token);
        await loadSavedPredictions(token);
      } catch {
        localStorage.removeItem("olea_token");
        setToken("");
        setUser(null);
        setSavedPredictions([]);
      }
    };

    hydrateAuth();
  }, [token]);

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        await axios.post(apiUrl("/auth/signup"), {
          email: authForm.email,
          full_name: authForm.full_name,
          password: authForm.password,
        });
      }

      const loginRes = await axios.post(apiUrl("/auth/login"), {
        email: authForm.email,
        password: authForm.password,
      });

      const sessionToken = loginRes.data.access_token;
      localStorage.setItem("olea_token", sessionToken);
      setToken(sessionToken);
      setUser(loginRes.data.user);
      setAuthForm({ full_name: "", email: "", password: "" });
      setAuthError("");
    } catch (error) {
      if (!error?.response) {
        setAuthError("Cannot reach API. Set VITE_API_BASE_URL in Vercel to your Render backend URL.");
        return;
      }

      const detail = error?.response?.data?.detail;
      setAuthError(detail || "Authentication failed. Please verify your details.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("olea_token");
    setToken("");
    setUser(null);
    setPrediction(null);
    setSavedPredictions([]);
    setRagAnswer("Ask OLEA Assistant anything about insurance bundles.");
  };

  const predictBundle = async (event) => {
    event.preventDefault();
    setLoadingPredict(true);
    setPredictError("");

    try {
      const payload = {
        ...profile,
        age: Number(profile.age),
        annual_income: Number(profile.annual_income),
        adult_dependents: Number(profile.adult_dependents),
        child_dependents: Number(profile.child_dependents),
        infant_dependents: Number(profile.infant_dependents),
        previous_claims_filed: Number(profile.previous_claims_filed),
        years_without_claims: Number(profile.years_without_claims),
        policy_amendments_count: Number(profile.policy_amendments_count),
        vehicles_on_policy: Number(profile.vehicles_on_policy),
        custom_riders_requested: Number(profile.custom_riders_requested),
        deductible_tier: Number(profile.deductible_tier),
        days_since_quote: Number(profile.days_since_quote),
        previous_policy_duration_months: Number(profile.previous_policy_duration_months),
        grace_period_extensions: Number(profile.grace_period_extensions),
      };

      const res = await axios.post(apiUrl("/predict-bundle"), payload, { headers: authHeaders });
      setPrediction(res.data);
      await loadSavedPredictions(token);
    } catch (error) {
      if (!error?.response) {
        setPredictError("Cannot reach API. Set VITE_API_BASE_URL in Vercel to your Render backend URL.");
        return;
      }

      const detail = error?.response?.data?.detail;
      setPredictError(detail || "Prediction service unavailable. Start backend and ensure model dependencies are installed.");
    } finally {
      setLoadingPredict(false);
    }
  };

  const askAssistant = async (event) => {
    event.preventDefault();
    if (!ragQuestion.trim()) return;

    setLoadingRag(true);
    setRagError("");

    try {
      const res = await axios.post(
        apiUrl("/rag"),
        { question: ragQuestion },
        { headers: authHeaders }
      );
      setRagAnswer(res.data.response);
      setRagQuestion("");
    } catch (error) {
      if (!error?.response) {
        setRagError("Cannot reach API. Set VITE_API_BASE_URL in Vercel to your Render backend URL.");
        return;
      }

      const detail = error?.response?.data?.detail;
      setRagError(detail || "RAG endpoint unavailable. Verify your API keys and backend state.");
    } finally {
      setLoadingRag(false);
    }
  };

  return (
    <main className="page">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=Manrope:wght@400;600;700&display=swap");

        :root {
          --ink: #fdf8f4;
          --ink-strong: #fff4ec;
          --muted: #ffd2b8;
          --panel: rgba(24, 12, 20, 0.64);
          --panel-border: rgba(255, 176, 108, 0.2);
          --brand-a: #ff7b24;
          --brand-b: #f43f5e;
          --brand-c: #fbbf24;
          --radius-xl: 26px;
          --radius-lg: 18px;
          --shadow-deep: 0 30px 80px rgba(20, 6, 11, 0.55);
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          min-height: 100vh;
          color: var(--ink);
          font-family: "Manrope", sans-serif;
          background:
            radial-gradient(1300px 580px at 0% -20%, rgba(255, 170, 90, 0.22) 0%, transparent 60%),
            radial-gradient(900px 460px at 100% 0%, rgba(244, 63, 94, 0.25) 0%, transparent 58%),
            linear-gradient(180deg, #12080f 0%, #1a0d12 45%, #230f12 100%);
        }

        .page {
          width: min(1240px, 94vw);
          margin: 0 auto;
          padding: 22px 0 36px;
          display: grid;
          gap: 18px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-radius: 16px;
          background: rgba(255, 138, 43, 0.08);
          border: 1px solid rgba(255, 174, 111, 0.26);
          box-shadow: 0 0 0 1px rgba(255, 196, 146, 0.05) inset;
          padding: 12px 16px;
          backdrop-filter: blur(8px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: "Outfit", sans-serif;
          letter-spacing: 0.04em;
          font-weight: 700;
          color: var(--ink-strong);
        }

        .brand-dot {
          width: 13px;
          height: 13px;
          border-radius: 999px;
          background: linear-gradient(120deg, #ff9d2f 0%, #ff5f35 100%);
          box-shadow: 0 0 15px #ff9d2f;
        }

        .status { display: flex; align-items: center; gap: 10px; }
        .status small { color: var(--muted); }

        .btn-inline {
          border: 1px solid rgba(255, 184, 130, 0.35);
          border-radius: 999px;
          color: #ffe7d8;
          background: rgba(255, 123, 36, 0.2);
          padding: 6px 10px;
          cursor: pointer;
        }

        .hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255, 172, 112, 0.3);
          background: linear-gradient(130deg, rgba(255, 126, 32, 0.25) 0%, rgba(241, 53, 87, 0.22) 45%, rgba(254, 193, 83, 0.16) 100%);
          box-shadow: var(--shadow-deep);
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
          padding: clamp(18px, 3.4vw, 32px);
        }

        .hero-text h1 {
          margin: 0;
          font-family: "Outfit", sans-serif;
          font-size: clamp(1.8rem, 4vw, 3.2rem);
          line-height: 1.04;
          letter-spacing: -0.03em;
          max-width: 13ch;
        }

        .hero-text p { margin: 12px 0 0; max-width: 52ch; color: #ffd8be; line-height: 1.6; }

        .hero-kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
        .hero-kpis span {
          border-radius: 999px;
          border: 1px solid rgba(255, 188, 139, 0.35);
          padding: 7px 11px;
          color: #ffe7d8;
          font-size: 0.86rem;
          background: rgba(65, 26, 31, 0.45);
        }

        .hero-image {
          border-radius: 18px;
          border: 1px solid rgba(255, 192, 138, 0.28);
          overflow: hidden;
          transform: rotate(-1.2deg) translateZ(0);
          box-shadow: 0 26px 35px rgba(16, 3, 8, 0.45), 0 1px 0 rgba(255, 237, 221, 0.35) inset;
        }

        .hero-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .auth-card,
        .panel {
          border-radius: var(--radius-xl);
          border: 1px solid var(--panel-border);
          background: var(--panel);
          backdrop-filter: blur(10px);
          box-shadow: var(--shadow-deep);
          padding: 16px;
        }

        .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; }
        .panel h2, .auth-card h2 { margin: 0; font-family: "Outfit", sans-serif; letter-spacing: 0.01em; }

        .auth-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
        .tab {
          border: 1px solid rgba(255, 196, 132, 0.32);
          border-radius: 999px;
          padding: 7px 11px;
          cursor: pointer;
          color: #ffdcbf;
          background: rgba(255, 168, 90, 0.14);
        }
        .tab.active { background: linear-gradient(130deg, rgba(255, 168, 90, 0.34), rgba(244, 63, 94, 0.28)); }

        .layout { display: grid; grid-template-columns: 1.12fr 0.88fr; gap: 18px; }

        .pill {
          background: linear-gradient(130deg, rgba(255, 168, 90, 0.24), rgba(244, 63, 94, 0.24));
          border: 1px solid rgba(255, 196, 132, 0.32);
          border-radius: 999px;
          padding: 6px 10px;
          color: #ffdcbf;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .field { display: grid; gap: 6px; }
        .field.full { grid-column: 1 / -1; }

        label { color: #ffd4b6; font-size: 0.82rem; }

        input, select, textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 194, 146, 0.28);
          background: rgba(27, 12, 19, 0.78);
          color: #ffe9d8;
          font: inherit;
          padding: 10px;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
        }

        textarea { min-height: 94px; resize: vertical; }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: rgba(255, 163, 95, 0.7);
          box-shadow: 0 0 0 4px rgba(255, 124, 36, 0.18);
        }

        .switch-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 2px; }
        .switch-row label { display: inline-flex; align-items: center; gap: 7px; font-size: 0.83rem; color: #ffdecb; }
        .switch-row input { width: 16px; height: 16px; accent-color: #ff8e33; }

        .actions { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .error { color: #ff9e90; font-size: 0.9rem; }

        .btn {
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          color: #fffaf7;
          font-weight: 700;
          font-family: "Outfit", sans-serif;
          letter-spacing: 0.03em;
          background: linear-gradient(130deg, var(--brand-a) 0%, var(--brand-b) 52%, var(--brand-c) 100%);
          box-shadow: 0 10px 28px rgba(244, 63, 94, 0.35), 0 1px 0 rgba(255, 255, 255, 0.3) inset;
          cursor: pointer;
        }

        .btn:disabled { opacity: 0.58; cursor: not-allowed; }

        .result-main {
          border-radius: 14px;
          border: 1px solid rgba(255, 181, 124, 0.3);
          padding: 12px;
          background: linear-gradient(170deg, rgba(255, 142, 51, 0.24) 0%, rgba(244, 63, 94, 0.22) 100%);
        }

        .result-main h3 { margin: 0; font-family: "Outfit", sans-serif; font-size: 1.2rem; }
        .result-main p { margin: 8px 0 0; color: #ffe6d4; line-height: 1.5; font-size: 0.95rem; }

        .rec-grid { margin-top: 10px; display: grid; gap: 9px; }
        .rec-card {
          border-radius: 13px;
          border: 1px solid rgba(255, 184, 130, 0.22);
          background: linear-gradient(160deg, color-mix(in srgb, var(--tint) 22%, rgba(22, 10, 16, 0.9)) 0%, rgba(16, 7, 12, 0.9) 100%);
          padding: 10px;
          box-shadow: 0 8px 16px rgba(4, 2, 5, 0.35);
        }
        .rec-card.top {
          border-color: color-mix(in srgb, var(--tint) 65%, #ffd3ae);
          box-shadow: 0 14px 28px color-mix(in srgb, var(--tint) 28%, rgba(4, 2, 5, 0.6));
        }

        .rec-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .rec-head p { margin: 0; color: #ffd6bc; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .rec-head span { font-weight: 700; color: #fff; }
        .rec-card h4 { margin: 5px 0 2px; font-size: 1rem; color: #fff4e9; }
        .rec-card small { color: #ffd7bb; }

        .snippets { margin-top: 12px; display: grid; gap: 8px; }
        .snippet {
          margin: 0;
          border-left: 3px solid rgba(255, 174, 109, 0.8);
          padding: 8px 9px;
          border-radius: 0 10px 10px 0;
          background: rgba(255, 151, 67, 0.1);
          color: #ffd8bf;
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .assistant-box {
          margin-top: 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 180, 126, 0.23);
          background: rgba(17, 8, 13, 0.72);
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .assistant-answer {
          border-radius: 12px;
          border: 1px solid rgba(255, 180, 128, 0.2);
          padding: 10px;
          min-height: 120px;
          line-height: 1.55;
          color: #ffe4d0;
          background: rgba(33, 13, 20, 0.74);
          white-space: pre-wrap;
        }

        .history-list { display: grid; gap: 8px; max-height: 220px; overflow-y: auto; }
        .history-item {
          border: 1px solid rgba(255, 184, 130, 0.2);
          border-radius: 10px;
          padding: 8px;
          background: rgba(255, 150, 75, 0.08);
          color: #ffd8bf;
          font-size: 0.86rem;
        }

        .foot { text-align: center; color: #ffccb0; font-size: 0.82rem; }

        @media (max-width: 1120px) {
          .hero { grid-template-columns: 1fr; }
          .layout { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          OLEA Insurance Intelligence
        </div>
        <div className="status">
          <small>{user ? `Signed in as ${user.full_name}` : "Authentication required"}</small>
          {user ? (
            <button className="btn-inline" onClick={logout} type="button">
              Logout
            </button>
          ) : null}
        </div>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1>Premium bundle matching for every profile.</h1>
          <p>
            Sign in to save every account and prediction in MySQL. Enter customer data to run model.pkl predictions enriched
            with PDF context snippets.
          </p>
          <div className="hero-kpis">
            <span>Auth: Sign up / Sign in</span>
            <span>MySQL persistence</span>
            <span>Saved prediction history</span>
          </div>
        </div>
        <div className="hero-image">
          <img src={oleaBanner} alt="OLEA sunset brand banner" />
        </div>
      </section>

      {!user ? (
        <section className="auth-card">
          <h2>Access Your OLEA Workspace</h2>
          {isApiNotConfigured ? (
            <p className="error" style={{ marginTop: 8 }}>
              API is not configured for this deployment. Set VITE_API_BASE_URL in Vercel to your Render backend URL.
            </p>
          ) : null}
          <div className="auth-tabs">
            <button type="button" className={`tab ${authMode === "signin" ? "active" : ""}`} onClick={() => setAuthMode("signin")}>
              Sign In
            </button>
            <button type="button" className={`tab ${authMode === "signup" ? "active" : ""}`} onClick={() => setAuthMode("signup")}>
              Sign Up
            </button>
          </div>

          <form onSubmit={submitAuth}>
            <div className="form-grid">
              {authMode === "signup" ? (
                <div className="field full">
                  <label>Full Name</label>
                  <input
                    value={authForm.full_name}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
              ) : null}
              <div className="field full">
                <label>Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="field full">
                <label>Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="actions">
              <span className="error">{authError}</span>
              <button className="btn" type="submit" disabled={authLoading}>
                {authLoading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Sign In"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="layout">
          <form className="panel" onSubmit={predictBundle}>
            <div className="panel-head">
              <h2>Client Profile Input</h2>
              <span className="pill">Predict Bundles</span>
            </div>

            <div className="form-grid">
              <div className="field"><label>Age</label><input type="number" min="18" value={profile.age} onChange={(e) => update("age", e.target.value)} /></div>
              <div className="field"><label>Annual Income (USD)</label><input type="number" min="0" value={profile.annual_income} onChange={(e) => update("annual_income", e.target.value)} /></div>
              <div className="field"><label>Adult Dependents</label><input type="number" min="0" value={profile.adult_dependents} onChange={(e) => update("adult_dependents", e.target.value)} /></div>
              <div className="field"><label>Child Dependents</label><input type="number" min="0" value={profile.child_dependents} onChange={(e) => update("child_dependents", e.target.value)} /></div>
              <div className="field"><label>Infant Dependents</label><input type="number" min="0" value={profile.infant_dependents} onChange={(e) => update("infant_dependents", e.target.value)} /></div>
              <div className="field"><label>Vehicles on Policy</label><input type="number" min="0" value={profile.vehicles_on_policy} onChange={(e) => update("vehicles_on_policy", e.target.value)} /></div>
              <div className="field"><label>Previous Claims Filed</label><input type="number" min="0" value={profile.previous_claims_filed} onChange={(e) => update("previous_claims_filed", e.target.value)} /></div>
              <div className="field"><label>Years Without Claims</label><input type="number" min="0" value={profile.years_without_claims} onChange={(e) => update("years_without_claims", e.target.value)} /></div>
              <div className="field"><label>Deductible Tier</label><select value={profile.deductible_tier} onChange={(e) => update("deductible_tier", e.target.value)}><option value={1}>Tier 1</option><option value={2}>Tier 2</option><option value={3}>Tier 3</option></select></div>
              <div className="field"><label>Days Since Quote</label><input type="number" min="0" value={profile.days_since_quote} onChange={(e) => update("days_since_quote", e.target.value)} /></div>
              <div className="field"><label>Acquisition Channel</label><select value={profile.acquisition_channel} onChange={(e) => update("acquisition_channel", e.target.value)}><option value="Direct_Website">Direct Website</option><option value="Local_Broker">Local Broker</option><option value="Corporate_Partner">Corporate Partner</option><option value="Affiliate_Group">Affiliate Group</option></select></div>
              <div className="field"><label>Payment Schedule</label><select value={profile.payment_schedule} onChange={(e) => update("payment_schedule", e.target.value)}><option value="Annual_Upfront">Annual Upfront</option><option value="Quarterly_Invoice">Quarterly Invoice</option></select></div>
              <div className="field"><label>Employment Status</label><select value={profile.employment_status} onChange={(e) => update("employment_status", e.target.value)}><option value="Employed">Employed</option><option value="Self_Employed">Self Employed</option><option value="Contractor">Contractor</option><option value="Unemployed">Unemployed</option></select></div>
              <div className="field"><label>Region Code</label><input value={profile.region_code} onChange={(e) => update("region_code", e.target.value)} placeholder="e.g. GBR" /></div>
              <div className="field"><label>Broker ID</label><input value={profile.broker_id} onChange={(e) => update("broker_id", e.target.value)} placeholder="Optional broker ID" /></div>
              <div className="field full"><label>Profile Notes</label><textarea value={profile.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Lifestyle, risk preference, family priorities..." /></div>
              <div className="field full switch-row">
                <label><input type="checkbox" checked={profile.existing_policyholder} onChange={(e) => update("existing_policyholder", e.target.checked)} />Existing Policyholder</label>
                <label><input type="checkbox" checked={profile.has_employer_id} onChange={(e) => update("has_employer_id", e.target.checked)} />Has Employer ID</label>
                <label><input type="checkbox" checked={profile.has_broker_id} onChange={(e) => update("has_broker_id", e.target.checked)} />Has Broker ID</label>
              </div>
            </div>

            <div className="actions">
              <span className="error">{predictError}</span>
              <button className="btn" type="submit" disabled={!canPredict}>{loadingPredict ? "Predicting..." : "Predict Bundles"}</button>
            </div>
          </form>

          <div className="panel">
            <div className="panel-head"><h2>Prediction Results</h2><span className="pill">Saved in MySQL</span></div>

            {prediction ? (
              <>
                <div className="result-main">
                  <h3>{prediction.recommended_bundle_code} · {prediction.recommended_bundle_name}</h3>
                  <p>{prediction.reasoning}</p>
                </div>

                <div className="rec-grid">
                  {prediction.top_recommendations.map((item, idx) => (
                    <RecommendationCard key={`${item.bundle_id}-${idx}`} item={item} isTop={idx === 0} />
                  ))}
                </div>

                <div className="snippets">
                  {prediction.context_snippets.map((snippet, idx) => (
                    <p className="snippet" key={`${idx}-${snippet.slice(0, 20)}`}>{snippet}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="assistant-answer">Run a prediction to see recommendations and PDF context snippets.</div>
            )}

            <div className="assistant-box">
              <div className="panel-head" style={{ marginBottom: 0 }}><h2>OLEA Assistant</h2><span className="pill">Authenticated RAG</span></div>
              <div className="assistant-answer">{loadingRag ? "Thinking..." : ragAnswer}</div>
              <form onSubmit={askAssistant}>
                <div className="field"><textarea value={ragQuestion} onChange={(e) => setRagQuestion(e.target.value)} placeholder="Ask about coverage, claim strategy, or plan differences..." /></div>
                <div className="actions">
                  <span className="error">{ragError}</span>
                  <button className="btn" type="submit" disabled={!canAskRag}>{loadingRag ? "Sending..." : "Ask Assistant"}</button>
                </div>
              </form>
            </div>

            <div className="assistant-box">
              <div className="panel-head" style={{ marginBottom: 0 }}><h2>My Saved Predictions</h2><span className="pill">Latest 30</span></div>
              <div className="history-list">
                {savedPredictions.length === 0 ? (
                  <div className="history-item">No saved predictions yet.</div>
                ) : (
                  savedPredictions.map((entry) => {
                    const m = bundleMeta[entry.recommended_bundle_id] || { code: `B-${entry.recommended_bundle_id}` };
                    return (
                      <div className="history-item" key={entry.id}>
                        <div><strong>{m.code}</strong> · {formatPercent(entry.confidence)}</div>
                        <div>{new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <p className="foot">Predictions are model-based recommendations and must be reviewed by a licensed insurance professional.</p>
    </main>
  );
}
