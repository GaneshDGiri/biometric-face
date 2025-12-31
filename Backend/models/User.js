const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  employeeId: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  
  // Role: 'admin' (HR) or 'employee'
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },

  // Status for Approval Flow & History
  status: { 
    type: String, 
    enum: ['pending', 'active', 'resigned', 'terminated'], 
    default: 'pending' 
  },

  // Face Descriptor (128 floats)
  faceDescriptor: { type: [Number], default: [] }, 
  
  // Profile Pic (Base64)
  profilePicture: { type: String, default: '' },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);