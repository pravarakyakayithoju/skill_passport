'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Video, VideoOff, Square, Radio, Loader2, RefreshCw, UploadCloud, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface VideoRecorderProps {
  assessmentId: string;
  onUploadComplete: () => void;
}

export default function VideoRecorder({ assessmentId, onUploadComplete }: VideoRecorderProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'uploading' | 'completed' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request permissions on component mount
  useEffect(() => {
    requestCameraAccess();
    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const requestCameraAccess = async () => {
    try {
      stopCameraStream();
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
      
      setStream(userStream);
      setPermissionStatus('granted');
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = userStream;
      }
    } catch (err) {
      console.error('Camera/Mic permission error:', err);
      setPermissionStatus('denied');
      toast.error('Could not access camera or microphone. Check permission settings.');
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) {
      toast.error('No camera preview available to record.');
      return;
    }

    setRecordedChunks([]);
    setRecordingSeconds(0);
    setStatus('recording');
    setIsRecording(true);

    try {
      // Determine supported mimeTypes for recording
      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
      };

      recorder.start(1000); // chunk every 1 second

      // Start recording timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 89) { // 90s hard limit
            stopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      toast.error('Failed to start video recording.');
      setIsRecording(false);
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setStatus('processing');
  };

  // Upload trigger when recorded chunks are set
  useEffect(() => {
    if (status === 'processing' && recordedChunks.length > 0) {
      uploadVideoBlob();
    }
  }, [recordedChunks, status]);

  const uploadVideoBlob = async () => {
    setStatus('uploading');
    setUploadProgress(10);

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const file = new File([blob], 'explanation.webm', { type: 'video/webm' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assessmentId', assessmentId);

    setUploadProgress(30);

    try {
      const res = await fetch('/api/assessment/submit-video', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Video upload failed');

      setUploadProgress(100);
      setStatus('completed');
      toast.success('Explanation video processed successfully!');
      
      // Stop webcam stream tracks
      stopCameraStream();
      
      onUploadComplete();
    } catch (err) {
      console.error(err);
      setStatus('failed');
      toast.error('Failed to upload video to servers.');
    }
  };

  const handleSimulateMockVideo = async () => {
    setStatus('uploading');
    setUploadProgress(50);
    
    // Artificial wait
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      // Call mock-friendly submit-video with empty data or indicator
      const formData = new FormData();
      formData.append('assessmentId', assessmentId);
      formData.append('is_mock', 'true');

      const res = await fetch('/api/assessment/submit-video', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Mock video submission failed');

      setUploadProgress(100);
      setStatus('completed');
      toast.success('Simulated explanation processed!');
      
      stopCameraStream();
      onUploadComplete();
    } catch (err) {
      console.error(err);
      setStatus('failed');
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto bg-slate-900/60 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
      <CardContent className="p-8">
        <div className="space-y-6">
          
          {/* Camera View Area */}
          <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-850 overflow-hidden shadow-inner flex items-center justify-center">
            {permissionStatus === 'granted' && status !== 'uploading' && status !== 'completed' && (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}

            {/* Inactive or Permission State overlays */}
            {permissionStatus === 'prompt' && (
              <div className="text-center p-6 space-y-4">
                <Loader2 className="h-8 w-8 text-teal-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400">Requesting hardware camera permission...</p>
              </div>
            )}

            {permissionStatus === 'denied' && (
              <div className="text-center p-6 space-y-4">
                <VideoOff className="h-8 w-8 text-red-400 mx-auto" />
                <p className="text-sm text-slate-300">Camera / Microphone Blocked</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Please enable camera permission in your browser settings to proceed, or click below to simulate.
                </p>
                <Button variant="outline" size="sm" onClick={requestCameraAccess} className="border-slate-800 text-slate-300">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-check Devices
                </Button>
              </div>
            )}

            {status === 'uploading' && (
              <div className="text-center p-6 space-y-4">
                <UploadCloud className="h-10 w-10 text-teal-400 animate-bounce mx-auto" />
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <p className="font-semibold text-slate-200">Saving & Transcribing...</p>
                  <p className="text-xs text-slate-500">Processing video through OpenAI Whisper-1</p>
                </div>
                <Progress value={uploadProgress} className="h-1.5 bg-slate-900 max-w-[200px] mx-auto" indicatorClassName="bg-teal-500" />
              </div>
            )}

            {/* Recording flashing Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <Radio className="h-3.5 w-3.5 text-red-500" />
                <span>REC • {recordingSeconds}s / 90s</span>
              </div>
            )}
          </div>

          {/* Recording limits bar */}
          {isRecording && (
            <div className="space-y-1">
              <Progress value={(recordingSeconds / 90) * 100} className="h-1 bg-slate-900" indicatorClassName="bg-red-500" />
            </div>
          )}

          {/* User Controls */}
          <div className="flex flex-col gap-3">
            {permissionStatus === 'granted' && (
              <div className="grid grid-cols-1 gap-3">
                {status === 'idle' && (
                  <Button
                    onClick={startRecording}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold py-6 text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-red-500/10"
                  >
                    <Radio className="h-5 w-5 animate-pulse" />
                    <span>Start Video Recording</span>
                  </Button>
                )}

                {status === 'recording' && (
                  <Button
                    onClick={stopRecording}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold py-6 text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Square className="h-5 w-5 fill-slate-950" />
                    <span>Stop & Upload Recording</span>
                  </Button>
                )}

                {(status === 'processing' || status === 'uploading') && (
                  <Button disabled className="bg-slate-900 border border-slate-800 text-slate-500 py-6 text-base rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Uploading Media...</span>
                  </Button>
                )}
              </div>
            )}

            {/* Offline/Mock Simulation options */}
            {(permissionStatus === 'denied' || process.env.NEXT_PUBLIC_SUPABASE_URL === undefined || !process.env.OPENAI_API_KEY) && (
              <Button
                variant="outline"
                onClick={handleSimulateMockVideo}
                disabled={status === 'uploading'}
                className="border-dashed border-teal-500/30 text-teal-400 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/50 py-5 rounded-xl text-xs font-semibold"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Simulate Video Explanation (Skip Camera / Mic Input)
              </Button>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
