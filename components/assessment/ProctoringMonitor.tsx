'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/stores/assessmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Maximize, AlertCircle, Shield, Camera, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface ProctoringMonitorProps {
  assessmentId: string;
}

// Helper to load dynamic external scripts from CDN
const loadScript = (src: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

export default function ProctoringMonitor({ assessmentId }: ProctoringMonitorProps) {
  const router = useRouter();

  // Zustand State
  const proctoringStream = useAssessmentStore((state) => state.proctoringStream);
  const setProctoringStream = useAssessmentStore((state) => state.setProctoringStream);
  const violationsCount = useAssessmentStore((state) => state.violationsCount);
  const incrementViolations = useAssessmentStore((state) => state.incrementViolations);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Local UI State
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showRestoreOverlay, setShowRestoreOverlay] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const showWarningModalRef = useRef(showWarningModal);
  const showRestoreOverlayRef = useRef(showRestoreOverlay);

  useEffect(() => {
    showWarningModalRef.current = showWarningModal;
  }, [showWarningModal]);

  useEffect(() => {
    showRestoreOverlayRef.current = showRestoreOverlay;
  }, [showRestoreOverlay]);

  // Face Detection State
  const [model, setModel] = useState<any>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [activeViolation, setActiveViolation] = useState<string>('');

  const resetStore = useAssessmentStore((state) => state.reset);

  // Set the video stream to the video element
  useEffect(() => {
    const activeStream = proctoringStream || localStream;
    if (activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch((err) => {
        console.warn('Video element play failed, trying to play on user interaction:', err);
      });
    }
  }, [proctoringStream, localStream]);

  // Check if stream is present on mount, if not prompt restore
  useEffect(() => {
    if (!proctoringStream) {
      setShowRestoreOverlay(true);
    }
  }, [proctoringStream]);

  // Load TensorFlow.js and BlazeFace dynamically on mount
  useEffect(() => {
    let active = true;
    const loadFaceDetection = async () => {
      try {
        setModelLoading(true);
        if (!(window as any).tf) {
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js');
        }
        if (!(window as any).blazeface) {
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.js');
        }
        if (!active) return;

        // Force CPU backend for maximum compatibility across devices (headless browsers, virtual machines)
        try {
          await (window as any).tf.setBackend('cpu');
        } catch (backendErr) {
          console.warn('Unable to explicitly set tfjs CPU backend:', backendErr);
        }

        const loadedModel = await (window as any).blazeface.load();
        if (active) {
          setModel(loadedModel);
          setModelLoading(false);
          toast.success('Face proctoring system active.');
        }
      } catch (err) {
        console.error('Failed to load face detection model:', err);
        if (active) {
          setModelLoading(false);
          toast.error('Face detection model failed to load. Proctoring might be reduced.');
        }
      }
    };

    loadFaceDetection();
    return () => {
      active = false;
    };
  }, []);

  // Telemetry event logging to the backend
  const logTelemetryEvent = async (type: string, details: string = '') => {
    try {
      await fetch('/api/assessment/keystrokes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          events: [{ type, timestamp: Date.now() }],
          pasteCount: 0,
          tabSwitchCount: type === 'proctoring_violation' ? 1 : 0,
          anomalyFlags: [type],
        }),
      });
    } catch (err) {
      console.error('Failed to log telemetry:', err);
    }
  };



  // Terminate assessment API call
  const terminateAssessment = useCallback(async (reason: string) => {
    try {
      // Exit fullscreen mode if active
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch((err) => console.error('Failed to exit fullscreen:', err));
      }

      // Clear tracks
      const activeStream = useAssessmentStore.getState().proctoringStream || localStreamRef.current;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setProctoringStream(null);
      setLocalStream(null);
      localStreamRef.current = null;

      await fetch('/api/assessment/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, reason }),
      });

      toast.error('Assessment terminated due to repeated proctoring violations!');
      
      // Reset store and redirect back to initial resume uploading page
      resetStore();
      router.push('/');
    } catch (err) {
      console.error('Failed to terminate assessment:', err);
      // Force redirect anyway and reset store
      resetStore();
      router.push('/');
    }
  }, [setProctoringStream, assessmentId, resetStore, router]);

  // Shared Violation Handler
  const handleViolation = useCallback(async (violationType: string) => {
    if (showWarningModalRef.current || showRestoreOverlayRef.current) return;

    incrementViolations();
    const newViolationsCount = useAssessmentStore.getState().violationsCount;
    setActiveViolation(violationType);

    await logTelemetryEvent('proctoring_violation', `${violationType} (Violation count: ${newViolationsCount})`);

    if (newViolationsCount >= 3) {
      // Third violation: Terminate assessment immediately and go to landing page
      await terminateAssessment(violationType);
    } else {
      // First/Second violation: Show warning modal
      setShowWarningModal(true);
      toast.warning(`Proctoring alert: ${violationType.replace(/_/g, ' ')} detected!`);
    }
  }, [incrementViolations, terminateAssessment]);

  // Violation Description Helper
  const getViolationDescription = (type: string) => {
    switch (type) {
      case 'face_not_detected':
        return 'No face was detected in the camera feed. Please ensure your face is fully visible to the camera.';
      case 'multiple_faces_detected':
        return 'Multiple faces were detected in the camera feed. Only one person is allowed in front of the camera during the assessment.';
      case 'camera_covered_or_low_light':
      case 'camera_covered':
        return 'Your camera appears to be covered or in extremely low lighting conditions. Please uncover the camera or move to a brighter environment.';
      case 'camera_turned_off':
      case 'camera_turned_off_or_frozen':
        return 'Your camera video feed appears to be turned off, muted, or frozen. The camera must remain active and streaming throughout the assessment.';
      case 'loud_noise_detected':
      case 'simulated_loud_noise':
        return 'Loud or persistent background noise was detected. Please maintain a quiet testing environment.';
      case 'tab_switch_hidden':
        return 'You switched away from the assessment tab. Leaving the active assessment screen is strictly prohibited.';
      case 'window_blur':
        return 'The assessment window lost focus. Please remain active on the assessment window.';
      case 'fullscreen_exit':
        return 'You exited fullscreen mode. The assessment must be taken in fullscreen mode.';
      case 'eye_contact_lost':
        return 'Please maintain eye contact with the screen. Looking away or focusing elsewhere is not allowed.';
      default:
        return 'A security compliance violation was detected. Please adhere to the assessment guidelines.';
    }
  };

  // Visibility and Fullscreen listener
  useEffect(() => {
    // Only set up listeners if we have a valid proctoring session running
    if (showRestoreOverlay) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('tab_switch_hidden');
      }
    };

    const handleBlur = () => {
      // Minor delay to check if blur was due to clicking a standard system modal
      setTimeout(() => {
        if (!document.hasFocus() && !showWarningModalRef.current && !showRestoreOverlayRef.current) {
          handleViolation('window_blur');
        }
      }, 300);
    };

    const handleFsChange = () => {
      if (!document.fullscreenElement && !showWarningModalRef.current && !showRestoreOverlayRef.current) {
        handleViolation('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [showRestoreOverlay, handleViolation]);

  // Audio Noise Level Monitoring
  useEffect(() => {
    const activeStream = proctoringStream || localStream;
    if (!activeStream || showRestoreOverlay || isBypassed) return;

    const audioTracks = activeStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let consecutiveLoudSeconds = 0;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(activeStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      intervalId = setInterval(() => {
        if (!analyser || showWarningModalRef.current || showRestoreOverlayRef.current) return;

        // Auto-resume AudioContext if suspended
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => { });
        }

        analyser.getByteTimeDomainData(dataArray);

        // Calculate amplitude range (min to max)
        let min = 128;
        let max = 128;
        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i];
          if (value < min) min = value;
          if (value > max) max = value;
        }

        // Normalize peak-to-peak amplitude (ranges from 0 to 1)
        const peakToPeak = (max - min) / 255;
        // Threshold: 0.70 (70% amplitude)
        if (peakToPeak > 0.70) {
          consecutiveLoudSeconds += 0.5; // check runs every 500ms
          if (consecutiveLoudSeconds >= 3.0) {
            handleViolation('loud_noise_detected');
            consecutiveLoudSeconds = 0; // reset
          }
        } else {
          consecutiveLoudSeconds = Math.max(0, consecutiveLoudSeconds - 0.5);
        }
      }, 500);

    } catch (e) {
      console.error('Failed to initialize AudioContext analyzer:', e);
    }

    const resumeAudio = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
      }
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('keydown', resumeAudio);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (source) source.disconnect();
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => { });
      }
    };
  }, [proctoringStream, localStream, showRestoreOverlay, isBypassed, handleViolation]);

  // Camera cover & Face Presence Monitoring via Canvas & BlazeFace
  useEffect(() => {
    const activeStream = proctoringStream || localStream;
    if (!activeStream || showRestoreOverlay || isBypassed) return;

    const videoTracks = activeStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    let intervalId: NodeJS.Timeout | null = null;
    let consecutiveDarkSeconds = 0;
    let consecutiveAbsentSeconds = 0;
    let consecutiveMultipleSeconds = 0;
    let consecutiveNoEyeContactSeconds = 0;

    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');

    intervalId = setInterval(async () => {
      if (showWarningModalRef.current || showRestoreOverlayRef.current) return;
      
      const videoEl = videoRef.current;
      if (!videoEl || !ctx || !videoEl.videoWidth || videoEl.paused) return;

      try {
        ctx.drawImage(videoEl, 0, 0, 80, 60);
        const imgData = ctx.getImageData(0, 0, 80, 60);
        const data = imgData.data;

        // Calculate average brightness
        let totalLuminance = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard relative luminance formula
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += luminance;
        }
        const avgBrightness = totalLuminance / (80 * 60);

        // Threshold: avgBrightness <= 12 is considered blocked camera or pitch black
        if (avgBrightness <= 12) {
          consecutiveDarkSeconds += 1;
          if (consecutiveDarkSeconds >= 3) {
            handleViolation('camera_covered_or_low_light');
            consecutiveDarkSeconds = 0;
          }
        } else {
          consecutiveDarkSeconds = 0;
        }

        // Face Presence & Multi-face Detection
        if (model) {
          const predictions = await model.estimateFaces(videoEl, false);
          if (predictions.length === 0) {
            consecutiveAbsentSeconds += 1;
            consecutiveMultipleSeconds = 0;
            consecutiveNoEyeContactSeconds = 0;
            if (consecutiveAbsentSeconds >= 3) {
              handleViolation('face_not_detected');
              consecutiveAbsentSeconds = 0;
            }
          } else if (predictions.length > 1) {
            consecutiveMultipleSeconds += 1;
            consecutiveAbsentSeconds = 0;
            consecutiveNoEyeContactSeconds = 0;
            if (consecutiveMultipleSeconds >= 3) {
              handleViolation('multiple_faces_detected');
              consecutiveMultipleSeconds = 0;
            }
          } else {
            consecutiveAbsentSeconds = 0;
            consecutiveMultipleSeconds = 0;
            
            // Single face detected: Check eye contact / looking away direction
            const prediction = predictions[0];
            const landmarks = prediction.landmarks;
            if (landmarks && landmarks.length >= 4) {
              const rightEye = landmarks[0];
              const leftEye = landmarks[1];
              const nose = landmarks[2];
              
              const eyeDist = Math.abs(rightEye[0] - leftEye[0]);
              if (eyeDist > 0) {
                const noseX = nose[0];
                const midX = (leftEye[0] + rightEye[0]) / 2;
                const noseOffset = Math.abs(noseX - midX) / eyeDist;
                
                // Nose offset threshold: > 0.28 is considered looking away / eye contact lost
                if (noseOffset > 0.28) {
                  consecutiveNoEyeContactSeconds += 1;
                  if (consecutiveNoEyeContactSeconds >= 5) {
                    handleViolation('eye_contact_lost');
                    consecutiveNoEyeContactSeconds = 0;
                  }
                } else {
                  consecutiveNoEyeContactSeconds = 0;
                }
              }
            } else {
              consecutiveNoEyeContactSeconds = 0;
            }
          }
        }
      } catch (e) {
        // Suppress canvas/loading security errors
      }
    }, 1000);

    // Play listener helper to ensure video continues streaming if paused/suspended by browser
    const playVideo = () => {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    };
    window.addEventListener('click', playVideo);
    window.addEventListener('keydown', playVideo);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('click', playVideo);
      window.removeEventListener('keydown', playVideo);
    };
  }, [proctoringStream, localStream, showRestoreOverlay, isBypassed, model, handleViolation]);

  // Handle restoring permissions on refresh
  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      // 1. Enter Fullscreen
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      // 2. Request Camera & Mic
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true,
      });

      setProctoringStream(userStream);
      setLocalStream(userStream);
      localStreamRef.current = userStream;
      setShowRestoreOverlay(false);
      setIsBypassed(false);
      toast.success('Proctoring session restored successfully.');
    } catch (err) {
      console.error('Failed to restore proctoring:', err);
      toast.error('Restoring access failed. Camera, mic, and fullscreen must be enabled.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleBypassRestore = () => {
    // Simulated bypass for developers
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'teal';
      ctx.fillRect(0, 0, 100, 100);
    }
    const dummyStream = canvas.captureStream(5);
    setProctoringStream(dummyStream);
    setLocalStream(dummyStream);
    localStreamRef.current = dummyStream;
    setShowRestoreOverlay(false);
    setIsBypassed(true);
    toast.info('Simulated proctoring session restored.');
  };

  const handleResolveWarning = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setShowWarningModal(false);
    } catch (err) {
      console.error('Failed to re-enter fullscreen:', err);
      toast.error('Please enter fullscreen manually or allow permissions.');
    }
  };

  return (
    <>
      {/* 1. Floating PiP Webcam Stream Widget */}
      {!showRestoreOverlay && (
        <div className="fixed bottom-6 right-6 z-40 w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-teal-500/40 bg-slate-950 overflow-hidden shadow-2xl hover:scale-105 transition-all duration-300 group flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            {/* The video element is hidden but active for streaming and canvas analysis */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-1 h-1 absolute opacity-0 pointer-events-none"
            />

            {/* Sleek, premium visual secure indicator */}
            <div className="flex flex-col items-center justify-center text-teal-400 space-y-1 z-0">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-teal-500/10 animate-ping h-8 w-8" />
                <Shield className="h-7 w-7 text-teal-400 relative z-10 animate-pulse" />
              </div>
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-teal-400/80">SECURE SESSION</span>
              {modelLoading ? (
                <span className="text-[7px] text-slate-500 animate-pulse font-sans">Loading Face AI...</span>
              ) : (
                <span className="text-[7px] text-teal-500/70 font-sans flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Face AI Active
                </span>
              )}
            </div>

            {/* Hover Actions Panel for Developer Simulation */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-2 space-y-1 z-10 text-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Simulate Alert</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViolation('simulated_loud_noise');
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] py-1 rounded font-medium transition-colors cursor-pointer"
              >
                Loud Noise
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViolation('face_not_detected');
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] py-1 rounded font-medium transition-colors cursor-pointer"
              >
                Face Absent
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViolation('multiple_faces_detected');
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] py-1 rounded font-medium transition-colors cursor-pointer"
              >
                Multi Face
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViolation('camera_covered');
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] py-1 rounded font-medium transition-colors cursor-pointer"
              >
                Cam Blocked
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleViolation('eye_contact_lost');
                }}
                className="w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] py-1 rounded font-medium transition-colors cursor-pointer"
              >
                Eye Contact Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Warning Dialog Overlay (1st & 2nd Violations) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <Card className="w-full max-w-md bg-slate-900 border-red-500/30 text-slate-100 overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent pointer-events-none" />
            <CardContent className="p-8 text-center space-y-5">
              <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 w-fit mx-auto animate-bounce">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-200">Security Notice</h3>
                <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                  Violation Count: {violationsCount} / 3
                </p>
              </div>

              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg text-sm text-red-300 leading-normal font-sans">
                {getViolationDescription(activeViolation)}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You have exited the secure assessment environment! Leaving the window, switching tabs, exiting fullscreen, low/covered camera, or loud noises are strictly prohibited.
              </p>

              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg text-xs text-red-300 leading-normal font-sans">
                {violationsCount === 1 ? (
                  <span><strong>Warning:</strong> You have 2 more violations remaining before immediate restart.</span>
                ) : (
                  <span><strong>Critical Warning:</strong> The next violation will result in the immediate restart of your assessment session.</span>
                )}
              </div>
              <Button
                onClick={handleResolveWarning}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold py-5 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Maximize className="h-4 w-4" />
                <span>Re-enter Fullscreen & Resume</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Restore Proctoring Overlay (Refresh Protection) */}
      {showRestoreOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
            <CardContent className="p-8 text-center space-y-5">
              <div className="p-4 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 w-fit mx-auto">
                <Shield className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-200">Resume Proctoring Session</h3>
                <p className="text-xs text-slate-400">Please re-verify your workspace to continue the assessment.</p>
              </div>
              <p className="text-xs text-slate-400 leading-normal font-sans">
                This page was refreshed. To prevent cheating, you must enable camera/microphone permissions and enter fullscreen mode before resuming your test.
              </p>
              <div className="flex flex-col space-y-2 pt-2">
                <Button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold py-5 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/10"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Restoring Session...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Restore Proctoring & Resume</span>
                    </>
                  )}
                </Button>
                <button
                  onClick={handleBypassRestore}
                  className="text-[9px] text-slate-600 hover:text-teal-500 underline text-center"
                >
                  Simulator bypass mode (Developer test)
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </>
  );
}
