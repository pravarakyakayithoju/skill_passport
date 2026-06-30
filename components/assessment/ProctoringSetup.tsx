'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Camera, Mic, Maximize, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ProctoringSetupProps {
  onStart: (stream: MediaStream) => void;
  onClose: () => void;
}

export default function ProctoringSetup({ onStart, onClose }: ProctoringSetupProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  // Monitor fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      setFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Set video source when stream is available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Audio level analysis
  useEffect(() => {
    if (!stream || isSimulated) return;

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Map average volume (0-255) to percentage (0-100)
        setAudioLevel(Math.min(100, (average / 128) * 100));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error('Audio level analysis failed:', err);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, isSimulated]);

  // Clean up stream on unmount if not passed upward
  useEffect(() => {
    return () => {
      // If we exit setup without starting, stop stream
      if (stream && !startedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const requestHardwareAccess = async () => {
    setPermissionStatus('requesting');
    try {
      // Request both audio and video
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true
      });
      setStream(userStream);
      setPermissionStatus('granted');
      toast.success('Camera and microphone permissions granted.');

      // Automatically request Fullscreen mode directly here
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setFullscreenActive(true);
          toast.success('Fullscreen mode activated automatically.');
        }
      } catch (fsErr) {
        console.error('Auto-fullscreen failed:', fsErr);
        toast.warning('Fullscreen block: Please click Enter Fullscreen if it did not launch.');
      }
    } catch (err) {
      console.error('Proctoring access error:', err);
      setPermissionStatus('denied');
      toast.error('Hardware access request failed. Please check browser settings.');
    }
  };

  const handleRequestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreenActive(true);
        toast.success('Fullscreen mode activated.');
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
      toast.error('Failed to activate fullscreen mode.');
    }
  };

  const handleSimulateBypass = () => {
    setIsSimulated(true);
    setPermissionStatus('granted');
    setFullscreenActive(true);
    toast.info('Bypass mode active. Simulated device streams loaded.');
  };

  const handleBegin = async () => {
    if (!stream && !isSimulated) {
      toast.warning('Please authorize camera and microphone permissions to proceed.');
      return;
    }

    // Automatically enter fullscreen on direct user click (gesture context is valid)
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setFullscreenActive(true);
      } catch (err) {
        console.error('Fullscreen request failed during begin click:', err);
        toast.error('Browser blocked auto-fullscreen. Please use the fullscreen button.');
        return;
      }
    }

    // Create a mock stream if bypassed, or pass the active stream
    let activeStream = stream;
    if (isSimulated || !activeStream) {
      // Create a dummy canvas stream to act as media stream
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 100);
      }
      activeStream = canvas.captureStream(5);
    }

    startedRef.current = true;
    onStart(activeStream);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 text-slate-100 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
        
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center">
                Security & Proctoring Setup
                <Sparkles className="h-4 w-4 ml-1.5 text-teal-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Please complete the checklists to configure the secure assessment workspace.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Requirements Checklists */}
            <div className="space-y-5">
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                To guarantee candidate integrity, this assessment utilizes automated proctoring. You must grant camera, microphone, and fullscreen permissions.
              </p>



              {/* Requirement 2: Camera & Mic */}
              <div className={`p-4 rounded-xl border flex flex-col space-y-3 transition-all duration-300 ${
                permissionStatus === 'granted'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <Camera className={`h-5 w-5 ${permissionStatus === 'granted' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <Mic className={`h-5 w-5 ${permissionStatus === 'granted' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>
                    <span className="font-semibold text-sm">2. Video & Audio Access</span>
                  </div>
                  {permissionStatus === 'granted' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </div>

                {permissionStatus !== 'granted' && (
                  <Button
                    onClick={requestHardwareAccess}
                    disabled={permissionStatus === 'requesting'}
                    size="sm"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700/50"
                  >
                    {permissionStatus === 'requesting' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        Authorizing...
                      </>
                    ) : (
                      'Authorize Devices'
                    )}
                  </Button>
                )}
                {permissionStatus === 'granted' && (
                  <p className="text-[10px] text-emerald-400 font-medium">Camera & Mic inputs successfully routed.</p>
                )}
              </div>
            </div>

            {/* Right Column: Live Feed Preview */}
            <div className="flex flex-col space-y-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Media Input Status</span>
              
              <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
                {permissionStatus === 'granted' && !isSimulated ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : isSimulated ? (
                  <div className="text-center p-4 text-teal-400 space-y-1 animate-pulse">
                    <CheckCircle2 className="h-8 w-8 mx-auto" />
                    <p className="text-xs font-semibold">Simulated Stream Active</p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-500 space-y-2">
                    <Camera className="h-8 w-8 mx-auto stroke-1" />
                    <p className="text-[10px] text-slate-400 max-w-[150px] mx-auto leading-normal">
                      Preview webcam view here once permissions are granted.
                    </p>
                  </div>
                )}

                {/* Overlaid webcam indicator */}
                {permissionStatus === 'granted' && (
                  <div className="absolute top-2 left-2 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>FEED LIVE</span>
                  </div>
                )}
              </div>

              {/* Mic Amplitude display */}
              {permissionStatus === 'granted' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Microphone Input Activity:</span>
                    <span>{isSimulated ? 'Simulated' : `${Math.round(audioLevel)}%`}</span>
                  </div>
                  <Progress 
                    value={isSimulated ? 45 : audioLevel} 
                    className="h-1.5 bg-slate-950 border border-slate-850" 
                    indicatorClassName="bg-teal-500 transition-all duration-75"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-4 border-t border-slate-800">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-800 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBegin}
                disabled={permissionStatus !== 'granted'}
                className="flex-[2] bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold"
              >
                Start Assessment
              </Button>
            </div>

            {/* Simulated Bypass Option */}
            {(permissionStatus === 'denied' || permissionStatus === 'prompt') && (
              <button
                onClick={handleSimulateBypass}
                className="text-[10px] text-slate-500 hover:text-teal-400 transition-colors mx-auto underline font-medium"
              >
                Bypass hardware checks / Run in simulator mode (Developer Testing)
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
