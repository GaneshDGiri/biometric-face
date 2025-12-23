import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../src/App.css';
import CalendarView from './CalendarView'; 

// Leaflet icon fix
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const faceapi = window.faceapi;

const UserDashboard = ({ user, onLogout }) => {
  const [records, setRecords] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // State for Regularization
  const [regForm, setRegForm] = useState({ date: '', reason: '', clockIn: '', clockOut: '' });
  const [showRegModal, setShowRegModal] = useState(false);

  // State for Edit Credentials
  const [editCreds, setEditCreds] = useState(false);
  const [credentials, setCredentials] = useState({ employeeId: user.employeeId, password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // State for Edit Profile
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttendance = (type) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLoadingLocation(false);

        try {
          // Send request WITHOUT image for standard button clicks
          const res = await axios.post('http://localhost:5000/api/attendance', {
            userId: user._id,
            type: type, 
            lat: latitude,
            lng: longitude,
            image: '' // No image for button click, facial scan handles the image one
          });

          alert(`✅ ${res.data.message}`);
          loadRecords(); 
        } catch (err) {
          console.error(err);
          alert(`❌ Failed: ${err.response?.data?.message || err.message}`);
        }
      },
      (error) => {
        setLoadingLocation(false);
        alert("❌ Location access denied.");
      }
    );
  };

  const updateFaceId = async () => {
    if (!webcamRef.current) return;
    try {
      const image = webcamRef.current.getScreenshot();
      const img = await faceapi.fetchImage(image);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        alert('❌ No face detected');
        return;
      }

      await axios.put('http://localhost:5000/api/user/update-biometrics', {
        userId: user._id, type: 'face', data: Array.from(detection.descriptor),
      });

      alert('✅ Face ID updated!');
      setShowWebcam(false);
    } catch (err) {
      console.error(err);
      alert('❌ Face update failed');
    }
  };

  const updateProfile = async () => {
    try {
      await axios.put('http://localhost:5000/api/user/update-profile', {
        userId: user._id, name: profile.name, email: profile.email,
      });
      alert('Profile updated. Login again.');
      onLogout();
    } catch (err) { alert('❌ Update failed'); }
  };

  const updateCredentials = async () => {
    if (!window.confirm('Login again after change?')) return;
    try {
      await axios.put('http://localhost:5000/api/user/update-credentials', {
        userId: user._id, 
        newEmployeeId: Number(credentials.employeeId), 
        newPassword: credentials.password,
      });
      alert('Credentials updated. Login again.');
      onLogout();
    } catch (err) { alert('❌ Update failed'); }
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    try {
        const baseDate = new Date(regForm.date);
        const [inH, inM] = regForm.clockIn.split(':');
        const [outH, outM] = regForm.clockOut.split(':');
        
        const inTime = new Date(baseDate); inTime.setHours(inH, inM);
        const outTime = new Date(baseDate); outTime.setHours(outH, outM);

        await axios.post('http://localhost:5000/api/attendance/regularize-request', {
            userId: user._id,
            date: regForm.date,
            reason: regForm.reason,
            clockInTime: inTime,
            clockOutTime: outTime
        });

        alert("✅ Request Sent Successfully!");
        setShowRegModal(false);
        setRegForm({ date: '', reason: '', clockIn: '', clockOut: '' });
        loadRecords(); 
    } catch (err) {
        alert("❌ Request Failed");
    }
  };

  return (
    <div className="container mt-4">
      {/* HEADER */}
      <div className="card profile-header mb-4 p-3 d-flex flex-row justify-content-between align-items-center shadow-sm">
        <div>
          <h3>{user.name}</h3>
          <p className="mb-0 text-muted">ID: {user.employeeId}</p>
        </div>
        <div>
            <button className="btn btn-warning me-2" onClick={() => setShowRegModal(!showRegModal)}>
                🛠 Request Regularization
            </button>
            <button className="btn btn-danger" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* REGULARIZATION FORM */}
      {showRegModal && (
        <div className="card p-4 mb-4 border-warning">
            <h4>Request Attendance Regularization</h4>
            <form onSubmit={handleRegularizeSubmit}>
                <div className="row">
                    <div className="col-md-3">
                        <label>Date</label>
                        <input type="date" required className="form-control" 
                            value={regForm.date} onChange={e => setRegForm({...regForm, date: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label>Correct Clock In</label>
                        <input type="time" required className="form-control" 
                            value={regForm.clockIn} onChange={e => setRegForm({...regForm, clockIn: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label>Correct Clock Out</label>
                        <input type="time" required className="form-control" 
                            value={regForm.clockOut} onChange={e => setRegForm({...regForm, clockOut: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label>Reason</label>
                        <input type="text" required className="form-control" placeholder="e.g. Forgot ID card" 
                            value={regForm.reason} onChange={e => setRegForm({...regForm, reason: e.target.value})} />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary mt-3">Submit Request</button>
            </form>
        </div>
      )}

      <div className="row">
        {/* LEFT COLUMN */}
        <div className="col-md-4">
          <div className="card mb-3 p-3 border-primary">
            <h4>⏱️ Quick Actions</h4>
            <button className="btn btn-success w-100 mb-2" onClick={() => handleAttendance('clock-in')}>📍 CLOCK IN</button>
            <button className="btn btn-danger w-100" onClick={() => handleAttendance('clock-out')}>📍 CLOCK OUT</button>
          </div>

          <CalendarView attendanceData={records} />

          {/* EDIT PROFILE */}
          <div className="card mb-3 p-3 mt-3">
            <div className="d-flex justify-content-between">
              <h4>👤 Profile</h4>
              <button className="btn btn-sm btn-link" onClick={() => setEditProfile(!editProfile)}>
                {editProfile ? "Cancel" : "Edit"}
              </button>
            </div>
            {editProfile && (
              <div className="mt-2">
                <input className="form-control mb-2" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Name" />
                <input className="form-control mb-2" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="Email" />
                <button className="btn btn-success w-100" onClick={updateProfile}>Save</button>
              </div>
            )}
          </div>

          {/* CREDENTIALS */}
          <div className="card mb-3 p-3">
             <div className="d-flex justify-content-between">
              <h4>🔐 Credentials</h4>
              <button className="btn btn-sm btn-link text-danger" onClick={() => setEditCreds(!editCreds)}>
                {editCreds ? "Cancel" : "Change"}
              </button>
            </div>
            {editCreds && (
              <div className="mt-2">
                <input type="number" className="form-control mb-2" value={credentials.employeeId} onChange={e => setCredentials({ ...credentials, employeeId: e.target.value })} placeholder="New ID" />
                <div className="input-group mb-2">
                  <input type={showPassword ? "text" : "password"} className="form-control" placeholder="New password" onChange={e => setCredentials({ ...credentials, password: e.target.value })} />
                  <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{cursor: 'pointer'}}>
                    {showPassword ? "👁️" : "🙈"}
                  </span>
                </div>
                <button className="btn btn-danger w-100" onClick={updateCredentials}>Update</button>
              </div>
            )}
          </div>

          {/* FACE ID */}
          <div className="card mb-3 p-3">
            <h4>🛡️ Face ID</h4>
            <button className="btn btn-outline-warning w-100 mt-2" onClick={() => setShowWebcam(!showWebcam)}>
              {showWebcam ? "Close Camera" : "📸 Update Face ID"}
            </button>
            {showWebcam && (
              <div className="mt-3 text-center">
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg" width="100%" />
                <button className="btn btn-success mt-2 w-100" onClick={updateFaceId}>Capture & Save</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: History Table */}
        <div className="col-md-8">
          <div className="card p-3">
            <h4>📅 Attendance History</h4>
            <div className="table-responsive" style={{maxHeight: '600px', overflowY: 'auto'}}>
            <table className="table table-striped table-hover mt-2">
              <thead className="table-dark">
                <tr><th>Date</th><th>In</th><th>Out</th><th>Status</th><th>Req Status</th></tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan="5" className="text-center">No records found</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r._id}>
                      <td>{r.date}</td>
                      <td>{r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : '-'}</td>
                      <td>{r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : '-'}</td>
                      <td>
                        <span className={`badge ${r.status === 'Present' ? 'bg-success' : 'bg-danger'}`}>
                            {r.status}
                        </span>
                      </td>
                      <td>
                        {/* --- FIXED SAFE ACCESS HERE --- */}
                        {r.regularization && r.regularization.status && r.regularization.status !== 'None' && (
                            <span className={`badge ${r.regularization.status === 'Approved' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                Req: {r.regularization.status}
                            </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;