import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2, Volume2, Globe } from 'lucide-react';

const VoicePlayer = ({ voiceUrl, duration, isMe, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1, 1.5, 2

  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize audio node
    const audio = new Audio((voiceUrl.startsWith('http') || voiceUrl.startsWith('blob:')) ? voiceUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${voiceUrl}`);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(100);
      setCurrentTime(duration);
      stopProgressTracker();
    };

    return () => {
      audio.pause();
      stopProgressTracker();
    };
  }, [voiceUrl, duration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const startProgressTracker = () => {
    stopProgressTracker();
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        const current = audioRef.current.currentTime;
        setCurrentTime(current);
        setProgress((current / audioRef.current.duration) * 100 || 0);
      }
    }, 100);
  };

  const stopProgressTracker = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopProgressTracker();
    } else {
      if (progress >= 100) {
        audioRef.current.currentTime = 0;
        setProgress(0);
        setCurrentTime(0);
      }
      audioRef.current.play().catch(e => console.error('Audio play error:', e));
      setIsPlaying(true);
      startProgressTracker();
    }
  };

  const handleSpeedToggle = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Mock static waveform structure
  const WAVE_BARS = [4, 8, 12, 6, 8, 14, 18, 10, 6, 12, 16, 8, 6, 10, 14, 18, 10, 4, 8, 12, 6, 8, 10, 6];

  return (
    <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-3 w-64 select-none group relative shadow-md">
      {/* 1. Play / Pause Button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-primary hover:bg-primary-light text-secondary flex items-center justify-center shrink-0 transition-all scale-100 active:scale-95 shadow-md shadow-primary/10"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
      </button>

      {/* 2. Waveform progress animation */}
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {WAVE_BARS.map((height, idx) => {
          const barProgress = (idx / WAVE_BARS.length) * 100;
          const isPlayed = progress > barProgress;
          return (
            <div
              key={idx}
              className="w-0.5 rounded-full transition-colors duration-200"
              style={{
                height: `${height}px`,
                backgroundColor: isPlayed ? '#A3E635' : '#4b5563' // Lime green if played, gray if unplayed
              }}
            />
          );
        })}
      </div>

      {/* 3. Speed & Time display */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <button
          onClick={handleSpeedToggle}
          className="text-[9px] font-bold bg-neutral-800 text-neutral-400 hover:text-white px-1.5 py-0.5 rounded border border-neutral-750 transition-all select-none uppercase"
          title="Toggle playback speed"
        >
          {playbackSpeed}x
        </button>
        <span className="text-[10px] font-mono text-neutral-500 font-bold">
          {formatTime(currentTime || duration)}
        </span>
      </div>

      {/* 4. Action triggers */}
      <div className="absolute -top-3 -right-2 hidden group-hover:flex items-center gap-1.5 bg-neutral-950/90 border border-neutral-850 px-2 py-1 rounded-lg shadow-lg">
        <a
          href={(voiceUrl.startsWith('http') || voiceUrl.startsWith('blob:')) ? voiceUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${voiceUrl}`}
          download={`voice-note-${Date.now()}.webm`}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-500 hover:text-white transition-colors"
          title="Download recording"
        >
          <Download size={12} />
        </a>
        {isMe && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this voice note?')) onDelete();
            }}
            className="text-neutral-500 hover:text-red-400 transition-colors"
            title="Delete voice message"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default VoicePlayer;
