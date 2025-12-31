import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../src/App.css'; 

const AdminDashboard = ({ onLogout }) => {
  // Added 'add-employee' to the initial state options
  const [activeTab, setActiveTab] = useState('employees'); 
  const [employees, setEmployees] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  // State for the "Add Employee" Form
  const [newEmp, setNewEmp] = useState({ name: '', email: '', employeeId: '', password: '' });

  // Modal State for Delete/Resign
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(''); 
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'employees') {
        const res = await axios.get('http://localhost:5000/api/admin/employees');
        setEmployees(res.data);
      } else if (activeTab === 'approvals') {
        const res = await axios.get('http://localhost:5000/api/admin/pending-requests');
        setPendingRequests(res.data);
      } else if (activeTab === 'history') {
        const res = await axios.get('http://localhost:5000/api/admin/employee-history');
        setHistoryLogs(res.data);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  // --- FUNCTION: HANDLE ADD NEW EMPLOYEE ---
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/add-employee', newEmp);
      alert("✅ New Employee Added Successfully!");
      setNewEmp({ name: '', email: '', employeeId: '', password: '' });
      setActiveTab('employees'); // Switch back to the list view
    } catch (err) {
      alert("❌ Error: " + (err.response?.data?.message || err.message));
    }
  };

  // --- HR APPROVALS ---
  const handleApprove = async (id) => {
    if(!window.confirm("Approve this employee?")) return;
    try {
        await axios.post(`http://localhost:5000/api/admin/approve-user/${id}`);
        alert("User Approved and Registered! ✅");
        fetchData();
    } catch (err) { alert("Approval failed"); }
  };

  const handleReject = async (id) => {
    if(!window.confirm("Reject this request?")) return;
    try {
        await axios.delete(`http://localhost:5000/api/admin/reject-request/${id}`);
        alert("Request Rejected ❌");
        fetchData();
    } catch (err) { alert("Action failed"); }
  };

  // --- EMPLOYEE MANAGEMENT ---
  const openActionModal = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setReason('');
    setShowActionModal(true);
  };

  const submitAction = async () => {
    if (!reason.trim()) return alert("Please provide a reason/behavior note.");
    try {
        const endpoint = actionType === 'delete' 
            ? `http://localhost:5000/api/admin/delete-employee` 
            : `http://localhost:5000/api/admin/resign-employee`;
        
        await axios.post(endpoint, {
            userId: selectedUser._id,
            reason: reason,
            date: new Date().toISOString()
        });

        alert(`User ${actionType === 'delete' ? 'Deleted' : 'Resigned'} Successfully.`);
        setShowActionModal(false);
        fetchData();
    } catch (err) {
        console.error(err);
        alert("Operation failed");
    }
  };

  return (
    <div className="container mt-4">
      {/* HEADER WITH LOGOUT BUTTON */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">🛡️ HR & Admin Dashboard</h2>
        <button className="btn btn-danger" onClick={onLogout}>
            Logout 🚪
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <ul className="nav nav-pills mb-4 justify-content-center">
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                👥 Employee List
            </button>
        </li>
        {/* --- NEW ADD EMPLOYEE TAB BUTTON --- */}
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'add-employee' ? 'active' : ''}`} onClick={() => setActiveTab('add-employee')}>
                ➕ Add Employee
            </button>
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
                ⏳ Pending Approvals ({pendingRequests.length})
            </button>
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                📜 Resignation/Deletion History
            </button>
        </li>
      </ul>

      {/* --- CONTENT AREA --- */}
      <div className="card p-4 shadow-sm">
        
        {/* 1. EMPLOYEE LIST */}
        {activeTab === 'employees' && (
          <div className="table-responsive">
            <h4>Active Employees</h4>
            <table className="table table-hover">
                <thead className="table-dark">
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {employees.map(emp => (
                        <tr key={emp._id}>
                            <td>{emp.employeeId}</td>
                            <td>{emp.name}</td>
                            <td>{emp.email}</td>
                            <td>
                                <button className="btn btn-warning btn-sm me-2" onClick={() => openActionModal(emp, 'resign')}>Resign</button>
                                <button className="btn btn-danger btn-sm" onClick={() => openActionModal(emp, 'delete')}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/* 2. ADD EMPLOYEE FORM (The Missing Section) */}
        {activeTab === 'add-employee' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h4 className="text-center mb-4">Register New Employee Manually</h4>
            <form onSubmit={handleAddEmployee}>
                <div className="mb-3">
                    <label>Employee ID</label>
                    <input type="number" required className="form-control" 
                        value={newEmp.employeeId} onChange={e => setNewEmp({...newEmp, employeeId: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label>Full Name</label>
                    <input type="text" required className="form-control" 
                        value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label>Email Address</label>
                    <input type="email" required className="form-control" 
                        value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label>Default Password</label>
                    <input type="text" required className="form-control" placeholder="e.g. Welcome@123" 
                        value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-success w-100">Create Account</button>
            </form>
          </div>
        )}

        {/* 3. PENDING APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="table-responsive">
            <h4>New Registration Requests</h4>
            <table className="table table-bordered">
                <thead className="table-warning">
                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Face Data</th><th>Action</th></tr>
                </thead>
                <tbody>
                    {pendingRequests.length === 0 ? <tr><td colSpan="5" className="text-center">No pending approvals</td></tr> : 
                    pendingRequests.map(req => (
                        <tr key={req._id}>
                            <td>{req.employeeId}</td>
                            <td>{req.name}</td>
                            <td>{req.email}</td>
                            <td>{req.faceDescriptor ? "✅ Captured" : "❌ Missing"}</td>
                            <td>
                                <button className="btn btn-success btn-sm me-2" onClick={() => handleApprove(req._id)}>Approve</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>Reject</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/* 4. HISTORY */}
        {activeTab === 'history' && (
          <div className="table-responsive">
             <h4>Ex-Employee Records</h4>
             <table className="table table-striped">
                <thead>
                    <tr><th>Name</th><th>ID</th><th>Type</th><th>Reason / Behavior Note</th><th>Date</th></tr>
                </thead>
                <tbody>
                    {historyLogs.map((log, idx) => (
                        <tr key={idx}>
                            <td>{log.name}</td>
                            <td>{log.employeeId}</td>
                            <td>
                                <span className={`badge ${log.type === 'Resigned' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                    {log.type}
                                </span>
                            </td>
                            <td>{log.reason}</td>
                            <td>{new Date(log.date).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {/* --- ACTION MODAL (Delete/Resign) --- */}
      {showActionModal && (
        <div className="modal-overlay" style={modalStyle}>
            <div className="card p-4" style={{width: '400px'}}>
                <h4>{actionType === 'delete' ? 'Terminate' : 'Resign'} Employee</h4>
                <p><strong>{selectedUser?.name}</strong> (ID: {selectedUser?.employeeId})</p>
                
                <div className="mb-3">
                    <label>Reason / Behavior Notes:</label>
                    <textarea className="form-control" rows="3" 
                        placeholder="Enter detailed reason..."
                        value={reason} onChange={e => setReason(e.target.value)}></textarea>
                </div>
                
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-secondary" onClick={() => setShowActionModal(false)}>Cancel</button>
                    <button className={`btn ${actionType === 'delete' ? 'btn-danger' : 'btn-warning'}`} onClick={submitAction}>
                        Confirm {actionType === 'delete' ? 'Delete' : 'Resign'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// Simple inline style for modal overlay
const modalStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

export default AdminDashboard;