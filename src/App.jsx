import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// import Header from './components/Header'; // Removed
import TargetCalculator from './components/TargetCalculator';
import CountCalculator from './components/CountCalculator';
import DailyCalculator from './components/DailyCalculator';
import BibleViewer from './components/BibleViewer';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  // const [activeTab, setActiveTab] = useState('target'); // Replaced by router
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('app_font_size')) || 16);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Apply theme class to body
  useEffect(() => {
     document.body.className = ''; // Reset
     document.body.classList.add(theme);
     localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Persist font size
  useEffect(() => {
      localStorage.setItem('app_font_size', fontSize);
  }, [fontSize]);

  // Handler for theme change
  const handleThemeChange = (newTheme) => {
      setTheme(newTheme);
  };
  
  const handleFontSizeChange = (change) => {
      setFontSize(prev => {
          const newSize = prev + change;
          return Math.max(12, Math.min(newSize, 30)); // Min 12px, Max 30px
      });
  };
  
  const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
  };
  const closeSidebar = () => {
      setIsSidebarOpen(false);
  };
  
  // Close sidebar when tab changes (mobile friendly)
  const handleNavigation = (path) => {
      navigate(path);
      if (window.innerWidth <= 1024) { 
        closeSidebar();
      }
      // Or always close if it's a modal style
      closeSidebar();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Overlay for mobile/modal behavior */}
      {isSidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={closeSidebar}
          ></div>
      )}

      {/* Sidebar Navigation */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h1>Bible Tools</h1>
           <button className="close-btn" onClick={closeSidebar} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}>
             &times;
           </button>
        </div>
        
        <div className="nav-menu">
            <button 
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => handleNavigation('/')}
            >
              🏠 홈
            </button>
            <button 
              className={`nav-item ${isActive('/target') ? 'active' : ''}`}
              onClick={() => handleNavigation('/target')}
            >
              📊 어디까지?
            </button>
            <button 
              className={`nav-item ${isActive('/count') ? 'active' : ''}`}
              onClick={() => handleNavigation('/count')}
            >
              🔢 총 몇 장?
            </button>
            <button 
              className={`nav-item ${isActive('/daily') ? 'active' : ''}`}
              onClick={() => handleNavigation('/daily')}
            >
              📅 하루 몇 장?
            </button>
            <button 
              className={`nav-item ${isActive('/viewer') ? 'active' : ''}`}
              onClick={() => handleNavigation('/viewer')}
            >
              📖 성경 읽기
            </button>
        </div>

        {/* Sidebar Footer (Theme Switcher & Font Size) */}
        <div className="sidebar-footer">
            <div className="font-control" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', color: '#888' }}>글자 크기</span>
                <button 
                    onClick={() => handleFontSizeChange(-1)}
                    style={{ background: 'none', border: '1px solid #ddd', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    -
                </button>
                <span style={{ minWidth: '30px', textAlign: 'center', color: 'var(--text-color)' }}>{fontSize}</span>
                <button 
                    onClick={() => handleFontSizeChange(1)}
                    style={{ background: 'none', border: '1px solid #ddd', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    +
                </button>
                <button 
                    onClick={() => setFontSize(16)}
                    title="초기화"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#888', padding: '0 5px' }}
                >
                    ↺
                </button>
            </div>

            <div className="theme-toggle">
                <button 
                    onClick={() => handleThemeChange('light')}
                    className={theme === 'light' ? 'active' : ''}
                    title="기본 모드"
                >
                    ☀️
                </button>
                <button 
                    onClick={() => handleThemeChange('dark')}
                    className={theme === 'dark' ? 'active' : ''}
                    title="다크 모드"
                >
                    🌙
                </button>
                <button 
                    onClick={() => handleThemeChange('green')}
                    className={theme === 'green' ? 'active' : ''}
                    title="편안한 모드"
                >
                    🌿
                </button>
            </div>
            <div style={{textAlign: 'center', fontSize: '0.8rem', color: '#999', marginTop: '10px'}}>
                v1.0
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ fontSize: `${fontSize}px` }}>
        <div className="mobile-header">
            <button 
                className="menu-btn" 
                onClick={toggleSidebar}
            >
                ☰
            </button>
        </div>

        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/target" element={<TargetCalculator />} />
            <Route path="/count" element={<CountCalculator />} />
            <Route path="/daily" element={<DailyCalculator />} />
            <Route path="/viewer" element={<BibleViewer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </div>
    </div>
  );
}

export default App;
