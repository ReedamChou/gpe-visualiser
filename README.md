# Quantum Wavefunction Explorer

Two files — React frontend + Python backend.

---

## Files
- `backend.py`  — FastAPI + NumPy physics engine
- `App.jsx`     — React UI with sliders and live charts

---

## Setup & Run

### 1. Python Backend

```bash
# Install dependencies
pip install fastapi uvicorn numpy

# Run (keep this terminal open)
python backend.py
# → Serving at http://localhost:8000
```

Test it's working:
```
http://localhost:8000/health
```

---

### 2. React Frontend

```bash
# Create a new React app
npx create-react-app quantum-explorer
cd quantum-explorer

# Install Recharts (for charts)
npm install recharts

# Replace src/App.js with the provided App.jsx
cp /path/to/App.jsx src/App.js

# Start the dev server
npm start
# → Opens http://localhost:3000
```

---

## Variable Parameters (sliders)

| Parameter | Description | Range |
|-----------|-------------|-------|
| V₁        | Height of right Gaussian bump in V(x) | 0 – 15 |
| V₂        | Height of left Gaussian bump in V(x)  | 0 – 15 |
| σ₁        | Width of right Gaussian bump          | 0.05 – 4 |
| σ₂        | Width of left Gaussian bump           | 0.05 – 4 |
| d         | Spacing between wave-packets          | 0.3 – 6 |
| w         | Width of each wave-packet             | 0.1 – 3 |
| x₀        | Position of potential bumps (±x₀)     | 0.3 – 7 |

## Fixed Constants
- ω = 1.0, ℏ = 1.0, m = 1.0  (natural units)

---

## Physics

**Wavefunction:**
```
ψ(x,0) = N [ exp(-(x+d)²/2w²) + exp(-x²/2w²) + exp(-(x-d)²/2w²) ]
```
N normalises so that ∫|ψ(x,0)|²dx = 1.

**Trap Potential:**
```
V(x) = ½mω²x²  +  V₁·exp(-(x-x₀)²/σ₁²)  +  V₂·exp(-(x+x₀)²/σ₂²)
```
