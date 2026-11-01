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

# Start FastAPI development server (runs on port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Root: `http://localhost:8000/`
- Interactive API Docs (Swagger): `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/v1/health`

### 2. Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs on port 5173)
npm run dev
```

- Frontend Application: `http://localhost:5173/`

### 3. Docker Compose Setup (Optional)

```bash
docker-compose up --build
```

---

## Testing

Run backend tests using pytest:

```bash
# From the backend directory
pytest tests/
```

Run frontend build verification:

```bash
# From the frontend directory
npm run build
```

---

## AI Tools Acknowledgment

As required by the assignment guidelines, this project development was assisted by:
- **Google Antigravity (Powered by Gemini 3.8 Flash)**: Used for architecture design, boilerplate scaffolding, test authoring, configuration, and step-by-step implementation.
