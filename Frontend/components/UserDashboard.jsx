import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import CalendarView from './CalendarView'; 

const faceapi = window.faceapi;

// Password Regex
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const UserDashboard = ({ user, onLogout }) => {
  const [records, setRecords] = useState([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [regForm, setRegForm] = useState({ date: '', reason: '', clockIn: '', clockOut: '' });
  const [showRegModal, setShowRegModal] = useState(false);

  // Edit Creds State
  const [editCreds, setEditCreds] = useState(false);
  // --- TYPO FIXED HERE (Removed Qm) ---
  const [credentials, setCredentials] = useState({ employeeId: user.employeeId, password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // Edit Profile State
  const [editProfile, setEditProfile] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, email: user.email });

  const webcamRef = useRef(null);

  useEffect(() => {
    loadRecords();
    setCredentials(prev => ({ ...prev, employeeId: user.employeeId }));
  }, [user._id]);

  const loadRecords = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard');
      const myLogs = res.data.filter(r => r.userId?._id === user._id);
      setRecords(myLogs);
    } catch (err) { console.error(err); }
  };

  const handleAttendance = (type) => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await axios.post('http://localhost:5000/api/attendance', {
            userId: user._id, type, lat: pos.coords.latitude, lng: pos.coords.longitude, image: ''
          });
          alert(`✅ ${res.data.message}`);
          loadRecords(); 
        } catch (err) { alert(`❌ Failed: ${err.message}`); }
    });
  };

  const updateCredentials = async () => {
    if (!PASS_REGEX.test(credentials.password)) {
        setPassError("Password weak! Use 8+ chars, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special.");
        return;
    }
    if (!window.confirm('Login again after change?')) return;
    try {
      await axios.put('http://localhost:5000/api/user/update-credentials', {
        userId: user._id, newEmployeeId: Number(credentials.employeeId), newPassword: credentials.password,
      });
      alert('Credentials updated. Login again.');
      onLogout();
    } catch (err) { alert('❌ Update failed'); }
  };

  return (
    <div className="container mt-4">
      <div className="card profile-header mb-4 p-3 d-flex flex-row justify-content-between shadow-sm">
        <div><h3>{user.name}</h3><p className="text-muted">ID: {user.employeeId}</p></div>
        <div>
            <button className="btn btn-warning me-2" onClick={() => setShowRegModal(!showRegModal)}>🛠 Regularize</button>
            <button className="btn btn-danger" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="card mb-3 p-3 border-primary">
            <h4>⏱️ Quick Actions</h4>
            <button className="btn btn-success w-100 mb-2" onClick={() => handleAttendance('clock-in')}>📍 CLOCK IN</button>
            <button className="btn btn-danger w-100" onClick={() => handleAttendance('clock-out')}>📍 CLOCK OUT</button>
          </div>

          <div className="card mb-3 p-3">
             <div className="d-flex justify-content-between">
              <h4>🔐 Credentials</h4>
              <button className="btn btn-sm btn-link text-danger" onClick={() => setEditCreds(!editCreds)}>{editCreds ? "Cancel" : "Change"}</button>
            </div>
            {editCreds && (
              <div className="mt-2">
                <input type="number" className="form-control mb-2" value={credentials.employeeId} 
                    onChange={e => setCredentials({ ...credentials, employeeId: e.target.value })} placeholder="New ID" />
                <div className="input-group mb-2">
                  <input type={showPassword ? "text" : "password"} className={`form-control ${passError ? 'is-invalid' : ''}`} 
                    placeholder="New password" value={credentials.password}
                    onChange={e => {
                        setCredentials({ ...credentials, password: e.target.value });
                        if(PASS_REGEX.test(e.target.value)) setPassError('');
                    }} />
                  <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{cursor: 'pointer'}}>
                    {showPassword ? "👁️" : "🙈"}
                  </span>
                </div>
                {passError && <div className="text-danger small mb-2">{passError}</div>}
                <button className="btn btn-danger w-100" onClick={updateCredentials}>Update</button>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-8">
           <CalendarView attendanceData={records} />
        </div>
      </div>
    </div>
  );
};
export default UserDashboard;