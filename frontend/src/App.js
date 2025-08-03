import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/common/Header';
import ARRequestorPage from './pages/ARRequestorPage';
import RecruiterPage from './pages/RecruiterPage';
import './App.css';


function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Navigate to="/ar-requestor" replace />} />
            <Route path="/ar-requestor" element={<ARRequestorPage />} />
            <Route path="/recruiter" element={<RecruiterPage />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;