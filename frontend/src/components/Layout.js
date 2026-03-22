import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = ({ activeTab, setActiveTab, isMobileNavOpen, setIsMobileNavOpen, children }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const handleThemeToggle = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2500);
  };

  return (
    <div className="App professional-dashboard">
      {/* Top Navigation Bar */}
      <div className="top-navbar">
        <div className="navbar-brand">
          <span className="brand-icon">💰</span>
          <span className="brand-name">Expense Planner</span>
        </div>

        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={isMobileNavOpen}
          aria-controls="app-navigation"
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="hamburger" aria-hidden="true"></span>
        </button>
        
        <div className={`navbar-rail ${isMobileNavOpen ? 'open' : ''}`} id="app-navigation">
          <div className="navbar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="tab-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <span className="tab-icon">💳</span>
              <span>Transactions</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className="tab-icon">📈</span>
              <span>Reports</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="tab-icon">⚙️</span>
              <span>Settings</span>
            </button>
          </div>

          <div className="navbar-user">
            <button onClick={handleThemeToggle} className="theme-toggle-btn" title="Dark mode coming soon">
              🌙
            </button>
            {showComingSoon && (
              <div style={{
                position: 'fixed', bottom: '1.5rem', right: '1.5rem',
                background: '#1e293b', color: '#f8fafc',
                padding: '0.75rem 1.25rem', borderRadius: '0.625rem',
                fontSize: '0.875rem', fontWeight: 600, zIndex: 9999,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                animation: 'fadeInUp 0.25s ease'
              }}>
                🌙 Dark mode — Coming Soon!
              </div>
            )}
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.username}</span>
            <button onClick={logout} className="logout-btn">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>

      <div 
        className={`mobile-nav-overlay ${isMobileNavOpen ? 'visible' : ''}`} 
        onClick={closeMobileNav}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;
