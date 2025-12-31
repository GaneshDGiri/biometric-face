const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const EmployeeHistory = require('./models/EmployeeHistory');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
// Increase limit to 50mb to handle Base64 webcam images
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_db'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// ================= ROUTES ================= //

// 1. REGISTER / ENROLL ROUTE (Smart Logic)
// - If User ID exists (Added by HR): Update data & AUTO-ACTIVATE.
// - If User ID is new: Create 'pending' request (Needs HR Approval).
app.post('/api/register-request', async (req, res) => {
  try {
    const { name, email, employeeId, password, faceDescriptor, profilePicture } = req.body;

    // Check if user already exists by Employee ID
    let existingUser = await User.findOne({ employeeId });

    if (existingUser) {
      // === SCENARIO A: EXISTING USER (Auto-Activate) ===
      // HR added this ID, so we update credentials and activate.
      existingUser.name = name;
      existingUser.email = email;
      existingUser.password = password; 
      existingUser.faceDescriptor = faceDescriptor;
      existingUser.profilePicture = profilePicture;
      
      // AUTO-APPROVE: No HR action needed
      existingUser.status = 'active'; 
      
      await existingUser.save();
      return res.json({ message: `Existing Account (${employeeId}) Activated Successfully!`, user: existingUser });
    }

    // === SCENARIO B: BRAND NEW USER (Require Approval) ===
    // Check if email is already used by a different ID
    const emailCheck = await User.findOne({ email });
    if (emailCheck) {
      return res.status(400).json({ message: "Email already in use by another ID." });
    }

    // Create new user in 'pending' state
    const newUser = new User({
      name,
      email,
      employeeId,
      password,
      faceDescriptor,
      profilePicture,
      status: 'pending', // <--- Needs HR Approval
      role: 'employee'
    });

    await newUser.save();
    res.json({ message: "New Account Request Sent to HR for Approval", user: newUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration Request Failed" });
  }
});

// 2. LOGIN (Email OR Employee ID)
// Blocks pending/inactive users
app.post('/api/login', async (req, res) => {
  try {
    const { email, employeeId, password } = req.body;

    const query = {};
    if (email) query.email = email;
    if (employeeId) query.employeeId = employeeId;

    const user = await User.findOne(query);

    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Check Status Blocks
    if (user.status === 'pending') return res.status(403).json({ message: "Account pending HR approval." });
    if (user.status === 'terminated' || user.status === 'resigned') return res.status(403).json({ message: "Account is inactive." });

    // Verify Password
    if (user.password !== password) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// --- ADMIN / HR ROUTES ---

// 3. GET ACTIVE EMPLOYEES
app.get('/api/admin/employees', async (req, res) => {
    try {
        const employees = await User.find({ status: 'active', role: 'employee' });
        res.json(employees);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. GET PENDING REQUESTS
app.get('/api/admin/pending-requests', async (req, res) => {
    try {
        const requests = await User.find({ status: 'pending' });
        res.json(requests);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. APPROVE USER
app.post('/api/admin/approve-user/:id', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { status: 'active' });
        res.json({ message: "User Approved!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. REJECT REQUEST
app.delete('/api/admin/reject-request/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Request Rejected" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. ADD NEW EMPLOYEE MANUALLY (HR)
app.post('/api/admin/add-employee', async (req, res) => {
    try {
        const { name, email, employeeId, password } = req.body;

        // Check if exists
        const exists = await User.findOne({ $or: [{ email }, { employeeId }] });
        if (exists) return res.status(400).json({ message: "Employee ID or Email already exists." });

        const newUser = new User({
            name,
            email,
            employeeId,
            password, 
            status: 'active', // Direct Active status
            role: 'employee',
            faceDescriptor: [], 
            profilePicture: ''
        });

        await newUser.save();
        res.json({ message: "Employee Created Successfully" });
    } catch (err) {
        res.status(500).json({ message: "Creation Failed: " + err.message });
    }
});

// 8. TERMINATE EMPLOYEE (Delete & Log History)
app.post('/api/admin/delete-employee', async (req, res) => {
    const { userId, reason, date } = req.body;
    try {
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({message: "User not found"});

        // 1. Create History Log
        await EmployeeHistory.create({
            userId: user._id,
            name: user.name,
            employeeId: user.employeeId,
            email: user.email,
            type: 'Terminated',
            reason: reason,
            date: date
        });

        // 2. Delete User
        await User.findByIdAndDelete(userId);

        res.json({ message: "Employee Terminated & Logged" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9. RESIGN EMPLOYEE (Log History & Mark Inactive)
app.post('/api/admin/resign-employee', async (req, res) => {
    const { userId, reason, date } = req.body;
    try {
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({message: "User not found"});

        // 1. Create History Log
        await EmployeeHistory.create({
            userId: user._id,
            name: user.name,
            employeeId: user.employeeId,
            email: user.email,
            type: 'Resigned',
            reason: reason,
            date: date
        });

        // 2. Mark Inactive
        user.status = 'resigned';
        await user.save();

        res.json({ message: "Resignation Processed" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10. GET HISTORY LOGS
app.get('/api/admin/employee-history', async (req, res) => {
    try {
        const history = await EmployeeHistory.find().sort({ date: -1 });
        res.json(history);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- ATTENDANCE & USER ROUTES ---

// 11. FACE VERIFICATION
app.post('/api/verify-face', async (req, res) => {
  const { descriptor } = req.body;
  if (!descriptor) return res.status(400).json({ message: "No face data provided" });

  try {
    const users = await User.find({ status: 'active', faceDescriptor: { $ne: [] } });
    if (users.length === 0) return res.json({ match: false, message: "No active users" });

    let bestMatch = null;
    let minDistance = 0.6; 

    users.forEach(user => {
      const dbFace = user.faceDescriptor;
      const distance = Math.sqrt(
        descriptor.map((val, i) => val - dbFace[i]).reduce((sum, diff) => sum + diff * diff, 0)
      );
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    });

    if (bestMatch) {
      res.json({ match: true, userId: bestMatch._id, name: bestMatch.name });
    } else {
      res.json({ match: false });
    }
  } catch (err) {
    res.status(500).json({ message: "Verification Server Error" });
  }
});

// 12. MARK ATTENDANCE
app.post('/api/attendance', async (req, res) => {
  const { userId, type, lat, lng, image } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  try {
    let record = await Attendance.findOne({ userId, date: today });

    if (type === 'clock-in') {
      if (record) return res.status(400).json({ message: "Already clocked in today." });
      
      const startLimit = new Date();
      startLimit.setHours(9, 30, 0, 0); // Late after 9:30 AM
      let status = now > startLimit ? 'Late' : 'Present';
      let lateMinutes = now > startLimit ? Math.floor((now - startLimit) / 60000) : 0;
      const workMode = (lat && lng) ? 'Office' : 'Remote'; 

      record = new Attendance({ userId, date: today, clockInTime: now, clockInImage: image, status, lateMinutes, workMode, location: { lat, lng } });
      await record.save();
      res.json({ message: `Clocked In as ${status}` });

    } else if (type === 'clock-out') {
      if (!record) return res.status(400).json({ message: "You must clock in first." });
      if (record.clockOutTime) return res.status(400).json({ message: "Already clocked out." });

      record.clockOutTime = now;
      record.clockOutImage = image; 
      await record.save();
      res.json({ message: "Clocked Out Successfully" });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) { res.status(500).json({ message: "Attendance Error" }); }
});

// 13. REGULARIZATION REQUEST
app.post('/api/attendance/regularize-request', async (req, res) => {
  const { userId, date, reason, clockInTime, clockOutTime } = req.body;
  try {
    let record = await Attendance.findOne({ userId, date });
    if (!record) {
      record = new Attendance({ userId, date, status: 'Absent', regularization: { status: 'Pending', reason, newClockIn: clockInTime, newClockOut: clockOutTime } });
    } else {
      record.regularization = { status: 'Pending', reason, newClockIn: clockInTime, newClockOut: clockOutTime };
    }
    await record.save();
    res.json({ message: "Regularization Request Sent" });
  } catch (err) { res.status(500).json({ message: "Request Failed" }); }
});

// 14. ADMIN: UPDATE / APPROVE ATTENDANCE
app.put('/api/attendance/regularize', async (req, res) => {
    const { recordId, newStatus, newWorkMode } = req.body;
    try {
      const record = await Attendance.findById(recordId);
      if(!record) return res.status(404).json({ message: "Record not found" });
  
      if (newStatus) record.status = newStatus;
      if (newWorkMode) record.workMode = newWorkMode;
  
      // Auto-approve if pending
      if (record.regularization && record.regularization.status === 'Pending') {
          record.regularization.status = 'Approved';
          if(record.regularization.newClockIn) record.clockInTime = record.regularization.newClockIn;
          if(record.regularization.newClockOut) record.clockOutTime = record.regularization.newClockOut;
      }
  
      await record.save();
      res.json({ message: "Record Updated Successfully" });
    } catch (err) {
      res.status(500).json({ message: "Update Failed" });
    }
});

// 15. GET DASHBOARD DATA
app.get('/api/dashboard', async (req, res) => {
  try {
    const records = await Attendance.find().populate('userId', 'name employeeId email').sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: "Fetch Failed" }); }
});

// 16. UPDATE PROFILE
app.put('/api/user/update-profile', async (req, res) => {
  const { userId, name, email } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { name, email });
    res.json({ message: "Profile Updated" });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

// 17. UPDATE CREDENTIALS
app.put('/api/user/update-credentials', async (req, res) => {
  const { userId, newEmployeeId, newPassword } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { employeeId: newEmployeeId, password: newPassword });
    res.json({ message: "Credentials Updated" });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

// 18. UPDATE BIOMETRICS
app.put('/api/user/update-biometrics', async (req, res) => {
  const { userId, data } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { faceDescriptor: data });
    res.json({ message: "Face ID Updated" });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));