import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Library from './pages/Library';
import Spin from './pages/Spin';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/collections" element={<Navigate to="/" replace />} />
            <Route path="/spin" element={<Spin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
