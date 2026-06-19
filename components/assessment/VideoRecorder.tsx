'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, Radio, Loader2, RefreshCw, UploadCloud, AlertCircle } from 'lucide-react';
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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request permissions on mount
  useEffect(() => {
    requestMicAccess();
    return () => {
      stopMicStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const requestMicAccess = async () => {
    try {
      stopMicStream();
      const userStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      setStream(userStream);
      setPermissionStatus('granted');
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionStatus('denied');
      toast.error('Could not access your microphone. Check your permission settings.');
    }
  };

  const stopMicStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) {
      toast.error('No microphone stream available.');
      return;
    }

    setRecordedChunks([]);
    setRecordingSeconds(0);
    setStatus('recording');
    setIsRecording(true);

    try {
      // Determine supported mimeTypes for audio recording
      let options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
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
          if (prev >= 89) { // 90s limit
            stopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      toast.error('Failed to start audio recording.');
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
      uploadAudioBlob();
    }
  }, [recordedChunks, status]);

  const uploadAudioBlob = async () => {
    setStatus('uploading');
    setUploadProgress(10);

    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const file = new File([blob], 'explanation.webm', { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assessmentId', assessmentId);

    setUploadProgress(30);

    try {
      const res = await fetch('/api/assessment/submit-video', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Audio upload failed');

      setUploadProgress(100);
      setStatus('completed');
      toast.success('Explanation audio processed successfully!');
      
      stopMicStream();
      onUploadComplete();
    } catch (err) {
      console.error(err);
      setStatus('failed');
      toast.error('Failed to upload audio to servers.');
    }
  };

  const handleSimulateMockAudio = async () => {
    setStatus('uploading');
    setUploadProgress(50);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const formData = new FormData();
      formData.append('assessmentId', assessmentId);
      formData.append('is_mock', 'true');

      const res = await fetch('/api/assessment/submit-video', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Mock audio submission failed');

      setUploadProgress(100);
      setStatus('completed');
      toast.success('Simulated explanation processed!');
      
      stopMicStream();
      onUploadComplete();
    } catch (err) {
      console.error(err);
      setStatus('failed');
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto bg-slate-900/60 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent pointer-events-none" />
      <CardContent className="p-8">
        <div className="space-y-6">
          
          {/* Audio Visualization / State Area */}
          <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-850 overflow-hidden shadow-inner flex flex-col items-center justify-center">
            
            {permissionStatus === 'granted' && status !== 'uploading' && status !== 'completed' && (
              <div className="text-center space-y-4">
                <div className={`p-6 rounded-full border transition-all duration-500 mx-auto w-fit ${
                  isRecording 
                    ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_35px_rgba(239,68,68,0.25)] animate-pulse' 
                    : 'bg-slate-900 border-slate-800 text-teal-400'
                }`}>
                  <Mic className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200">
                    {isRecording ? 'Recording Voice Explanation...' : 'Microphone Ready'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal">
                    {isRecording 
                      ? 'Speak clearly into your microphone to explain your solution logic and complexities.' 
                      : 'Click the red button below to start your oral explanation.'}
                  </p>
                </div>
              </div>
            )}

            {/* Loading / Permissions Overlay */}
            {permissionStatus === 'prompt' && (
              <div className="text-center p-6 space-y-4">
                <Loader2 className="h-8 w-8 text-teal-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-400">Requesting microphone access...</p>
              </div>
            )}

            {permissionStatus === 'denied' && (
              <div className="text-center p-6 space-y-4">
                <MicOff className="h-8 w-8 text-red-400 mx-auto" />
                <p className="text-sm text-slate-300">Microphone Access Blocked</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
                  Please enable microphone permission in your browser settings to proceed, or click below to bypass and simulate.
                </p>
                <Button variant="outline" size="sm" onClick={requestMicAccess} className="border-slate-800 text-slate-300">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-check Microphone
                </Button>
              </div>
            )}

            {status === 'uploading' && (
              <div className="text-center p-6 space-y-4">
                <UploadCloud className="h-10 w-10 text-teal-400 animate-bounce mx-auto" />
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <p className="font-semibold text-slate-200">Processing Audio...</p>
                  <p className="text-xs text-slate-500">Transcribing voice explanation via OpenAI Whisper</p>
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

          {/* Recording limits progress bar */}
          {isRecording && (
            <div className="space-y-1">
              <Progress value={(recordingSeconds / 90) * 100} className="h-1 bg-slate-900" indicatorClassName="bg-red-500" />
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col gap-3">
            {permissionStatus === 'granted' && (
              <div className="grid grid-cols-1 gap-3">
                {status === 'idle' && (
                  <Button
                    onClick={startRecording}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold py-6 text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-red-500/10"
                  >
                    <Radio className="h-5 w-5 animate-pulse" />
                    <span>Start Audio Recording</span>
                  </Button>
                )}

                {status === 'recording' && (
                  <Button
                    onClick={stopRecording}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold py-6 text-base rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Square className="h-5 w-5 fill-slate-950" />
                    <span>Stop & Upload Explanation</span>
                  </Button>
                )}

                {(status === 'processing' || status === 'uploading') && (
                  <Button disabled className="bg-slate-900 border border-slate-800 text-slate-500 py-6 text-base rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Processing Media...</span>
                  </Button>
                )}
              </div>
            )}

            {/* Offline/Mock simulation bypass */}
            {(permissionStatus === 'denied' || process.env.NEXT_PUBLIC_SUPABASE_URL === undefined || !process.env.OPENAI_API_KEY) && (
              <Button
                variant="outline"
                onClick={handleSimulateMockAudio}
                disabled={status === 'uploading'}
                className="border-dashed border-teal-500/30 text-teal-400 bg-teal-500/5 hover:bg-teal-500/10 hover:border-teal-500/50 py-5 rounded-xl text-xs font-semibold"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Simulate Audio Explanation (Skip Mic Input)
              </Button>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
