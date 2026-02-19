import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ServiceLogForm = lazy(() => import('./pages/ServiceLogForm'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<ServiceLogForm />} />
          <Route path="/edit/:id" element={<ServiceLogForm />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
