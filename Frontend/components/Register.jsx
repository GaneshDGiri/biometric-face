import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import '../src/App.css';

// Use global faceapi from CDN
const faceapi = window.faceapi;

const Register = () => {
  // --- STATE ---
  const [employeeId, setEmployeeId] = useState('2000');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const webcamRef = useRef(null);

  // --- LOAD AI MODELS ---
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
      } catch (err) {
        console.error("Model Load Error:", err);
      }
    };
    loadModels();
  }, []);

  // --- HANDLE REGISTER ---
  const handleRegister = async () => {
    if (!name || !email || !password || !employeeId) {
      return alert("Please fill in all fields (ID, Name, Email, Password).");
    }
    if (!webcamRef.current) return;

    setIsCapturing(true);

    try {
      // 1. Capture Image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return alert("Camera not ready");

      const img = await faceapi.fetchImage(imageSrc);

      // 2. Detect Face
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

      if (!detections) {
        setIsCapturing(false);
        return alert("❌ No face detected. Please look straight at the camera.");
      }

      // 3. Send Data to Backend
      await axios.post('http://localhost:5000/api/register', {
        name: name.trim(),
        email: email.trim(),
        employeeId: Number(employeeId), 
        password: password,
        faceDescriptor: Array.from(detections.descriptor), 
        profilePicture: imageSrc
      });

      alert(`Success! Employee ${employeeId} Registered.`);
      
      // Clear Form
      setName('');
      setEmail('');
      setPassword('');
      setEmployeeId((prev) => Number(prev) + 1);

    } catch (err) {
      console.error(err);
      alert("Registration Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '20px auto', padding: '20px' }}>
      <h2>Register Employee</h2>
      
      <div className="form-group mb-2">
        <label>Employee ID</label>
        <input 
          type="number" className="form-control" 
          value={employeeId} onChange={e => setEmployeeId(e.target.value)} 
        />
      </div>

      {/* --- PASSWORD FIELD WITH ICON TOGGLE --- */}
      <div className="form-group mb-2">
        <label>Password</label>
        <div className="input-group">
          <input 
            type={showPassword ? "text" : "password"} 
            className="form-control" 
            placeholder="Set a password"
            value={password} onChange={e => setPassword(e.target.value)} 
          />
          <span 
              className="input-group-text" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: 'pointer', background: '#fff' }}
          >
               {showPassword ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
               )}
          </span>
        </div>
      </div>

      <div className="form-group mb-2">
        <label>Full Name</label>
        <input 
          className="form-control" placeholder="John Doe"
          value={name} onChange={e => setName(e.target.value)} 
        />
      </div>
      
      <div className="form-group mb-3">
        <label>Email</label>
        <input 
          type="email" className="form-control" placeholder="john@company.com"
          value={email} onChange={e => setEmail(e.target.value)} 
        />
      </div>

      {/* WEBCAM SECTION */}
      <div className="webcam-container mb-3" style={{ background: '#f8f9fa', minHeight: '200px' }}>
        {modelsLoaded ? (
          <Webcam 
            audio={false} ref={webcamRef} screenshotFormat="image/jpeg" 
            videoConstraints={{ facingMode: "user" }} width="100%"
          />
        ) : (
          <p className="p-4 text-center">Loading Camera AI...</p>
        )}
      </div>

      <button 
        className="btn btn-primary w-100" 
        onClick={handleRegister} 
        disabled={!modelsLoaded || isCapturing}
      >
        {isCapturing ? "Processing..." : "Capture Photo & Register"}
      </button>
    </div>
  );
};

export default Register;