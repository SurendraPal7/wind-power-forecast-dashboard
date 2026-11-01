import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getHealth } from './services/api';
import { Activity, Wind, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBackendHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                UK Wind Energy Forecast & Accuracy Analytics
              </h1>
              <p className="text-xs text-slate-400">
                Day-Ahead Electricity Purchasing Decision Support
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
              Step 1: System Initialized
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full flex flex-col justify-center">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-8 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                Service Health & Integration Status
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Real-time connectivity between React (Port: 3000) and FastAPI (Port: 8080)
              </p>
            </div>
            <button
              onClick={fetchBackendHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Status Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frontend Card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Frontend Client
                </span>
                <span className="inline-flex items-center text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Ready
                </span>
              </div>
              <p className="text-2xl font-bold text-white">React + Vite</p>
              <p className="text-xs text-slate-400 mt-1">Port: 3000 | Tailwind CSS & Recharts Loaded</p>
            </div>

            {/* Backend Card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Backend API
                </span>
                {loading ? (
                  <span className="inline-flex items-center text-xs text-sky-400 font-medium">
                    <Activity className="w-4 h-4 mr-1 animate-spin" /> Checking...
                  </span>
                ) : error ? (
                  <span className="inline-flex items-center text-xs text-rose-400 font-medium">
                    <AlertCircle className="w-4 h-4 mr-1" /> Disconnected
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Operational
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">FastAPI Service</p>
              <p className="text-xs text-slate-400 mt-1">
                Port: 8080 | {health?.service || 'UK Wind Energy Analytics'}
              </p>
            </div>
          </div>

          {/* Response Payload Preview */}
          <div className="mt-6 bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs">
            <div className="text-slate-400 mb-2 font-semibold">GET /api/v1/health Response:</div>
            {loading ? (
              <div className="text-slate-500 italic">Querying backend service...</div>
            ) : error ? (
              <div className="text-rose-400">Error: {error}</div>
            ) : (
              <pre className="text-emerald-400 overflow-x-auto">
                {JSON.stringify(health, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/40 px-6 py-4 text-center text-xs text-slate-500">
        UK National Wind Forecast Accuracy Analytics • Scope: January 2026 Wholesale Market
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
