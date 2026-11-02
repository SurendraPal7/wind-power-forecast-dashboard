import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import GenerationForecast from './pages/GenerationForecast';
import ForecastAccuracy from './pages/ForecastAccuracy';
import ForecastHistory from './pages/ForecastHistory';
import DataExplorer from './pages/DataExplorer';

export default function App() {
  return (
    <DashboardProvider>
      <Routes>
        <Route element={<DashboardLayout title="Overview & Market KPIs" />}>
          <Route path="/" element={<Overview />} />
        </Route>

        <Route element={<DashboardLayout title="Generation Forecast & Delivery" />}>
          <Route path="/forecast" element={<GenerationForecast />} />
          <Route path="/comparison" element={<GenerationForecast />} />
        </Route>

        <Route element={<DashboardLayout title="Quantitative Forecast Accuracy" />}>
          <Route path="/accuracy" element={<ForecastAccuracy />} />
        </Route>

        <Route element={<DashboardLayout title="Forecast Revisions & Publication Vintages" />}>
          <Route path="/history" element={<ForecastHistory />} />
        </Route>

        <Route element={<DashboardLayout title="Settlement Data Explorer" />}>
          <Route path="/explorer" element={<DataExplorer />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardProvider>
  );
}
