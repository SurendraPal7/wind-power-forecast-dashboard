# UK Wind Energy Forecast & Accuracy Analytics Dashboard

A pilot web application built for a UK electricity purchasing team to understand national-level wind generation forecasts, quantitatively evaluate forecast accuracy (MAE, MAPE, RMSE, bias), and make informed hedging and procurement decisions prior to day-ahead wholesale electricity market gate closure.

---

## Business Objective & Context

In the UK wholesale power market, electricity trading desks commit to day-ahead generation and off-take schedules before market gate closure. Wind generation intermittency introduces substantial volume and price risk.

- **Data Scope**: Target generation and purchasing decisions relevant to **January 2026**.
- **Data Sources (Elexon BMRS)**:
  - **Actual Generation**: `FUELHH/stream` filtered by `fuelType = WIND` (30-minute settlement period resolution).
  - **Forecasted Generation**: `WINDFOR/stream` (national wind generation forecasts with associated publication vintages).
- **Core Domain Logic**:
  - Accurate matching on target settlement period `startTime` (UTC).
  - Strict publication cutoff compliance: only forecasts published **before or at** the trading decision cutoff time (default: 11:00 UTC day-ahead) are valid for evaluation.
  - Transparent tracking of forecast vintage (`publishTime`) to prevent look-ahead bias.

---

## Technology Stack

- **Frontend**:
  - React 18
  - Vite 5
  - JavaScript (ESNext)
  - Tailwind CSS 3
  - Recharts 2
  - Axios 1.6
  - React Router DOM 6
  - Lucide React (Icons)
- **Backend**:
  - Python 3.10+
  - FastAPI
  - Uvicorn
  - Pandas 2.2+
  - NumPy 2.2+
  - HTTPX 0.28+
  - Pydantic v2 & Pydantic-Settings
  - Pytest
- **Infrastructure & Deployment**:
  - Docker & Docker Compose
  - Vercel (Frontend Target)
  - Python ASGI Hosting (Backend Target)

---

## Project Structure

```text
uk-wind-energy-analytics/
│
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── utils/
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_health.py
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml
├── .dockerignore
├── .gitignore
└── README.md
```

---

## Local Development Setup

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server (runs on port 8080)
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

- API Root: `http://localhost:8080/`
- Interactive API Docs (Swagger): `http://localhost:8080/docs`
- Health Endpoint: `http://localhost:8080/api/v1/health`

### 2. Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs on port 3000)
npm run dev
```

- Frontend Application: `http://localhost:3000/`

### 3. Docker Compose Setup (Optional)

```bash
docker-compose up --build
```

---

## Day-Ahead Forecast Selection Engine & Decision Policy

### Business Context & The Day-Ahead Decision Dilemma

In the UK wholesale power market, wind generation forecasts are constantly revised as new meteorological readings and numerical weather prediction (NWP) runs become available.
For any target 30-minute settlement period (`startTime`), the Elexon `WINDFOR` dataset contains dozens of forecast updates with distinct `publishTime` timestamps (ranging from multiple days ahead right up to settlement).

**Critical Business Rule**:
An electricity trading desk bidding in the Day-Ahead power auction (e.g. EPEX SPOT or Nord Pool UK) cannot make decisions using forecasts published **after** auction gate closure. Evaluating forecast performance using later intra-day forecasts introduces look-ahead bias and invalidates purchasing analytics.

### Decision Cutoff Policy Architecture

- **Default Policy (`UK_DAY_AHEAD_AUCTION`)**:
  - `day_offset`: 1 (Decisions made on Day $D-1$ for delivery on Day $D$)
  - `cutoff_time_utc`: `11:00` (Auction gate closure occurs at 11:00 UTC / 12:00 CET)
  - `cutoff_datetime_utc` formula:
    $$\text{Cutoff}(D) = (D - 1\text{ day}) \text{ at } 11:00:00\text{ UTC}$$
- **Configurability**:
  The policy is configurable via `DecisionCutoffPolicy` in [`backend/app/core/decision_cutoff_config.py`](file:///d:/assingment%201/backend/app/core/decision_cutoff_config.py) and via API query parameters (e.g., test 10:00 UTC, 12:00 UTC, or custom lead times).

### Selection Logic Workflow

For each target settlement period `startTime` on delivery day $D$:
1. Calculate the exact decision cutoff $\text{Cutoff}(D)$.
2. Collect all candidate forecast records matching `startTime`.
3. Filter candidates:
   $$\text{Eligible} = \{ \text{forecast} \mid \text{publishTime} \le \text{Cutoff}(D) \}$$
4. If $\text{Eligible}$ is non-empty:
   $$\text{Selected} = \arg\max_{\text{forecast} \in \text{Eligible}}(\text{publishTime})$$
5. If $\text{Eligible}$ is empty:
   The interval is marked as `UNAVAILABLE` with an explicit reason. **The engine never substitutes missing forecasts with zero or post-cutoff forecasts.**

### Illustrative Real Example (Observed from Elexon Data)

Target Delivery Interval: **`2026-01-02T12:00:00Z`**
Configured Cutoff: **`2026-01-01T11:00:00Z`**

| publishTime (UTC) | Forecast (MW) | Lead Time | Cutoff Comparison | Engine Decision |
| :--- | :--- | :--- | :--- | :--- |
| `2026-01-01T02:30:00Z` | 17,498 | 33.5h | $02:30 \le 11:00$ | `ELIGIBLE_SUPERSEDED` |
| `2026-01-01T04:30:00Z` | 17,558 | 31.5h | $04:30 \le 11:00$ | `ELIGIBLE_SUPERSEDED` |
| `2026-01-01T07:30:00Z` | 17,541 | 28.5h | $07:30 \le 11:00$ | `ELIGIBLE_SUPERSEDED` |
| **`2026-01-01T09:30:00Z`** | **17,739** | **26.5h** | **$09:30 \le 11:00$** | **`SELECTED` (Latest Pre-Cutoff)** |
| `2026-01-01T11:30:00Z` | 17,893 | 24.5h | $11:30 > 11:00$ | `POST_CUTOFF_EXCLUDED` |
| `2026-01-01T15:30:00Z` | 18,144 | 20.5h | $15:30 > 11:00$ | `POST_CUTOFF_EXCLUDED` |
| `2026-01-02T09:30:00Z` | 16,052 | 2.5h | $2026\text{-}01\text{-}02 > 11:00$ | `POST_CUTOFF_EXCLUDED` (Intra-Day) |

### Limitations & Assumptions

1. **Gate Closure Assumption**: The UK Day-Ahead wholesale market has multiple platforms (EPEX SPOT and Nord Pool UK). 11:00 UTC is the standard auction gate closure time, but the engine allows custom clock times to be specified per trading desk preference.
2. **Clock Drift**: All timestamps are parsed as UTC; national holidays or British Summer Time (BST) transitions in non-winter months are handled via UTC normalization without ambiguous local clock shifts.

---

## Quantitative Forecast Accuracy Engine

### Mathematical Formulations & Definitions

All error metrics are computed across valid matched 30-minute settlement observations ($N$):

1. **Absolute Error ($e_i$)**:
   $$e_i = | \text{actual}_i - \text{forecast}_i | \quad (\text{MW})$$
2. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} | \text{actual}_i - \text{forecast}_i | \quad (\text{MW})$$
   *Interpretation*: Expected absolute volume mismatch per 30-minute settlement period.
3. **Mean Absolute Percentage Error (MAPE)**:
   $$\text{MAPE} = \frac{1}{N_{\text{nonzero}}} \sum_{i \in \{i \mid \text{actual}_i > 0\}} \frac{| \text{actual}_i - \text{forecast}_i |}{\text{actual}_i} \times 100 \quad (\%)$$
   *Critical Implementation Rule*: Any period with $\text{actual}_i = 0\text{ MW}$ is strictly excluded from the MAPE denominator to prevent infinite/undefined results, and the exact count of zero-actual periods is recorded.
4. **Forecast Bias (Mean Signed Error)**:
   $$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (\text{forecast}_i - \text{actual}_i) \quad (\text{MW})$$
   *Interpretation*:
   - $\text{Bias} > 0$: Systematic over-forecasting (trader over-hedges, risking long imbalance penalties).
   - $\text{Bias} < 0$: Systematic under-forecasting (trader under-hedges, risking short imbalance penalties).
5. **Root Mean Square Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\text{actual}_i - \text{forecast}_i)^2} \quad (\text{MW})$$
   *Interpretation*: Heavily penalizes large forecasting misses that present peak liquidity risk.
6. **Interval Error Percentage**:
   $$\text{ErrorPct}_i = \frac{| \text{actual}_i - \text{forecast}_i |}{\text{actual}_i} \times 100 \quad (\% \text{ for } \text{actual}_i > 0)$$

---

## Testing

Run backend tests using pytest:

```bash
# From the backend directory
pytest tests/ -v
```

All 30 unit and integration tests verify:
- Exact mathematical calculation of MAE, MAPE, RMSE, and Bias.
- Safe zero-actual handling in MAPE without division-by-zero errors.
- Missing values are reported rather than fabricated as zeros.
- Missing generation records are safely dropped.
- Deterministic deduplication on settlement intervals.
- Strict timezone normalization to UTC.
- Multi-vintage forecast handling and isolation.
- Key-based (hash join) matching on target `startTime` (never array position).
- Day-Ahead decision cutoff enforcement (pre-cutoff vintage selection).
- Elexon client retry mechanisms and error handling.

Run frontend build verification:

```bash
# From the frontend directory
npm run build
```

---

## Elexon BMRS API Integration & Observed Schemas

The application directly queries the official Elexon Insights Solution stream endpoints:
- Base URL: `https://data.elexon.co.uk/bmrs/api/v1`

### 1. Actual Wind Generation (`/datasets/FUELHH/stream`)

Query parameters:
- `settlementDateFrom` / `settlementDateTo`: e.g. `2026-01-01`
- `fuelType`: `WIND`

Observed real API response structure:
```json
[
  {
    "dataset": "FUELHH",
    "publishTime": "2026-01-01T00:30:00Z",
    "startTime": "2026-01-01T00:00:00Z",
    "settlementDate": "2026-01-01",
    "settlementPeriod": 1,
    "fuelType": "WIND",
    "generation": 13756
  }
]
```

### 2. Forecast Wind Generation (`/datasets/WINDFOR/stream`)

Query parameters:
- `publishDateTimeFrom` / `publishDateTimeTo`: e.g. `2026-01-01T00:00:00Z` to `2026-01-01T23:59:59Z`

Observed real API response structure:
```json
[
  {
    "dataset": "WINDFOR",
    "publishTime": "2026-01-01T09:30:00Z",
    "startTime": "2026-01-02T00:00:00Z",
    "generation": 18699
  }
]
```

### 3. Matched Standardized Record (`/api/v1/elexon/matched`)

Processed output after deduplication, normalization, and Day-Ahead cutoff evaluation:
```json
{
  "startTime": "2026-01-02T00:00:00Z",
  "publishTime": "2026-01-01T09:30:00Z",
  "forecastGeneration": 18699.0,
  "actualGeneration": 15228.0,
  "absoluteError": 3471.0,
  "error": 3471.0,
  "percentageError": 22.79,
  "settlementDate": "2026-01-02",
  "settlementPeriod": 1
}
```

---

## Verification Endpoints (FastAPI Port: 8080)

Test the integration directly via curl or browser:

- **Connectivity Probe**:
  `GET http://localhost:8080/api/v1/elexon/connectivity`
- **Actual Wind Records**:
  `GET http://localhost:8080/api/v1/elexon/actual?start_date=2026-01-01&end_date=2026-01-01`
- **Forecast Wind Records**:
  `GET http://localhost:8080/api/v1/elexon/forecast?target_date=2026-01-01`
- **Matched Records (Day-Ahead Cutoff at 11:00 UTC)**:
  `GET http://localhost:8080/api/v1/elexon/matched?delivery_date=2026-01-02&cutoff_time=11:00`

---

## AI Tools Acknowledgment

As required by the assignment guidelines, this project development was assisted by:
- **Google Antigravity (Powered by Gemini 3.8 Flash)**: Used for architecture design, boilerplate scaffolding, test authoring, configuration, and step-by-step implementation.
