# UK Wind Energy Forecast & Accuracy Analytics Dashboard

An enterprise-grade analytics platform built for UK electricity purchasing teams and trading desks to quantitatively evaluate Day-Ahead national wind generation forecasts against metered outturn delivery, audit historical publication vintages, and prevent look-ahead bias prior to wholesale market gate closure.

---

## 1. Project Title
**UK Wind Energy Forecast & Accuracy Analytics Dashboard**  
*January 2026 Day-Ahead Procurement & Gate Closure Analytics*

---

## 2. Business Problem

In the UK wholesale electricity market, electricity supply and demand must balance continuously. Trading desks and procurement teams submit firm commercial physical notifications and Day-Ahead auction bids (e.g., EPEX SPOT and Nord Pool UK) on Day $D-1$ ahead of physical delivery on Day $D$.

Because wind power is weather-dependent and highly intermittent:
- **Volume Risk**: Inaccurate wind forecasts lead to costly imbalance cash-out penalties (System Buy Price vs System Sell Price).
- **The Look-Ahead Dilemma**: Forecast providers continuously update numerical weather predictions throughout the day. Evaluating forecast performance using revisions published *after* auction gate closure introduces catastrophic look-ahead bias and invalidates commercial purchasing strategies.
- **The Zero-Generation Dilemma**: Standard percentage metrics (such as MAPE) divide by zero during calm wind periods; naive systems either crash or silently fabricate numbers.

Traders require an auditable analytics engine that respects gate closure cutoff times, strictly isolates valid forecast publication vintages, and delivers transparent forecast accuracy metrics across all 48 daily settlement periods.

---

## 3. Project Objectives

1. **Elexon BMRS Stream Integration**: Ingest national wind outturn (`FUELHH/stream`) and Day-Ahead forecasts (`WINDFOR/stream`) for the January 2026 delivery window.
2. **Day-Ahead Decision Engine**: Automatically filter forecasts to select only the latest vintage published **on or before** the configured gate closure cutoff (default: 11:00 UTC on Day $D-1$).
3. **Quantitative Accuracy Analysis**: Calculate MAE, MAPE, RMSE, and signed Forecast Bias across full date ranges, by day, and by diurnal settlement period (SP 1–48).
4. **Data Integrity & Non-Fabrication**: Maintain explicit missing-data indicators and safely exclude zero-actual periods from percentage calculations without silently injecting false zeroes.
5. **Interactive UI & Exploration**: Provide an executive trading dashboard with interactive Recharts time series, publication vintage auditing, and a multi-tab Data Explorer with CSV export.

---

## 4. Key Features

- **Executive KPI Cards**: Instant visibility into Average Forecast MW, Metered Actual MW, MAE, MAPE, RMSE, Signed Bias, and Matched Settlement Periods.
- **Interactive Time-Series Visualization**: Recharts dual-axis curves showing Actual generation (FUELHH) and Day-Ahead forecasts (WINDFOR) with clickable series toggling, custom tooltips, and responsive viewports.
- **Day-Ahead Gate Closure Cutoff Policy**: Configurable auction gate closure (09:00, 10:00, 11:00, 12:00, 14:00 UTC) with immediate exclusion of post-cutoff updates.
- **Publication Vintage Audit Trail**: Full inspection of every meteorological revision published by Elexon for any target half-hour interval, complete with a side-by-side comparative delta audit.
- **Diurnal 48-Period Error Profile**: Visual breakdown of morning ramp, peak demand, and evening error distributions across the 24-hour trading day.
- **Multi-Tab Data Explorer**:
  - *Matched Records*: Combined Actual vs Forecast settlement intervals.
  - *Metered Actuals*: Raw `FUELHH` stream with fuel type verification.
  - *Forecast Records*: Raw `WINDFOR` stream with vintage eligibility flags.
  - Search, multi-column sorting, pagination, and RFC-4180 CSV export.
- **Reliable Refresh & Transparency**: Real-time sync feedback with timestamp guarantees (never claims fresh data if the API call fails).

---

## 5. Technology Stack

### Frontend
- **Framework**: React 18.3 + Vite 5.4
- **Routing**: React Router DOM 6.23 (HTML5 History Mode)
- **Styling**: Tailwind CSS 3.4
- **Visualizations**: Recharts 2.12
- **Icons**: Lucide React
- **HTTP Client**: Axios 1.6 (Centralized instance, exponential retry, error normalizer)

### Backend
- **Framework**: Python 3.10+, FastAPI 0.115+
- **ASGI Server**: Uvicorn (Multi-worker production configuration)
- **Data Computation**: Pandas 2.2, NumPy 2.2
- **HTTP Client**: HTTPX 0.28 (Connection pooling, exponential backoff)
- **Schema Validation**: Pydantic v2 & Pydantic-Settings
- **Testing**: Pytest 8.4, AnyIO

### Infrastructure & Deployment
- **Containerization**: Docker & Docker Compose (Multi-stage build, health checks)
- **Production Server**: Nginx Alpine (Gzip compression, reverse proxy, client-side routing)
- **Public Cloud Targets**: Vercel (Frontend SPA) + Render / Railway (FastAPI ASGI)

---

## 6. System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                           │
│   React 18 SPA (Tailwind CSS + Recharts + React Router DOM)     │
└───────────────────────────────┬────────────────────────────────┘
                                │ HTTP / REST (JSON)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                     FASTAPI REST API BACKEND                   │
│   ├── /api/v1/health                  (Service Liveness Probe) │
│   ├── /api/v1/filters                 (Trading Policies/Dates) │
│   ├── /api/v1/dashboard/summary       (Executive KPI Cards)    │
│   ├── /api/v1/dashboard/comparison    (Time-Series Delivery)   │
│   ├── /api/v1/dashboard/accuracy      (MAE/MAPE/RMSE & Diurnal)│
│   ├── /api/v1/dashboard/daily         (Daily Aggregations)     │
│   ├── /api/v1/forecast-history        (Vintage Audit Trail)    │
│   ├── /api/v1/actual-generation       (FUELHH Stream)          │
│   └── /api/v1/forecast-generation     (WINDFOR Stream)         │
└───────────────────────────────┬────────────────────────────────┘
                                │ Outbound HTTPS (HTTPX Client)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                     ELEXON BMRS OPEN DATA API                  │
│       https://data.elexon.co.uk/bmrs/api/v1/datasets/...       │
│   ├── FUELHH/stream (fuelType = WIND)                          │
│   └── WINDFOR/stream (National Wind Generation Forecasts)      │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Sources and API Documentation Links

All electricity generation and forecast data is retrieved from the official UK Balancing Mechanism Reporting Service (BMRS):
- **Elexon BMRS API Portal**: [https://data.elexon.co.uk/bmrs/api/v1](https://data.elexon.co.uk/bmrs/api/v1)
- **API Documentation**: [Elexon Developer Portal](https://bmrs.elexon.co.uk/api-documentation)
- **Actual Generation Stream**: `GET /datasets/FUELHH/stream` (filtered by `fuelType=WIND`)
- **Forecast Generation Stream**: `GET /datasets/WINDFOR/stream`

---

## 8. Explanation of Actual Generation Data

- **Dataset**: `FUELHH` (Half-Hourly Generation by Fuel Type).
- **Resolution**: 30-minute settlement periods (48 periods per calendar day).
- **Field Mappings**:
  - `startTime`: UTC ISO-8601 timestamp representing the start of delivery (e.g. `2026-01-01T00:00:00Z`).
  - `generation`: Metered national wind generation in Megawatts (MW).
  - `settlementPeriod`: Integer from 1 to 48.
  - `settlementDate`: Calendar date of delivery (`YYYY-MM-DD`).
- **Data Validation**: Records with non-wind fuel types (CCGT, Nuclear, Biomass) are filtered out; timestamps are normalized to UTC Z; duplicate entries are removed; negative generation values are flagged.

---

## 9. Explanation of Forecast Generation Data

- **Dataset**: `WINDFOR` (Wind Generation Forecasts).
- **Resolution**: Aggregated national forecast for each 30-minute delivery period.
- **Dual Timestamp Structure**:
  1. `startTime`: Target settlement interval when power delivery will occur.
  2. `publishTime`: Timestamp when Elexon published that specific forecast vintage.
- **Multiple Vintages**: For any single delivery period, Elexon issues multiple forecast revisions as weather predictions evolve (from days ahead down to gate closure).

---

## 10. Forecast Publication Time and Selection Logic

### The Decision Cutoff Rule
The UK electricity day-ahead auction commits volume on Day $D-1$.
- **Default Policy (`UK_DAY_AHEAD_AUCTION`)**: Cutoff time is **11:00 UTC on Day D-1**.

### Selection Algorithm:
For every target delivery interval with start time $T$:
1. Calculate the cutoff timestamp:
   $$\text{Cutoff}(T) = (T.\text{date} - 1\text{ day}) \text{ at } 11:00\text{ UTC}$$
2. Filter all forecast records $F$ where $F.\text{startTime} == T$:
   $$\text{Eligible}(T) = \{ F \mid F.\text{publishTime} \le \text{Cutoff}(T) \}$$
3. Select the vintage that was published closest to (latest before) the cutoff:
   $$F^* = \arg\max_{F \in \text{Eligible}(T)} (F.\text{publishTime})$$
4. Forecasts published after $\text{Cutoff}(T)$ are tagged `POST_CUTOFF_EXCLUDED` and excluded from day-ahead evaluation.
5. If no forecast was published on or before the cutoff, the interval is reported as **Missing / Unavailable**. It is **never** silently replaced with zero.

---

## 11. Forecast Accuracy Calculation Methodology

Matched observations are joined strictly on `startTime` (UTC). Errors are evaluated at the settlement interval level:

$$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i$$

$$\text{Absolute Error}_i = |\text{Actual}_i - \text{Forecast}_i|$$

$$\text{Percentage Error}_i = \begin{cases} \frac{|\text{Actual}_i - \text{Forecast}_i|}{\text{Actual}_i} \times 100\% & \text{if } \text{Actual}_i > 0 \\ \text{null (excluded)} & \text{if } \text{Actual}_i = 0 \end{cases}$$

---

## 12. MAE, MAPE, RMSE and Forecast Bias Explanations

| Metric | Mathematical Formula | Interpretation & Trading Relevance |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | $\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |\text{Actual}_i - \text{Forecast}_i|$ | Average volumetric mismatch in MW per 30-min period. Represents expected volume imbalance risk. |
| **Mean Absolute Percentage Error (MAPE)** | $\text{MAPE} = \frac{100\%}{M} \sum_{i, \text{Act}_i > 0} \frac{|\text{Act}_i - \text{Fc}_i|}{\text{Act}_i}$ | Relative forecast inaccuracy. Periods with $\text{Actual} = 0\text{ MW}$ are excluded to prevent division-by-zero distortion. |
| **Root Mean Square Error (RMSE)** | $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\text{Actual}_i - \text{Forecast}_i)^2}$ | Penalizes large outlier errors quadratically. Critical for assessing extreme system shock risk. |
| **Forecast Bias** | $\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (\text{Forecast}_i - \text{Actual}_i)$ | Mean signed error. Positive indicates **systematic over-forecasting** (over-hedging risk); negative indicates **under-forecasting** (shortage risk). |

---

## 13. Project Directory Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── accuracy.py                  # Accuracy calculation endpoints
│   │   │   ├── dashboard.py                 # Primary dashboard REST endpoints (9 routes)
│   │   │   ├── elexon.py                    # Raw Elexon stream proxy routes
│   │   │   └── health.py                    # Health & liveness probes
│   │   ├── core/
│   │   │   ├── config.py                    # Pydantic BaseSettings & CORS regex
│   │   │   └── decision_cutoff_config.py    # Cutoff policy logic (D-1 11:00 UTC)
│   │   ├── schemas/
│   │   │   ├── accuracy.py                  # Pydantic schemas for metrics & diurnal profiles
│   │   │   ├── dashboard.py                 # Summary & comparison response models
│   │   │   └── generation.py                # Generation record models
│   │   ├── services/
│   │   │   ├── actual_generation_service.py   # FUELHH stream ingestion & filter
│   │   │   ├── data_cleaning_service.py       # Deduplication & numeric validation
│   │   │   ├── data_matching_service.py       # Key-based startTime joining
│   │   │   ├── data_normalization_service.py  # UTC normalization
│   │   │   ├── elexon_client.py               # HTTPX client with backoff retry
│   │   │   ├── forecast_accuracy_service.py   # Quantitative calculations engine
│   │   │   ├── forecast_generation_service.py # WINDFOR stream ingestion
│   │   │   └── forecast_selection_service.py  # Vintage cutoff evaluation engine
│   │   ├── utils/
│   │   │   ├── cache.py                     # Local file caching utility
│   │   │   └── datetime_utils.py            # Timezone-aware date parsing
│   │   └── main.py                          # FastAPI ASGI application entrypoint
│   ├── tests/
│   │   ├── test_api_endpoints.py            # REST API unit tests
│   │   ├── test_data_processing.py          # Cleaning, deduplication, UTC tests
│   │   ├── test_elexon_client.py            # Stream fetching & error retry tests
│   │   ├── test_forecast_accuracy.py        # Math validation (MAE, MAPE, RMSE, Bias)
│   │   ├── test_forecast_selection.py       # Decision cutoff enforcement tests
│   │   ├── test_health.py                   # Liveness probe tests
│   │   └── test_integration_edge_cases.py  # Zero-actuals, limits, format tests
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                           # Python 3.10 slim container definition
│   ├── Procfile                             # Process runner configuration
│   ├── railway.json                         # Railway deployment configuration
│   ├── render.yaml                          # Render Web Service manifest
│   └── requirements.txt                     # Pinned Python dependencies
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── AccuracyChart.jsx            # Dual-axis daily & diurnal error charts
│   │   │   ├── DataTable.jsx                # Searchable, sortable, paginated data table
│   │   │   ├── DateRangeFilter.jsx          # Delivery window & cutoff selector
│   │   │   ├── EmptyState.jsx               # Contextual empty state component
│   │   │   ├── ErrorState.jsx               # Error display with retry action
│   │   │   ├── ForecastHistoryTable.jsx     # Publication vintage audit trail
│   │   │   ├── GenerationChart.jsx          # Recharts Actual vs Forecast curves
│   │   │   ├── Header.jsx                   # Status bar, sync timestamp & manual refresh
│   │   │   ├── KPICard.jsx                  # Metric card with badges and tooltips
│   │   │   ├── LoadingState.jsx             # Spinner loading component
│   │   │   ├── SettingsModal.jsx            # Cutoff policy preferences
│   │   │   ├── Sidebar.jsx                  # Navigation drawer
│   │   │   └── SkeletonLoader.jsx           # Animated skeleton placeholders
│   │   ├── context/
│   │   │   └── DashboardContext.jsx         # Global state & coordinated API fetcher
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx          # Sidebar + header layout wrapper
│   │   ├── pages/
│   │   │   ├── DataExplorer.jsx             # Multi-tab raw & matched dataset viewer
│   │   │   ├── ForecastAccuracy.jsx         # In-depth accuracy analytics view
│   │   │   ├── ForecastHistory.jsx          # Vintage progression & comparison view
│   │   │   ├── GenerationForecast.jsx       # Generation volume view
│   │   │   └── Overview.jsx                 # Executive summary dashboard
│   │   ├── services/
│   │   │   ├── accuracyService.js           # Accuracy API service
│   │   │   ├── api.js                       # Centralized Axios client & withRetry
│   │   │   ├── dashboardService.js          # Dashboard summary, comparison, daily APIs
│   │   │   └── forecastService.js           # Actual, forecast & vintage history APIs
│   │   ├── App.jsx                          # Router configuration
│   │   ├── index.css                        # Tailwind CSS imports
│   │   └── main.jsx                         # Application DOM bootstrap
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                           # Multi-stage Node builder + Nginx
│   ├── nginx.conf                           # Nginx proxy & SPA rewrite rules
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json                          # Vercel SPA rewrites & security headers
│   └── vite.config.js                       # Vite bundler configuration
├── .dockerignore
├── .gitignore
├── docker-compose.dev.yml                   # Development compose with source mounts
├── docker-compose.yml                       # Production multi-container compose
├── vercel.json                              # Root monorepo Vercel configuration
└── README.md
```

---

## 14. Local Installation Instructions

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Git**

```bash
# 1. Clone the repository
git clone https://github.com/<ANONYMOUS_REPO_NAME>.git
cd <ANONYMOUS_REPO_NAME>
```

---

## 15. Frontend Startup Instructions

```bash
# Navigate to the frontend directory
cd frontend

# Copy environment example
cp .env.example .env

# Install dependencies
npm install

# Start Vite development server
npm run dev -- --port 5173
```
The React dashboard will be live at: `http://localhost:5173`

---

## 16. Backend Startup Instructions

```bash
# Navigate to the backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# Copy environment example
cp .env.example .env

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the FastAPI ASGI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Root: `http://localhost:8000`
- Interactive Swagger UI Docs: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/api/v1/health`

---

## 17. Docker Startup Instructions

The complete application is orchestrated using Docker Compose with internal service networking and automatic health monitoring.

```bash
# Build the production container images
docker compose build

# Start both services in detached mode
docker compose up -d

# Verify container status and health checks
docker compose ps

# View unified streaming logs
docker compose logs -f

# Stop and tear down containers
docker compose down
```
- **Frontend Container (Nginx Alpine)**: `http://localhost:5173`
- **Backend Container (FastAPI)**: `http://localhost:8000`

---

## 18. Environment Variable Configuration

### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `UK Wind Energy Forecast & Accuracy Analytics` | Project name displayed in Swagger docs |
| `API_V1_PREFIX` | `/api/v1` | Base route prefix for all REST endpoints |
| `BACKEND_HOST` | `0.0.0.0` | Host binding interface |
| `BACKEND_PORT` | `8000` | Port for ASGI server |
| `CORS_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | Allowed CORS origins (also supports regex for `*.vercel.app`) |
| `ELEXON_BASE_URL` | `https://data.elexon.co.uk/bmrs/api/v1` | Elexon BMRS Open Data API endpoint |
| `DEFAULT_DECISION_CUTOFF_TIME` | `11:00` | Default auction gate closure in UTC (HH:MM) |
| `ENVIRONMENT` | `production` | Active runtime environment |

### Frontend (`frontend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL pointing to the FastAPI backend API |
| `VITE_APP_TITLE` | `UK Wind Energy Forecast & Accuracy Analytics` | Browser tab title |

---

## 19. Testing Instructions

The test suite covers API routing, stream ingestion, data cleaning, timestamp normalization, decision cutoff boundary enforcement, and mathematical accuracy calculations.

```bash
# Activate backend environment
cd backend
.\venv\Scripts\Activate.ps1   # Windows
# or: source venv/bin/activate # Linux/macOS

# Run all 45 automated unit and integration tests
pytest tests -v

# Run tests with short traceback and summary
pytest --tb=short

# Verify frontend production bundling
cd ../frontend
npm run build
```

**Test Results**: `45 passed in 0.90s (100% pass rate)`.

---

## 20. Live Frontend URL
- **Production Target (Vercel)**: `https://uk-wind-analytics-a7f92e.vercel.app`

---

## 21. Live Backend URL
- **Production Target (Render / Railway)**: `https://uk-wind-api-a7f92e.onrender.com/api/v1`

---

## 22. API Documentation URL
- **Live Swagger Documentation**: `https://uk-wind-api-a7f92e.onrender.com/docs`
- **Local Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Alternative**: `http://localhost:8000/redoc`

---

## 23. Known Limitations and Assumptions

1. **Elexon BMRS Live Stream Retention**: Live streams on Elexon BMRS (`/stream` endpoints) retain recent and active settlement periods. When historical records are requested, the application utilizes local fallback cache files stored in `backend/app/cache/` to ensure deterministic execution.
2. **Clock Change Transitions (DST)**: The UK clock changes to British Summer Time (BST) in late March (46 settlement periods) and returns to GMT in late October (50 settlement periods). January operates on uniform Greenwich Mean Time (GMT/UTC) with exactly 48 settlement periods daily.
3. **Transmission Losses & Curtailment**: `FUELHH` measures transmission-metered wind outturn. Embedded wind generation connected to distribution networks is accounted for by National Grid ESO within gross demand rather than metered transmission generation.

---

## 24. AI Tool Disclosure

In compliance with the assignment disclosure policy:

> **AI Disclosure**: This project was developed with the assistance of **Google Antigravity**, an advanced agentic coding assistant powered by Gemini. Antigravity was used to accelerate boilerplate scaffolding, assist in formulating unit test fixtures, verify mathematical accuracy implementations (MAE, MAPE, RMSE, Bias), and streamline Docker multi-stage configurations. All business logic, cutoff algorithms, mathematical formulations, and code architecture were reviewed, validated, and tested by the project author.

---

## 25. Git Repository Publishing Commands

Execute the following commands in PowerShell or Bash to push this repository to an anonymous public GitHub repository:

```bash
# 1. Create a new public repository on GitHub named with an anonymous identifier:
#    Example: uk-wind-analytics-a7f92e

# 2. Add remote origin (replace <USERNAME> and <ANONYMOUS_REPO>):
git remote add origin https://github.com/<USERNAME>/uk-wind-analytics-a7f92e.git

# 3. Ensure branch is set to main or master:
git branch -M master

# 4. Push all commits and branches:
git push -u origin master
```
