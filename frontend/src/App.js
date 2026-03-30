/**
 * Quantum Wavefunction Explorer — React Frontend (App.jsx)
 * =========================================================
 * Setup:
 *   npm create vite@latest quantum-app -- --template react
 *   cd quantum-app
 *   npm install recharts
 *   Replace src/App.jsx  with this file
 *   Replace src/App.css  with App.css (provided separately)
 *   npm run dev
 *
 * Requires backend.py running:  python backend.py
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import "./App.css";

const API = "http://localhost:8000";

// ── API call ──────────────────────────────────────────────────────────────────
async function fetchWavefunction(params) {
  const res = await fetch(`${API}/wavefunction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Downsample for chart perf ─────────────────────────────────────────────────
function buildChartData(x, seriesMap, n = 350) {
  const step = Math.max(1, Math.floor(x.length / n));
  return x
    .filter((_, i) => i % step === 0)
    .map((xi, i) => {
      const src = i * step;
      const row = { x: +xi.toFixed(3) };
      for (const [key, arr] of Object.entries(seriesMap))
        row[key] = +arr[src].toFixed(5);
      return row;
    });
}

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ symbol, label, desc, min, max, step, value, color, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-wrap">
      <div className="slider-top">
        <span className="slider-symbol">{symbol}</span>
        <span className="slider-label">{label}</span>
        <span className="slider-val" style={{ color }}>{value.toFixed(2)}</span>
      </div>
      {desc && <p className="slider-desc">{desc}</p>}
      <div className="slider-track">
        <div className="slider-fill" style={{ width: `${pct}%`, background: color }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(+e.target.value)}
        />
      </div>
      <div className="slider-limits"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div className="stat">
      <div className="stat-val" style={{ color }}>{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <p className="tip-x">x = {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke }}>
          {p.name} = {p.value}
        </p>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [v1,     setV1]     = useState(2.0);
  const [v2,     setV2]     = useState(1.5);
  const [sigma1, setSigma1] = useState(0.5);
  const [sigma2, setSigma2] = useState(0.5);
  const [d,      setD]      = useState(2.0);
  const [w,      setW]      = useState(0.8);
  const [x0,     setX0]     = useState(2.0);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const timer = useRef(null);

  const compute = useCallback(async (p) => {
    setLoading(true); setError(null);
    try { setData(await fetchWavefunction(p)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => compute({ v1, v2, sigma1, sigma2, d, w, x0, omega: 1.0 }),
      100
    );
    return () => clearTimeout(timer.current);
  }, [v1, v2, sigma1, sigma2, d, w, x0, compute]);

  const psiData = data
    ? buildChartData(data.x, { psi: data.psi, psi_sq: data.psi_sq })
    : [];

  const potData = data
    ? buildChartData(data.x, {
        V_total:    data.V_total,
        V_harmonic: data.V_harmonic,
        V_gauss:    data.V_gauss,
      })
    : [];

  const s = data?.stats;

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-left">
          <span className="hdr-icon">⚛</span>
          <div>
            <h1>Quantum Wavefunction Explorer</h1>
            <p className="hdr-eq">
              ψ(x,0) = N [e<sup>-(x+d)²/2w²</sup> + e<sup>-x²/2w²</sup> + e<sup>-(x-d)²/2w²</sup>]
              &nbsp;·&nbsp;
              V(x) = ½ω²x² + V₁e<sup>-(x−x₀)²/σ₁²</sup> + V₂e<sup>-(x+x₀)²/σ₂²</sup>
            </p>
          </div>
        </div>
        <div className={`badge ${loading ? "spin" : error ? "err" : data ? "ok" : ""}`}>
          {loading ? "Computing…" : error ? "API Error" : data ? "● Live" : "Connecting…"}
        </div>
      </header>

      {error && (
        <div className="err-bar">
          ⚠ Cannot reach backend — run <code>python backend.py</code> on port 8000. ({error})
        </div>
      )}

      <div className="layout">

        {/* ══ Controls ══ */}
        <aside className="sidebar">

          <section className="ctrl-section">
            <h3 className="ctrl-title">
              <span className="ctrl-dot" style={{ background: "#fbbf24" }} />
              Potential  V(x)
            </h3>

            <div className="sub-label">Gaussian Heights  (variable)</div>
            <Slider symbol="V₁" label="right bump height"
              desc="V₁·exp(-(x−x₀)²/σ₁²)"
              min={0} max={10} step={0.1} value={v1} color="#fbbf24" onChange={setV1} />
            <Slider symbol="V₂" label="left bump height"
              desc="V₂·exp(-(x+x₀)²/σ₂²)"
              min={0} max={10} step={0.1} value={v2} color="#fb923c" onChange={setV2} />

            <div className="sub-label" style={{ marginTop: 14 }}>Gaussian Widths  (variable)</div>
            <Slider symbol="σ₁" label="right bump width"
              min={0.1} max={4} step={0.05} value={sigma1} color="#a78bfa" onChange={setSigma1} />
            <Slider symbol="σ₂" label="left bump width"
              min={0.1} max={4} step={0.05} value={sigma2} color="#c084fc" onChange={setSigma2} />

            <div className="sub-label" style={{ marginTop: 14 }}>Bump position</div>
            <Slider symbol="x₀" label="centre ±x₀"
              min={0.5} max={6} step={0.1} value={x0} color="#34d399" onChange={setX0} />
          </section>

          <section className="ctrl-section">
            <h3 className="ctrl-title">
              <span className="ctrl-dot" style={{ background: "#38bdf8" }} />
              Wavefunction  ψ(x,0)
            </h3>
            <Slider symbol="d" label="packet separation"
              desc="gap between the 3 Gaussians"
              min={0.5} max={5} step={0.1} value={d} color="#38bdf8" onChange={setD} />
            <Slider symbol="w" label="packet width"
              desc="width of each Gaussian packet"
              min={0.2} max={2.5} step={0.05} value={w} color="#22d3ee" onChange={setW} />
          </section>

          <section className="ctrl-section">
            <h3 className="ctrl-title">
              <span className="ctrl-dot" style={{ background: "#64748b" }} />
              Constants (fixed)
            </h3>
            <div className="const-grid">
              {[["ω", "1.0", "rad/s"], ["ℏ", "1.0", "n.u."], ["m", "1.0", "n.u."]].map(
                ([k, v, u]) => (
                  <div className="const-item" key={k}>
                    <span className="const-sym">{k}</span>
                    <span className="const-num">{v}</span>
                    <span className="const-unit">{u}</span>
                  </div>
                )
              )}
            </div>
          </section>
        </aside>

        {/* ══ Charts ══ */}
        <main className="charts">

          {/* Stats */}
          {s && (
            <div className="stats">
              <Stat label="∫|ψ|²dx  (norm)" value={s.norm_check} color="#22d3ee" />
              <Stat label="⟨x⟩  expected" value={s.expect_x} color="#38bdf8" />
              <Stat label="Δx  spread" value={s.delta_x} color="#a78bfa" />
              <Stat label="peak |ψ|² at x" value={s.peak_x} color="#fbbf24" />
              <Stat label="V_max" value={s.V_max} color="#fb923c" />
            </div>
          )}

          {/* ψ chart */}
          <div className="chart-card">
            <div className="chart-hdr">
              <span className="chart-title">Wavefunction  ψ(x, 0)</span>
              <div className="chart-legend">
                <span><em style={{ background: "#38bdf8" }} />ψ(x,0)</span>
                <span><em style={{ background: "#a78bfa" }} />|ψ|²  probability density</span>
              </div>
            </div>
            <div className="chart-wrap">
              {loading && <div className="overlay"><div className="spin-ring" />Recalculating…</div>}
              <ResponsiveContainer width="100%" height={270}>
                <LineChart data={psiData} margin={{ top: 6, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" stroke="#334155" tick={{ fontSize: 11, fontFamily: "monospace" }}
                    label={{ value: "x  (ℓ)", position: "insideBottomRight", offset: -6, fill: "#475569", fontSize: 11 }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Tooltip content={<ChartTip />} />
                  <ReferenceLine x={0} stroke="#334155" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="psi"    name="ψ(x,0)"    stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="psi_sq" name="|ψ(x,0)|²" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* V chart */}
          <div className="chart-card">
            <div className="chart-hdr">
              <span className="chart-title">Trap Potential  V(x)</span>
              <div className="chart-legend">
                <span><em style={{ background: "#fbbf24" }} />V(x) total</span>
                <span><em style={{ background: "#475569" }} />½ω²x²</span>
                <span><em style={{ background: "#fb923c" }} />Gaussian bumps</span>
              </div>
            </div>
            <div className="chart-wrap">
              {loading && <div className="overlay"><div className="spin-ring" />Recalculating…</div>}
              <ResponsiveContainer width="100%" height={270}>
                <LineChart data={potData} margin={{ top: 6, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" stroke="#334155" tick={{ fontSize: 11, fontFamily: "monospace" }}
                    label={{ value: "x  (ℓ)", position: "insideBottomRight", offset: -6, fill: "#475569", fontSize: 11 }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 11, fontFamily: "monospace" }} domain={[-0.5, "auto"]} />
                  <Tooltip content={<ChartTip />} />
                  <ReferenceLine x={0} stroke="#334155" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="V_total"    name="V(x)"    stroke="#fbbf24" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="V_harmonic" name="½ω²x²"   stroke="#475569" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="V_gauss"    name="V_gauss" stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="footer">
            Python · FastAPI · NumPy &nbsp;|&nbsp; React · Recharts &nbsp;|&nbsp; ℏ = m = 1 · ω = 1
          </p>
        </main>
      </div>
    </div>
  );
}
