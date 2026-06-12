import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Volume2, VolumeX, Eye, Send, Play, Pause, Music, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StoryReplies from './StoryReplies';
import { getAvatarUrl } from '../utils/avatar';

const REACTION_SHORTCUTS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

const StoryViewer = ({ userStoriesList, initialUserIndex, onClose, onRefreshStories }) => {
  const { user: loggedInUser } = useAuth();
  
  const [currentUserIdx, setCurrentUserIdx] = useState(initialUserIndex);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showRepliesDrawer, setShowRepliesDrawer] = useState(false);

  // References for media elements
  const videoRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const intervalRef = useRef(null);

  const activeUserGroup = userStoriesList[currentUserIdx];
  const activeStory = activeUserGroup?.stories[currentStoryIdx];
  const isOwnStory = activeUserGroup?.user.id === loggedInUser.id;

  // Mark story as viewed
  useEffect(() => {
    if (!activeStory) return;
    const viewStory = async () => {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories/${activeStory.id}/view`);
      } catch (err) {
        console.error('Failed to mark story viewed:', err);
      }
    };
    viewStory();
  }, [activeStory]);

  // Audio Playback Handler
  useEffect(() => {
    // Stop previous audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    if (!activeStory) return;

    if (activeStory.Music && !isMuted && !isPaused && !showRepliesDrawer) {
      audioPlayerRef.current = new Audio(activeStory.Music.audioUrl);
      audioPlayerRef.current.loop = true;
      audioPlayerRef.current.volume = 0.5;
      audioPlayerRef.current.play().catch(e => console.error('Audio autoplay blocked:', e));
    }

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, [activeStory, isMuted, isPaused, showRepliesDrawer]);

  // Sync mute state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [activeStory, isMuted]);

  // Segment Progress Loop Timer
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(0);

    if (showRepliesDrawer || isPaused || !activeStory) return;

    // Define slide duration
    let duration = 5000; // 5 seconds default
    if (activeStory.mediaType === 'video' && videoRef.current) {
      // If video is loaded, use its duration (up to 15s max or fallback)
      duration = videoRef.current.duration ? videoRef.current.duration * 1000 : 8000;
    }

    const step = 50; // increment every 50ms
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalRef.current);
          handleNextSegment();
          return 0;
        }
        return prev + (step / duration) * 100;
      });
    }, step);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentUserIdx, currentStoryIdx, isPaused, showRepliesDrawer]);

  const handleNextSegment = () => {
    if (currentStoryIdx < activeUserGroup.stories.length - 1) {
      // Next story of same user
      setCurrentStoryIdx(currentStoryIdx + 1);
    } else if (currentUserIdx < userStoriesList.length - 1) {
      // Next user's stories
      setCurrentUserIdx(currentUserIdx + 1);
      setCurrentStoryIdx(0);
    } else {
      // No more stories, close viewer
      handleClose();
    }
  };

  const handlePrevSegment = () => {
    if (currentStoryIdx > 0) {
      // Previous story of same user
      setCurrentStoryIdx(currentStoryIdx - 1);
    } else if (currentUserIdx > 0) {
      // Previous user's stories
      setCurrentUserIdx(currentUserIdx - 1);
      // Go to last story segment of previous user
      const prevUserGroup = userStoriesList[currentUserIdx - 1];
      setCurrentStoryIdx(prevUserGroup.stories.length - 1);
    } else {
      // Already at the very beginning, reset progress
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    onRefreshStories();
    onClose();
  };

  // Holding press to Pause
  const handlePressStart = () => {
    setIsPaused(true);
    if (videoRef.current) videoRef.current.pause();
  };

  const handlePressEnd = () => {
    setIsPaused(false);
    if (videoRef.current) videoRef.current.play().catch(e => console.error(e));
  };

  // Reactions shortcuts
  const handleSendReaction = async (reaction) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories/${activeStory.id}/react`, {
        reactionType: reaction,
      });
      // Temporarily pause and show animation/alert, or auto resume
      onRefreshStories();
      handleNextSegment();
    } catch (err) {
      console.error(err);
    }
  };

  // Story Reply submission
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories/${activeStory.id}/reply`, {
        message: replyText,
      });
      setReplyText('');
      // Auto advance
      handleNextSegment();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStory = async () => {
    if (!window.confirm('Delete this story segment permanently?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories/${activeStory.id}`);
      onRefreshStories();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none">
      <div className="w-full max-w-lg h-full flex flex-col justify-between relative bg-black p-4">
        
        {/* Top: Progress Bars */}
        <div className="absolute top-4 inset-x-4 flex gap-1.5 z-30 px-2">
          {activeUserGroup.stories.map((storyItem, idx) => {
            let widthPercent = 0;
            if (idx < currentStoryIdx) widthPercent = 100;
            if (idx === currentStoryIdx) widthPercent = progress;
            return (
              <div key={storyItem.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-burgundy rounded-full transition-all duration-[50ms] ease-linear"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header details & control buttons */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-30 px-2 mt-1">
          <div className="flex items-center gap-2.5">
            <img
              src={getAvatarUrl(activeUserGroup.user.profileImage, activeUserGroup.user.name)}
              alt={activeUserGroup.user.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-burgundy-light shadow-lg"
            />
            <div className="text-white drop-shadow-md">
              <h4 className="text-xs font-bold">{activeUserGroup.user.name}</h4>
              <span className="text-[9px] opacity-75 block font-sans">
                {new Date(activeStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOwnStory && (
              <button
                onClick={handleDeleteStory}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all text-[10px] font-bold border border-red-500/10"
                title="Delete story segment"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-all"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Core Media Window Display (Tap areas embedded) */}
        <div
          className="flex-1 w-full flex items-center justify-center relative rounded-3xl overflow-hidden my-16 bg-neutral-950 border border-neutral-900 shadow-inner"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          {activeStory.mediaType === 'image' && (
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${activeStory.mediaUrl}`}
              alt="Story attachment"
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {activeStory.mediaType === 'video' && (
            <video
              ref={videoRef}
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${activeStory.mediaUrl}`}
              className="w-full h-full object-contain pointer-events-none"
              autoPlay
              muted={isMuted}
              loop={false}
              onEnded={handleNextSegment}
            />
          )}

          {activeStory.mediaType === 'text' && (
            <div
              className="absolute inset-0 flex items-center justify-center text-center p-8"
              style={{ backgroundColor: activeStory.backgroundColor }}
            >
              <p className="text-white text-xl font-bold leading-relaxed whitespace-pre-wrap select-none break-words max-w-sm drop-shadow-md">
                {activeStory.text}
              </p>
            </div>
          )}

          {/* Soundtrack overlay sticker */}
          {activeStory.Music && (
            <div className="absolute bottom-6 left-6 right-6 bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-3 max-w-xs shadow-xl animate-bounce-slow">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
                <img
                  src={activeStory.Music.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80'}
                  alt="Music Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-burgundy/25 flex items-center justify-center">
                  <Music size={12} className="text-white animate-spin-slow" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Music size={10} className="text-burgundy-light shrink-0" />
                  <h5 className="text-white font-bold text-[10px] truncate leading-tight select-none">{activeStory.Music.title}</h5>
                </div>
                <p className="text-white/60 text-[8px] truncate mt-0.5 leading-tight select-none">{activeStory.Music.artist}</p>
              </div>

              {/* Wave animations */}
              {!isPaused && !isMuted && (
                <div className="flex gap-0.5 h-3 shrink-0 items-end pr-2">
                  <span className="w-0.5 bg-burgundy animate-music-wave-1"></span>
                  <span className="w-0.5 bg-burgundy animate-music-wave-2"></span>
                  <span className="w-0.5 bg-burgundy animate-music-wave-3"></span>
                </div>
              )}
            </div>
          )}

          {/* Invisible Left / Right navigation triggers */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/4 cursor-w-resize z-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevSegment();
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1/4 cursor-e-resize z-20"
            onClick={(e) => {
              e.stopPropagation();
              handleNextSegment();
            }}
          />
        </div>

        {/* Bottom Panel controls: Replies, reactions, or own views drawer */}
        <div className="absolute bottom-4 inset-x-4 z-30 flex flex-col gap-3">
          {isOwnStory ? (
            /* Viewer list slider trigger for own stories */
            <button
              onClick={() => {
                setIsPaused(true);
                setShowRepliesDrawer(true);
              }}
              className="w-full py-3 bg-neutral-900 border border-neutral-800 hover:border-burgundy/50 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Eye size={14} />
              Viewers ({activeStory.Views?.length || 0})
            </button>
          ) : (
            /* Reply box & Reactions for friends' stories */
            <div className="flex flex-col gap-2.5 bg-neutral-950/30 backdrop-blur-sm p-3 rounded-2xl border border-neutral-900/60 shadow-lg">
              {/* Emojis shortcuts */}
              <div className="flex justify-between px-2">
                {REACTION_SHORTCUTS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Text input form */}
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${activeUserGroup.user.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary rounded-xl shadow-md transition-all shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Story Viewers & Replies Drawer panel overlay */}
        {showRepliesDrawer && isOwnStory && (
          <div className="absolute inset-x-0 bottom-0 bg-neutral-950 z-40 border-t border-neutral-800 animate-slide-up">
            <StoryReplies
              story={activeStory}
              onClose={() => {
                setShowRepliesDrawer(false);
                setIsPaused(false);
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default StoryViewer;
