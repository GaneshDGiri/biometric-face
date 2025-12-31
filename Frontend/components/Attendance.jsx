import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import '../src/App.css';

// Use global faceapi from CDN (window object)
const faceapi = window.faceapi;

const Attendance = () => {
  const webcamRef = useRef(null);
  
  // State for UI and Logic
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Ready to scan");
  const [isProcessing, setIsProcessing] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Waiting for action...");

  // 1. Load AI Models on Mount
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
        setStatusMsg("System Ready. Please enable Location.");
      } catch (err) {
        console.error("Model Load Error:", err);
        setStatusMsg("Error loading AI models.");
      }
    };
    loadModels();
  }, []);

  // 2. Main Function: Handle Location + Face + API
  const handleAttendance = async (type) => {
    if (!webcamRef.current || isProcessing) return;
    
    setIsProcessing(true);
    setStatusMsg("Acquiring Location...");
    setLocationStatus("Locating...");

    // Step A: Get Geolocation
    if (!navigator.geolocation) {
      setIsProcessing(false);
      return alert("Geolocation is not supported by your browser.");
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Success: We have coordinates
        const { latitude, longitude } = position.coords;
        setLocationStatus(`GPS Locked: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Proceed to Face Scan
        await scanFaceAndMark(type, latitude, longitude);
      },
      (error) => {
        setIsProcessing(false);
        console.error(error);
        setStatusMsg("Location Access Denied.");
        alert("You must allow location access to mark attendance.");
      }
    );
  };

  // Step B: Face Scan & Backend Call
  const scanFaceAndMark = async (type, lat, lng) => {
    try {
      setStatusMsg("Scanning Face...");
      
      // Capture the actual image for proof
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Camera error");

      const img = await faceapi.fetchImage(imageSrc);
      
      // Detect Face
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                                      .withFaceLandmarks()
                                      .withFaceDescriptor();

      if (detections) {
        // 1. Verify Face Identity
        const verifyRes = await axios.post('http://localhost:5000/api/verify-face', {
          descriptor: Array.from(detections.descriptor)
        });

        if (verifyRes.data.match) {
          // 2. Mark Attendance (Include the Image & Location)
          setStatusMsg(`Identified: ${verifyRes.data.name}. Marking ${type}...`);
          
          const attendRes = await axios.post('http://localhost:5000/api/attendance', {
            userId: verifyRes.data.userId,
            type: type, // 'clock-in' or 'clock-out'
            lat: lat,   
            lng: lng,
            image: imageSrc // <--- SENDING PHOTO PROOF HERE
          });

          // Success Feedback
          alert(`✅ ${attendRes.data.message}`);
          setStatusMsg(attendRes.data.message);
        } else {
          setStatusMsg("❌ Face not recognized. Are you registered?");
          alert("Face not recognized! Please try again or register.");
        }
      } else {
        setStatusMsg("❌ No face detected. Please look at the camera.");
        alert("No face detected.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message;
      setStatusMsg("Error: " + errMsg);
      alert(`❌ Error: ${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Biometric Attendance</h2>
      
      {/* Status Indicators */}
      <div className="mb-3 text-center">
        <p className={`status-text ${statusMsg.includes("Error") || statusMsg.includes("❌") ? "text-danger" : "text-primary"}`}>
          {statusMsg}
        </p>
        <small className="text-muted">{locationStatus}</small>
      </div>

      {/* Webcam View */}
      <div className="webcam-container">
        {modelsLoaded ? (
          <Webcam 
            audio={false} 
            ref={webcamRef} 
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            mirrored={true} 
            width="100%"
          />
        ) : (
          <div className="p-5 text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Loading AI Models...</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="nav-buttons d-flex justify-content-center gap-3 mt-3">
        <button 
          className="btn btn-primary btn-lg" 
          onClick={() => handleAttendance('clock-in')}
          disabled={!modelsLoaded || isProcessing}
        >
          {isProcessing ? "Processing..." : "CLOCK IN"}
        </button>
        
        <button 
          className="btn btn-warning btn-lg" 
          onClick={() => handleAttendance('clock-out')}
          disabled={!modelsLoaded || isProcessing}
        >
          {isProcessing ? "Processing..." : "CLOCK OUT"}
        </button>
      </div>
      
      <div className="mt-3 text-center text-muted">
        <small>⚠️ Location access is required to verify Work From Home/Office status.</small>
      </div>
    </div>
  );
};

export default Attendance;