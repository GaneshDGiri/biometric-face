import React, { useState } from 'react';
import Attendance from '../components/Attendance';
import Register from '../components/Register';
import Login from '../components/Login';
import UserDashboard from '../components/UserDashboard';
import AdminDashboard from '../components/AdminDashboard';
import '../src/App.css';

function App() {
  const [view, setView] = useState('attendance');
  const [currentUser, setCurrentUser] = useState(null);

  // --- HANDLERS ---

  // 1. Employee Login
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setView('user-dashboard');
  };

  // 2. Admin Login
  const handleAdminLogin = () => {
    setCurrentUser({ isAdmin: true, name: 'Administrator' });
    setView('admin-dashboard');
  };

  // 3. Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

  return (
    <div className="container mt-4">
      {/* --- NAVBAR --- */}
      <nav className="navbar navbar-light bg-light mb-4 px-3 rounded shadow-sm">
        <span className="navbar-brand mb-0 h1">BIO-HR System</span>
        <div className="d-flex gap-2">
          {!currentUser ? (
            <>
              <button 
                className={`btn ${view === 'attendance' ? 'btn-primary' : 'btn-outline-primary'}`} 
                onClick={() => setView('attendance')}
              >
                Scan Attendance
              </button>
              <button 
                className={`btn ${view === 'login' ? 'btn-success' : 'btn-outline-success'}`} 
                onClick={() => setView('login')}
              >
                Login
              </button>
              <button 
                className={`btn ${view === 'register' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
                onClick={() => setView('register')}
              >
                Register
              </button>
            </>
          ) : (
            <span className="navbar-text">
              Logged in as: <strong>{currentUser.name}</strong>
            </span>
          )}
        </div>
      </nav>

      {/* --- VIEW ROUTING --- */}
      
      {/* 1. PUBLIC VIEWS */}
      {view === 'attendance' && <Attendance />}
      
      {view === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onAdminLogin={handleAdminLogin} 
        />
      )}
      
      {view === 'register' && <Register />}
      
      {/* 2. PROTECTED EMPLOYEE DASHBOARD */}
      {view === 'user-dashboard' && currentUser && !currentUser.isAdmin && (
        <UserDashboard user={currentUser} onLogout={handleLogout} />
      )}

      {/* 3. PROTECTED ADMIN DASHBOARD */}
      {view === 'admin-dashboard' && currentUser && currentUser.isAdmin && (
        <AdminDashboard onLogout={handleLogout} />
      )}

    </div>
  );
}

export default App;