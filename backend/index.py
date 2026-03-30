"""
Quantum Wavefunction & Trap Potential Backend
=============================================
Run with:
    pip install fastapi uvicorn numpy
    python backend.py

API available at http://localhost:8000
Swagger docs at http://localhost:8000/docs
"""

import numpy as np
from fastapi import FastAPI

# np.trapz was removed in NumPy 2.0 — use np.trapezoid if available
_trapz = getattr(np, "trapezoid", getattr(np, "trapz", None))
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Quantum Wavefunction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ─────────────────────────────────────────────────────────────
class WavefunctionParams(BaseModel):
    v1:      float = 2.0     # Height of right Gaussian bump in V(x)
    v2:      float = 1.5     # Height of left  Gaussian bump in V(x)
    sigma1:  float = 0.5     # Width  of right Gaussian bump
    sigma2:  float = 0.5     # Width  of left  Gaussian bump
    d:       float = 2.0     # Separation between the 3 wave-packets
    w:       float = 0.8     # Width of each Gaussian wave-packet
    x0:      float = 2.0     # Centre position of the Gaussian bumps
    x_min:   float = -10.0
    x_max:   float =  10.0
    n_points: int  = 600
    omega:   float = 1.0     # Harmonic frequency — kept constant = 1


# ── Core physics ───────────────────────────────────────────────────────────────
def compute_wavefunction(p: WavefunctionParams) -> dict:
    """
    Wavefunction (image 1):
        psi(x,0) = N [ exp(-(x+d)^2 / 2w^2)
                     + exp(-x^2     / 2w^2)
                     + exp(-(x-d)^2 / 2w^2) ]
        N chosen so integral |psi|^2 dx = 1

    Trap Potential (image 2):
        V(x) = 1/2 * omega^2 * x^2
              + V1 * exp(-(x - x0)^2 / sigma1^2)
              + V2 * exp(-(x + x0)^2 / sigma2^2)
        (hbar = m = 1 natural units)
    """
    x = np.linspace(p.x_min, p.x_max, p.n_points)

    # Three Gaussian wave-packets
    g_left   = np.exp(-((x + p.d)**2) / (2 * p.w**2))
    g_center = np.exp(-(x**2)          / (2 * p.w**2))
    g_right  = np.exp(-((x - p.d)**2) / (2 * p.w**2))
    psi_raw  = g_left + g_center + g_right

    # Normalisation
    norm    = np.sqrt(_trapz(psi_raw**2, x))
    psi     = psi_raw / norm if norm > 1e-12 else psi_raw
    psi_sq  = psi**2

    # Trap potential
    V_harm  = 0.5 * p.omega**2 * x**2
    V_gauss = (  p.v1 * np.exp(-((x - p.x0)**2) / p.sigma1**2)
               + p.v2 * np.exp(-((x + p.x0)**2) / p.sigma2**2) )
    V_total = V_harm + V_gauss

    # Observables
    norm_check = float(_trapz(psi_sq, x))
    expect_x   = float(_trapz(x      * psi_sq, x))
    expect_x2  = float(_trapz(x**2   * psi_sq, x))
    delta_x    = float(np.sqrt(max(expect_x2 - expect_x**2, 0.0)))
    peak_x     = float(x[int(np.argmax(psi_sq))])

    return {
        "x":          x.tolist(),
        "psi":        psi.tolist(),
        "psi_sq":     psi_sq.tolist(),
        "V_total":    V_total.tolist(),
        "V_harmonic": V_harm.tolist(),
        "V_gauss":    V_gauss.tolist(),
        "stats": {
            "norm_check": round(norm_check, 6),
            "peak_x":     round(peak_x,    4),
            "expect_x":   round(expect_x,  4),
            "delta_x":    round(delta_x,   4),
            "V_max":      round(float(np.max(V_total)), 4),
        },
        "params": p.model_dump(),
    }


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.post("/wavefunction")
def api_wavefunction(params: WavefunctionParams):
    """Compute psi(x,0) and V(x) for given parameters."""
    return compute_wavefunction(params)

@app.get("/default")
def api_default():
    """Return wavefunction with default parameters."""
    return compute_wavefunction(WavefunctionParams())

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n  Quantum Wavefunction API")
    print("  POST /wavefunction  — compute psi and V")
    print("  GET  /default       — defaults")
    print("  GET  /docs          — Swagger UI")
    print("  http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)