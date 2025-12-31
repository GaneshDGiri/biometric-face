import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { startRegistration } from '@simplewebauthn/browser'; 
import '../src/App.css';

// Use global faceapi from CDN
const faceapi = window.faceapi;

const Register = () => {
  const [employeeId, setEmployeeId] = useState('2000');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fingerprintData, setFingerprintData] = useState(null);

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
      } catch (err) {
        console.error("Model Load Error:", err);
      }
    };
    loadModels();
  }, []);

  const handleFingerprintSetup = async () => {
    if (!email) return alert("Please enter email first to link fingerprint.");
    
    try {
      // 1. Get Options from Backend
      const optsRes = await axios.post('http://localhost:5000/api/auth/fingerprint-options', { email });
      
      console.log("Fingerprint Options:", optsRes.data);

      // 2. Start Registration (Browser Native)
      // FIX: Use 'optionsJSON' to let the library handle base64 decoding automatically
      const attResp = await startRegistration({ optionsJSON: optsRes.data });
      
      // 3. Store result
      setFingerprintData(attResp);
      alert("Fingerprint Scanned Successfully! Now click 'Register' to finish.");
      
    } catch (err) {
      console.error(err);
      alert("Fingerprint Error: " + (err.message || JSON.stringify(err)));
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !employeeId) {
      return alert("Please fill in all fields.");
    }
    if (!webcamRef.current) return;

    setIsCapturing(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return alert("Camera not ready");

      const img = await faceapi.fetchImage(imageSrc);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

      if (!detections) {
        setIsCapturing(false);
        return alert("No face detected.");
      }

      await axios.post('http://localhost:5000/api/register', {
        name,
        email,
        employeeId: Number(employeeId),
        password,
        faceDescriptor: Array.from(detections.descriptor),
        profilePicture: imageSrc,
        fingerprintResponse: fingerprintData // Sending the fingerprint data
      });

      alert(`Success! Employee ${employeeId} Registered.`);
      
      // Reset Form
      setName(''); setEmail(''); setPassword('');
      setEmployeeId(prev => Number(prev) + 1);
      setFingerprintData(null);

    } catch (err) {
      console.error(err);
      alert("Registration Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h2>Register Employee</h2>
      
      <div className="form-group">
        <label>Employee ID</label>
        <input type="number" className="form-control" value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Full Name</label>
        <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
      </div>
      
      <div className="form-group">
        <label>Email</label>
        <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className="d-flex gap-2 my-3">
        <button 
          className={`btn ${fingerprintData ? 'btn-success' : 'btn-outline-secondary'} w-100`}
          onClick={handleFingerprintSetup}
          disabled={!email}
        >
          {fingerprintData ? "Fingerprint Ready ✓" : "👆 Add Fingerprint (Optional)"}
        </button>
      </div>

      <div className="webcam-container">
        {modelsLoaded ? (
          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} width="100%" />
        ) : <p className="p-4 text-center">Loading Camera AI...</p>}
      </div>

      <button className="btn btn-primary w-100 mt-3" onClick={handleRegister} disabled={!modelsLoaded || isCapturing}>
        {isCapturing ? "Processing..." : "Capture Photo & Register"}
      </button>
    </div>
  );
};

export default Register;