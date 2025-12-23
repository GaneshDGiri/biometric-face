//deploy server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path'); // <--- 1. IMPORT PATH MODULE

// Import Models
const User = require('./models/User');
const Attendance = require('./models/Attendance');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
const MONGO_URI = 'mongodb://127.0.0.1:27017/attendance_db'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


// ================= API ROUTES ================= //

// ... (KEEP ALL YOUR EXISTING API ROUTES HERE: Login, Register, Attendance, etc.) ...
// ... I am hiding them here to save space, but DO NOT DELETE THEM ...


// ================= FRONTEND SERVING ================= //

// 2. Serve the static files from the React app build folder
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Handle React Routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- START SERVER ---
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
