import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results/:id" element={<Results />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
};

export default App;
