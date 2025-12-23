import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../src/App.css';

const AdminDashboard = ({ onLogout }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/dashboard');
      setRecords(res.data);
      setLoading(false);
    } catch (err) {
      alert("Error loading data");
    }
  };

  const handleEdit = async (recordId, currentStatus, currentMode) => {
    // 1. Edit Status
    const newStatus = prompt("Enter new Status (Present, Late, Absent, On Leave, Holiday):", currentStatus);
    if (newStatus === null) return; // Cancelled

    // 2. Edit Work Mode (WFH or Office)
    const newMode = prompt("Enter Work Mode (Office, Remote):", currentMode);
    if (newMode === null) return; // Cancelled

    try {
      await axios.put('http://localhost:5000/api/attendance/regularize', {
        recordId,
        newStatus,
        newWorkMode: newMode // <--- Sending new Work Mode to backend
      });
      alert("✅ Record Updated!");
      fetchData(); // Refresh table
    } catch (err) {
      alert("❌ Failed to update");
    }
  };

  if (loading) return <div className="text-center mt-5">Loading Admin Panel...</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-danger">🛡️ Admin Control Panel</h2>
        <button className="btn btn-dark" onClick={onLogout}>Logout Admin</button>
      </div>

      <div className="card p-3">
        <h3>Employee Attendance Logs</h3>
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Photos (In / Out)</th>
                <th>Times</th>
                <th>Status</th>
                <th>Work Mode</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>
                    <strong>{r.userId?.name}</strong><br/>
                    <small className="text-muted">{r.userId?.employeeId}</small>
                  </td>
                  <td>
                    {/* --- DISPLAY PHOTOS --- */}
                    <div className="d-flex gap-2">
                      {r.clockInImage ? (
                        <img 
                          src={r.clockInImage} 
                          alt="In" 
                          style={{width: '50px', height: '50px', borderRadius: '5px', objectFit: 'cover', border: '2px solid green'}} 
                          title="Clock In Photo" 
                        />
                      ) : <span className="text-muted small">No In</span>}
                      
                      {r.clockOutImage ? (
                        <img 
                          src={r.clockOutImage} 
                          alt="Out" 
                          style={{width: '50px', height: '50px', borderRadius: '5px', objectFit: 'cover', border: '2px solid red'}} 
                          title="Clock Out Photo" 
                        />
                      ) : <span className="text-muted small">No Out</span>}
                    </div>
                  </td>
                  <td>
                    In: <span className="text-success">{r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : '-'}</span><br/>
                    Out: <span className="text-danger">{r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : '-'}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      r.status === 'Present' ? 'bg-success' : 
                      r.status === 'Late' ? 'bg-warning text-dark' : 'bg-danger'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {/* --- WORK MODE (WFH/Office) --- */}
                    <span className={`badge ${r.workMode === 'Office' ? 'bg-primary' : 'bg-info text-dark'}`}>
                      {r.workMode}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEdit(r._id, r.status, r.workMode)}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;