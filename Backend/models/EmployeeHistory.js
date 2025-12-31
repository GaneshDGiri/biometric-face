const mongoose = require('mongoose');

const EmployeeHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  employeeId: Number,
  email: String,
  type: { type: String, enum: ['Resigned', 'Terminated'] }, 
  reason: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmployeeHistory', EmployeeHistorySchema);