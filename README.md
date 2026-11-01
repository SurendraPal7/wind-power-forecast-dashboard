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

## Testing

Run backend tests using pytest:

```bash
# From the backend directory
pytest tests/ -v
```

All 15 unit and integration tests verify:
- Missing generation records are safely dropped and never fabricated as zeros.
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
