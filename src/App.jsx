import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ServiceLogForm from './pages/ServiceLogForm';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<ServiceLogForm />} />
        <Route path="/edit/:id" element={<ServiceLogForm />} />
      </Routes>
    </Router>
  );
}

export default App;
