import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import '../src/App.css'; 

constRP_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

const faceapi = window.faceapi;

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', employeeId: '' });
  const [showPassword, setShowPassword] = useState(false); 
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [passError, setPassError] = useState('');
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
        console.error("Model Error:", err);
      }
    };
    loadModels();
  }, []);

  const validatePassword = (password) => {
    if (!RP_REGEX.test(password)) {
      setPassError("Password must be 8+ chars, with 1 Uppercase, 1 Lowercase, 1 Number & 1 Special Char (@$!%*?&#).");
      return false;
    }
    setPassError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword(formData.password)) return;
    if (!webcamRef.current) return;
    
    setIsCapturing(true);

    try {
      const imgSrc = webcamRef.current.getScreenshot();
      if (!imgSrc) throw new Error("Camera not ready");

      const img = await faceapi.fetchImage(imgSrc);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

      if (!detections) throw new Error("No face detected. Please look at the camera.");

      await axios.post('http://localhost:5000/api/register', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        employeeId: Number(formData.employeeId), 
        faceDescriptor: Array.from(detections.descriptor),
        profilePicture: imgSrc
      });

      alert("Signup Successful! Please Login.");
      setFormData({ name: '', email: '', password: '', employeeId: '' }); 
      
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '20px auto', padding: '20px' }}>
      <h2 className="text-center mb-4">New User Signup</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
            <input className="form-control" placeholder="Full Name" value={formData.name} required 
                onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>

        <div className="mb-3">
            <input className="form-control" placeholder="Email" type="email" value={formData.email} required 
                onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div className="mb-3">
            <input className="form-control" placeholder="Desired Employee ID (e.g. 2005)" type="number" 
                value={formData.employeeId} required 
                onChange={e => setFormData({...formData, employeeId: e.target.value})} />
        </div>

        <div className="mb-3">
            <div className="input-group">
                <input className={`form-control ${passError ? 'is-invalid' : ''}`} 
                    placeholder="Password (e.g. Secure@123)" 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} required 
                    onChange={e => {
                        setFormData({...formData, password: e.target.value});
                        validatePassword(e.target.value);
                    }} 
                />
                <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', background: '#fff' }}>
                   {showPassword ? "👁️" : "🙈"}
                </span>
            </div>
            {passError && <div className="text-danger small mt-1">{passError}</div>}
        </div>
        
        <div className="webcam-container mb-3" style={{ minHeight: '200px', background: '#eee' }}>
          {modelsLoaded ? (
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" videoConstraints={{ facingMode: "user" }} />
          ) : <p className="text-center p-4">Loading AI Models...</p>}
        </div>

        <button className="btn btn-primary w-100" type="submit" disabled={!modelsLoaded || isCapturing}>
          {isCapturing ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
};

export default Signup;