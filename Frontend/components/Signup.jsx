import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import '../src/App.css'; 

const faceapi = window.faceapi;

const Signup = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', employeeId: '' });
  const [showPassword, setShowPassword] = useState(false); 
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
        console.error("Model Error:", err);
      }
    };
    loadModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!webcamRef.current) return;
    setIsCapturing(true);

    try {
      // Capture & Detect Face
      const imgSrc = webcamRef.current.getScreenshot();
      if (!imgSrc) throw new Error("Camera not ready");

      const img = await faceapi.fetchImage(imgSrc);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

      if (!detections) throw new Error("No face detected. Please look at the camera.");

      // Register
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
            <input 
                className="form-control" 
                placeholder="Full Name" 
                value={formData.name}
                required 
                onChange={e => setFormData({...formData, name: e.target.value})} 
            />
        </div>

        <div className="mb-3">
            <input 
                className="form-control" 
                placeholder="Email" 
                type="email" 
                value={formData.email}
                required 
                onChange={e => setFormData({...formData, email: e.target.value})} 
            />
        </div>

        <div className="mb-3">
            <input 
                className="form-control" 
                placeholder="Desired Employee ID (e.g. 2005)" 
                type="number" 
                value={formData.employeeId}
                required 
                onChange={e => setFormData({...formData, employeeId: e.target.value})} 
            />
        </div>

        {/* PASSWORD FIELD WITH ICON TOGGLE */}
        <div className="mb-3 input-group">
            <input 
                className="form-control" 
                placeholder="Password" 
                type={showPassword ? "text" : "password"} 
                value={formData.password}
                required 
                onChange={e => setFormData({...formData, password: e.target.value})} 
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
        
        <div className="webcam-container mb-3" style={{ minHeight: '200px', background: '#eee' }}>
          {modelsLoaded ? (
              <Webcam 
                audio={false} 
                ref={webcamRef} 
                screenshotFormat="image/jpeg" 
                width="100%" 
                videoConstraints={{ facingMode: "user" }}
              />
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