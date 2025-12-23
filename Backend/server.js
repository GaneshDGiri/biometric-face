const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
// Increase limit to 50mb to handle Base64 webcam images
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
// Update this string if using cloud MongoDB (Atlas)
const MONGO_URI = 'mongodb://127.0.0.1:27017/attendance_db'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// ================= ROUTES ================= //

// 1. REGISTER USER
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, employeeId, password, faceDescriptor, profilePicture } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existingUser) {
      return res.status(400).json({ message: "User with this Email or ID already exists." });
    }

    const newUser = new User({
      name,
      email,
      employeeId,
      password,
      faceDescriptor,
      profilePicture
    });

    await newUser.save();
    res.json({ message: "Registration Successful", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration Failed" });
  }
});

// 2. LOGIN (Email OR Employee ID)
app.post('/api/login', async (req, res) => {
  try {
    const { email, employeeId, password } = req.body;

    const query = {};
    if (email) query.email = email;
    if (employeeId) query.employeeId = employeeId;

    const user = await User.findOne(query);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password !== password) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. FACE VERIFICATION LOGIC
app.post('/api/verify-face', async (req, res) => {
  const { descriptor } = req.body;
  if (!descriptor) return res.status(400).json({ message: "No face data provided" });

  try {
    const users = await User.find({ faceDescriptor: { $ne: [] } });
    if (users.length === 0) return res.json({ match: false, message: "No users in database" });

    let bestMatch = null;
    let minDistance = 0.6; // Threshold (Lower is stricter)

    users.forEach(user => {
      const dbFace = user.faceDescriptor;
      // Calculate Euclidean Distance
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
    console.error(err);
    res.status(500).json({ message: "Verification Server Error" });
  }
});

// 4. MARK ATTENDANCE (Clock In/Out + Images)
app.post('/api/attendance', async (req, res) => {
  const { userId, type, lat, lng, image } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  try {
    let record = await Attendance.findOne({ userId, date: today });

    if (type === 'clock-in') {
      if (record) return res.status(400).json({ message: "Already clocked in today." });

      // Calculate Late Status (Example: After 9:30 AM)
      const startLimit = new Date();
      startLimit.setHours(9, 30, 0, 0);
      
      let status = 'Present';
      let lateMinutes = 0;
      if (now > startLimit) {
        status = 'Late';
        lateMinutes = Math.floor((now - startLimit) / 60000);
      }

      // Determine Work Mode (Simple Check)
      // If lat/lng exists, default to Office, else Remote. 
      // (This can be edited by Admin later)
      const workMode = (lat && lng) ? 'Office' : 'Remote'; 

      record = new Attendance({
        userId,
        date: today,
        clockInTime: now,
        clockInImage: image, // Save In Image
        status,
        lateMinutes,
        workMode,
        location: { lat, lng }
      });

      await record.save();
      res.json({ message: `Clocked In as ${status}` });

    } else if (type === 'clock-out') {
      if (!record) return res.status(400).json({ message: "You must clock in first." });
      if (record.clockOutTime) return res.status(400).json({ message: "Already clocked out." });

      record.clockOutTime = now;
      record.clockOutImage = image; // Save Out Image
      await record.save();
      res.json({ message: "Clocked Out Successfully" });
    } else {
      res.status(400).json({ message: "Invalid action type" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Attendance Error" });
  }
});

// 5. REGULARIZATION REQUEST (Employee)
app.post('/api/attendance/regularize-request', async (req, res) => {
  const { userId, date, reason, clockInTime, clockOutTime } = req.body;

  try {
    let record = await Attendance.findOne({ userId, date });

    if (!record) {
      // Create new absent record if user forgot to punch completely
      record = new Attendance({
        userId,
        date,
        status: 'Absent',
        regularization: { 
          status: 'Pending', 
          reason, 
          newClockIn: clockInTime, 
          newClockOut: clockOutTime 
        }
      });
    } else {
      // Update existing record
      record.regularization = {
        status: 'Pending',
        reason: reason,
        newClockIn: clockInTime,
        newClockOut: clockOutTime
      };
    }

    await record.save();
    res.json({ message: "Regularization Request Sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Request Failed" });
  }
});

// 6. GET DASHBOARD DATA (Admin & User)
app.get('/api/dashboard', async (req, res) => {
  try {
    const records = await Attendance.find().populate('userId', 'name employeeId email').sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Fetch Failed" });
  }
});

// 7. ADMIN UPDATE / REGULARIZE (Approve, Edit Mode/Status)
app.put('/api/attendance/regularize', async (req, res) => {
  const { recordId, newStatus, newWorkMode } = req.body;
  
  try {
    const record = await Attendance.findById(recordId);
    if(!record) return res.status(404).json({ message: "Record not found" });

    // Update Status and Work Mode if provided
    if (newStatus) record.status = newStatus;
    if (newWorkMode) record.workMode = newWorkMode;

    // Auto-approve pending regularization requests if Admin edits the record
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

// 8. USER: UPDATE PROFILE
app.put('/api/user/update-profile', async (req, res) => {
  const { userId, name, email } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { name, email });
    res.json({ message: "Profile Updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile" });
  }
});

// 9. USER: UPDATE CREDENTIALS
app.put('/api/user/update-credentials', async (req, res) => {
  const { userId, newEmployeeId, newPassword } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { 
      employeeId: newEmployeeId, 
      password: newPassword 
    });
    res.json({ message: "Credentials Updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating credentials" });
  }
});

// 10. USER: UPDATE BIOMETRICS (Face)
app.put('/api/user/update-biometrics', async (req, res) => {
  const { userId, data } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { faceDescriptor: data });
    res.json({ message: "Face ID Updated" });
  } catch (err) {
    res.status(500).json({ message: "Error updating face" });
  }
});

// 11. FINGERPRINT STUB (To prevent frontend errors)
app.post('/api/auth/fingerprint-options', (req, res) => {
  res.json({ 
    challenge: "base64randomstring", 
    rp: { name: "Company" }, 
    user: { id: "user_id", name: req.body.email, displayName: req.body.email },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }]
  });
});

// --- START SERVER ---
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));