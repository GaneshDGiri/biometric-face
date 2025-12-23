
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  
  clockInTime: { type: Date },
  clockOutTime: { type: Date },
  
  // --- IMAGES FOR PROOF ---
  clockInImage: { type: String }, // Base64 Snapshot
  clockOutImage: { type: String }, // Base64 Snapshot
  
  status: { 
    type: String, 
    enum: ['Present', 'Late', 'Absent', 'Half-day', 'On Leave', 'Holiday'], 
    default: 'Absent' 
  },
  
  workMode: { type: String, default: 'Office' }, // 'Office' or 'Remote'
  
  location: {
    lat: Number,
    lng: Number
  },
  
  lateMinutes: { type: Number, default: 0 },

  // --- REGULARIZATION REQUEST ---
  regularization: {
    status: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' },
    reason: { type: String, default: '' },
    newClockIn: { type: Date },
    newClockOut: { type: Date }
  }
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
