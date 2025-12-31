const Attendance = require('../models/Attendance');
const moment = require('moment');

// CONFIG
const SHIFT_START = '10:00'; 
const WEEKENDS = [0, 6]; // 0=Sun, 6=Sat

// Geofencing (Example Office Coordinates)
const OFFICE_LAT = 40.7580; 
const OFFICE_LNG = -73.9855;
const MAX_DISTANCE_KM = 0.5; // 500 meters

// Helper: Calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

// ==========================================
// 1. MARK ATTENDANCE
// ==========================================
exports.markAttendance = async (req, res) => {
  const { userId, type, lat, lng } = req.body; 
  const today = moment();
  const dateStr = today.format('YYYY-MM-DD');

  if (WEEKENDS.includes(today.day())) {
    return res.status(400).json({ message: "Today is a Weekend Holiday." });
  }

  // Work Mode Logic (WFO vs WFH)
  let workMode = 'WFH';
  if (lat && lng) {
    const dist = getDistanceFromLatLonInKm(lat, lng, OFFICE_LAT, OFFICE_LNG);
    if (dist <= MAX_DISTANCE_KM) workMode = 'WFO';
  }

  try {
    let record = await Attendance.findOne({ userId, date: dateStr });

    // CLOCK IN
    if (type === 'clock-in') {
      if (record) return res.status(400).json({ message: "Already clocked in." });

      const shiftStart = moment(`${dateStr} ${SHIFT_START}`, 'YYYY-MM-DD HH:mm');
      let status = today.isAfter(shiftStart) ? 'Late' : 'Present';
      let lateMinutes = today.isAfter(shiftStart) ? today.diff(shiftStart, 'minutes') : 0;

      record = new Attendance({
        userId, date: dateStr, clockInTime: today.toDate(), status, lateMinutes, workMode, location: { lat, lng }
      });
      await record.save();
      return res.json({ message: `Clock In Success! Mode: ${workMode}` });
    }

    // CLOCK OUT
    if (type === 'clock-out') {
      if (!record) return res.status(400).json({ message: "Clock In First." });
      
      record.clockOutTime = today.toDate();
      const duration = moment.duration(today.diff(moment(record.clockInTime)));
      record.totalWorkHours = duration.asHours().toFixed(2);
      
      await record.save();
      return res.json({ message: `Clock Out Success! Hours: ${record.totalWorkHours}` });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 2. GET DASHBOARD
// ==========================================
exports.getDashboard = async (req, res) => {
  try {
    const logs = await Attendance.find()
      .populate('userId', 'name email employeeId profilePicture')
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 3. REGULARIZE ATTENDANCE (Admin Fix)
// ==========================================
exports.regularizeAttendance = async (req, res) => {
  const { recordId, newStatus } = req.body;
  try {
    const record = await Attendance.findById(recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.status = newStatus;
    await record.save();
    res.json({ message: "Attendance Updated!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};