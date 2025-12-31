import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import '../src/App.css';

const faceapi = window.faceapi;
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const Register = () => {
  const [employeeId, setEmployeeId] = useState('2000');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passError, setPassError] = useState('');

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) { console.error("Model Load Error:", err); }
    };
    loadModels();
  }, []);

  const handleApprovalRequest = async () => {
    if (!name || !email || !password || !employeeId) return alert("Fill all fields.");
    
    // Validate Password
    if (!PASS_REGEX.test(password)) {
        setPassError("Password must be 8+ chars, 1 Upper, 1 Lower, 1 Number, 1 Special.");
        return;
    }
    setPassError('');

    if (!webcamRef.current) return;
    setIsCapturing(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const img = await faceapi.fetchImage(imageSrc);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

      if (!detections) {
        setIsCapturing(false);
        return alert("❌ No face detected.");
      }

      // SEND APPROVAL REQUEST (status: 'pending')
      await axios.post('http://localhost:5000/api/register-request', {
        name: name.trim(),
        email: email.trim(),
        employeeId: Number(employeeId), 
        password: password,
        faceDescriptor: Array.from(detections.descriptor), 
        profilePicture: imageSrc,
        status: 'pending' // Flag for HR
      });

      alert(`✅ Approval Request Sent to HR for Employee ${employeeId}!`);
      
      setName(''); setEmail(''); setPassword('');
      setEmployeeId((prev) => Number(prev) + 1);

    } catch (err) {
      console.error(err);
      alert("Request Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '20px auto', padding: '20px' }}>
      <h2 className="text-primary">New Employee Request</h2>
      <p className="text-muted small">Submit data for HR Approval</p>
      
      <div className="form-group mb-2">
        <label>Employee ID</label>
        <input type="number" className="form-control" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
      </div>

      <div className="form-group mb-2">
        <label>Full Name</label>
        <input className="form-control" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
      </div>
      
      <div className="form-group mb-3">
        <label>Email</label>
        <input type="email" className="form-control" placeholder="john@company.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="form-group mb-2">
        <label>Password</label>
        <div className="input-group">
          <input type={showPassword ? "text" : "password"} className={`form-control ${passError ? 'is-invalid' : ''}`} 
            placeholder="Secure Password" value={password} onChange={e => setPassword(e.target.value)} />
          <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', background: '#fff' }}>
               {showPassword ? "👁️" : "🙈"}
          </span>
        </div>
        {passError && <div className="text-danger small mt-1">{passError}</div>}
      </div>

      <div className="webcam-container mb-3" style={{ background: '#f8f9fa', minHeight: '200px' }}>
        {modelsLoaded ? (
          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} width="100%" />
        ) : <p className="p-4 text-center">Loading Camera AI...</p>}
      </div>

      <button className="btn btn-warning w-100" onClick={handleApprovalRequest} disabled={!modelsLoaded || isCapturing}>
        {isCapturing ? "Processing..." : "Submit for HR Approval 🛡️"}
      </button>
    </div>
  );
};

export default Register;