import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, X } from 'lucide-react';

const VoiceRecorder = ({ onSend, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [visualizerData, setVisualizerData] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  useEffect(() => {
    // Clean up timers and audio contexts on unmount
    return () => {
      stopRecordingTimer();
      cleanupAudioContext();
    };
  }, []);

  const startRecordingTimer = () => {
    setRecordTime(0);
    timerRef.current = setInterval(() => {
      setRecordTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupAudioContext = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
  };

  const setupVisualizer = (stream) => {
    try {
      cleanupAudioContext();

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small fft for simple waveform bars
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        animationRef.current = requestAnimationFrame(draw);

        analyserRef.current.getByteFrequencyData(dataArray);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.8;

          // Beautiful Lime Green color gradients for active bar indicator
          ctx.fillStyle = `rgba(163, 230, 53, ${0.3 + (dataArray[i] / 255) * 0.7})`;
          
          // Draw rounded bars symmetric from center
          const yPos = (height - barHeight) / 2;
          ctx.fillRect(x, yPos, barWidth - 2, barHeight);

          x += barWidth;
        }
      };

      draw();
    } catch (e) {
      console.warn('Audio Context Visualizer failed:', e);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stream tracks must be stopped to release mic lock
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startRecordingTimer();
      setupVisualizer(stream);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      alert('Microphone access denied or unsupported browser.');
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioBlob.size > 1000) { // Verify audio contains actual data
        onSend(audioBlob, recordTime || 1);
      }
      cleanupAudioContext();
    };

    mediaRecorderRef.current.stop();
    stopRecordingTimer();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.onstop = () => {
      cleanupAudioContext();
    };
    mediaRecorderRef.current.stop();
    stopRecordingTimer();
    setIsRecording(false);
    audioChunksRef.current = [];
    if (onClose) onClose();
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 w-full max-w-lg shadow-xl animate-scale-up">
      {/* 1. Close icon */}
      <button
        onClick={onClose}
        className="p-1.5 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-lg transition-all"
        title="Close Recorder"
      >
        <X size={16} />
      </button>

      {/* 2. Visualizer Canvas */}
      <div className="flex-1 flex items-center justify-center h-10 px-2 relative min-w-0 bg-neutral-950/40 rounded-xl border border-neutral-850/60 overflow-hidden">
        {isRecording ? (
          <canvas ref={canvasRef} className="w-full h-full" width={200} height={40} />
        ) : (
          <span className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">Microphone Idle</span>
        )}
      </div>

      {/* 3. Duration Timer */}
      <div className="text-white font-mono text-xs font-semibold select-none bg-neutral-950/60 px-2.5 py-1.5 rounded-lg border border-neutral-850">
        {formatTimer(recordTime)}
      </div>

      {/* 4. Action buttons */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <>
            <button
              onClick={cancelRecording}
              className="p-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
              title="Cancel recording"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={stopAndSendRecording}
              className="p-2.5 bg-primary hover:bg-primary-light text-secondary rounded-xl transition-all scale-100 hover:scale-105 active:scale-95 shadow-md shadow-primary/10"
              title="Send voice note"
            >
              <Send size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={startRecording}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-750 text-primary border border-neutral-750 rounded-xl transition-all scale-100 hover:scale-105"
            title="Start recording"
          >
            <Mic size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
