import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Image as ImageIcon, Video, Music, Palette, Send, FileText, Play, Pause, 
  ChevronDown, ChevronUp, Type, Sparkles, Smile, ArrowLeft, Save, HelpCircle, UserCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MusicPicker from './MusicPicker';
import { getAvatarUrl } from '../utils/avatar';

const COLOR_PALETTE = ['#800020', '#2D2D2D', '#1E1B4B', '#064E3B', '#451A03', '#311042', '#0F172A'];
const GRADIENT_PALETTE = [
  { name: 'Burgundy Sunset', value: 'linear-gradient(135deg, #4c0519 0%, #800020 50%, #0c0a09 100%)' },
  { name: 'Deep Nebula', value: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #030712 100%)' },
  { name: 'Emerald Forest', value: 'linear-gradient(135deg, #022c22 0%, #065f46 50%, #020617 100%)' },
  { name: 'Oceanic Blue', value: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0f172a 100%)' },
  { name: 'Charcoal Dark', value: 'linear-gradient(135deg, #171717 0%, #262626 50%, #0a0a0a 100%)' }
];

const EMOJI_LIST = ['😀', '😍', '😂', '🔥', '👏', '🎉', '👍', '❤️', '🙌', '✨', '🌟', '💥'];

const StoryCreator = ({ onClose, onPublishSuccess }) => {
  const { user } = useAuth();

  const [text, setText] = useState('');
  const [fontStyle, setFontStyle] = useState('classic'); // classic, modern, neon, serif
  const [fontSize, setFontSize] = useState(20);
  const [bgColor, setBgColor] = useState(COLOR_PALETTE[0]);
  const [bgGradient, setBgGradient] = useState(GRADIENT_PALETTE[0].value);
  const [useGradient, setUseGradient] = useState(false);
  
  const [music, setMusic] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileType, setFileType] = useState('text'); // text, image, video
  const [mentions, setMentions] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  // Accordion active state
  const [activeSection, setActiveSection] = useState('media'); // media, text, music, stickers, background
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Soundtrack preview
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef(null);

  const fileInputRef = useRef(null);

  // Auto clean preview object URLs
  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [filePreview]);

  const toggleSection = (sectionName) => {
    setActiveSection(activeSection === sectionName ? null : sectionName);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError('');
    const type = selectedFile.type;
    if (type.startsWith('image/')) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Image file size cannot exceed 10MB.');
        return;
      }
      setFileType('image');
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      setActiveSection('text'); // auto shift focus to caption
    } else if (type === 'video/mp4') {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('Video file size cannot exceed 50MB.');
        return;
      }
      setFileType('video');
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
      setActiveSection('text');
    } else {
      setError('Only JPG, PNG, WEBP images and MP4 videos are supported.');
    }
  };

  const handleSelectMusic = (song) => {
    setMusic(song);
    setMusicPickerOpen(false);
    
    // Play preview loop
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(song.audioUrl);
    audioRef.current.loop = true;
    audioRef.current.play().catch(e => console.error(e));
    setIsPlayingPreview(true);
  };

  const toggleMusicPreview = () => {
    if (!audioRef.current) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play().catch(e => console.error(e));
      setIsPlayingPreview(true);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview('');
    setFileType('text');
  };

  const handleSaveDraft = () => {
    setSuccess('Story draft saved locally.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePublish = async (e) => {
    if (e) e.preventDefault();
    if (user?.role === 'guest') {
      alert("Sign in to create stories.");
      return;
    }
    setError('');
    setPublishing(true);

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    }

    const formData = new FormData();
    // Combine text stickers, mentions and emojis if needed
    let finalCaption = text;
    if (mentions.trim()) {
      finalCaption += `\n${mentions.trim()}`;
    }
    if (selectedEmoji) {
      finalCaption += ` ${selectedEmoji}`;
    }

    formData.append('text', finalCaption);
    formData.append('backgroundColor', useGradient ? bgGradient : bgColor);
    if (music) {
      formData.append('musicId', music.id);
    }
    if (file) {
      formData.append('file', file);
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories`, formData);
      onPublishSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to publish story.');
      setPublishing(false);
    }
  };

  // Font style styles helper mapping
  const getFontClass = () => {
    switch (fontStyle) {
      case 'modern':
        return 'font-mono tracking-tight font-extrabold uppercase';
      case 'neon':
        return 'font-sans text-pink-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.95)]';
      case 'serif':
        return 'font-serif italic font-medium';
      case 'classic':
      default:
        return 'font-sans font-bold';
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 overflow-y-auto lg:overflow-hidden flex flex-col h-screen w-screen">
      
      {/* 1. Header component */}
      <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-all"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-white font-bold text-sm select-none">Create Story</span>
        </div>

        {/* Header success/error badges */}
        {success && (
          <div className="hidden md:flex bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-3 py-1.5 text-xs items-center gap-1.5 animate-scale-up">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            className="px-3 py-2 sm:px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || (fileType === 'text' && !text.trim())}
            className="px-4 py-2 sm:px-5 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-burgundy/15 shrink-0"
          >
            <Send size={14} />
            <span className="hidden sm:inline">{publishing ? 'Publishing...' : 'Publish'}</span>
            {!publishing && <span className="sm:hidden">Publish</span>}
            {publishing && <span className="sm:hidden">...</span>}
          </button>
        </div>
      </div>

      {/* 2. Main Content Layout (Desktop: 70/30 split, Mobile: stacked preview/controls) */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden relative">
        
        {/* Left Aspect Ratio Story Preview Frame (70%) */}
        <div className="flex-1 bg-neutral-950 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden min-h-[480px] lg:min-h-0 h-auto lg:h-full">
          <div 
            className="w-full max-w-[280px] lg:max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden relative shadow-2xl border border-neutral-900 flex flex-col justify-between p-4 bg-cover bg-center shrink-0 z-10 transition-all duration-300"
            style={{
              background: fileType === 'text' ? (useGradient ? bgGradient : bgColor) : '#121212',
            }}
          >
            {/* Top Preview Badges */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <img
                  src={getAvatarUrl(user?.profileImage, user?.name)}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-md"
                />
                <div className="text-white drop-shadow-md text-left">
                  <h4 className="text-[10px] font-bold leading-tight">{user?.name}</h4>
                  <span className="text-[8px] opacity-75 leading-tight block font-sans">Just now</span>
                </div>
              </div>
            </div>

            {/* Core Media Content Centered */}
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              {fileType === 'image' && (
                <img src={filePreview} alt="Preview" className="w-full h-full object-contain pointer-events-none" />
              )}
              {fileType === 'video' && (
                <video src={filePreview} className="w-full h-full object-contain pointer-events-none" autoPlay muted loop />
              )}
              
              {/* Text, Custom font style & font size */}
              <div className="flex flex-col items-center gap-2 justify-center w-full max-w-[90%] select-none break-words">
                {(fileType === 'text' || text) && (
                  <p 
                    className={`text-white drop-shadow-lg leading-relaxed whitespace-pre-wrap ${getFontClass()}`}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {text || (fileType === 'text' ? 'Write your thoughts...' : '')}
                  </p>
                )}

                {/* Mentions sticker */}
                {mentions.trim() && (
                  <span className="px-2.5 py-1 bg-burgundy/80 text-secondary text-[10px] font-bold rounded-lg shadow-md animate-pulse">
                    {mentions.trim()}
                  </span>
                )}

                {/* Emoji Sticker overlay */}
                {selectedEmoji && (
                  <span className="text-4xl animate-bounce-slow mt-2">
                    {selectedEmoji}
                  </span>
                )}
              </div>
            </div>

            {/* Soundtrack Overlay card sticker */}
            {music && (
              <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 flex items-center justify-between max-w-xs mx-auto mb-2 z-10 w-full shadow-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <img src={music.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80'} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <Music size={12} className="text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="min-w-0 text-left">
                    <h5 className="text-white font-bold text-[9px] truncate leading-tight">{music.title}</h5>
                    <p className="text-white/60 text-[8px] truncate mt-0.5 leading-tight">{music.artist}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMusicPreview}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all shrink-0"
                >
                  {isPlayingPreview ? <Pause size={10} className="text-burgundy animate-pulse" /> : <Play size={10} />}
                </button>
              </div>
            )}
          </div>

          {/* Grid Background graphics */}
          <div className="absolute inset-0 bg-neutral-900/10 pointer-events-none bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

        {/* Right Collapsible Controls Sidebar Panel (30%) */}
        <div className="w-full lg:w-[350px] xl:w-[400px] h-auto lg:h-full bg-neutral-950 border-t lg:border-t-0 lg:border-l border-neutral-900 flex flex-col lg:overflow-hidden shrink-0 z-20">
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
            
            {/* ACCORDION 1: MEDIA */}
            <div className="glass-panel border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => toggleSection('media')}
                className="w-full px-4 py-3 flex justify-between items-center bg-neutral-900/40 text-white font-bold text-xs hover:bg-neutral-900/80 transition-all uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-burgundy" />
                  Media Settings
                </span>
                {activeSection === 'media' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeSection === 'media' && (
                <div className="p-4 bg-neutral-950/40 flex flex-col gap-3 animate-slide-down">
                  {fileType === 'text' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 bg-neutral-900 border border-neutral-850 hover:border-burgundy/50 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all"
                      >
                        <ImageIcon size={16} />
                        Add Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 bg-neutral-900 border border-neutral-850 hover:border-burgundy/50 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all"
                      >
                        <Video size={16} />
                        Add Video
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-neutral-900 rounded-xl flex items-center justify-between border border-neutral-850">
                        <span className="text-xs text-neutral-300 font-semibold truncate max-w-[150px]">{file.name}</span>
                        <span className="text-[10px] text-burgundy font-bold uppercase">{fileType}</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="w-full py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all"
                      >
                        Remove Media Attachment
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,video/mp4"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            {/* ACCORDION 2: TEXT */}
            <div className="glass-panel border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => toggleSection('text')}
                className="w-full px-4 py-3 flex justify-between items-center bg-neutral-900/40 text-white font-bold text-xs hover:bg-neutral-900/80 transition-all uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Type size={14} className="text-burgundy" />
                  Text Styling
                </span>
                {activeSection === 'text' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeSection === 'text' && (
                <div className="p-4 bg-neutral-950/40 flex flex-col gap-4 animate-slide-down">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Caption Text</label>
                    <textarea
                      placeholder="Write your story message here..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-850 rounded-xl p-3 text-xs text-white outline-none focus:border-burgundy transition-all min-h-[60px] resize-none"
                    />
                  </div>

                  {/* Font Style */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Font Style</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['classic', 'modern', 'neon', 'serif'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setFontStyle(style)}
                          className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                            fontStyle === style ? 'bg-burgundy text-secondary' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Font Size</label>
                      <span className="text-[10px] text-neutral-400 font-bold">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="32"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full accent-burgundy cursor-pointer bg-neutral-900 rounded-lg appearance-none h-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: MUSIC */}
            <div className="glass-panel border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => toggleSection('music')}
                className="w-full px-4 py-3 flex justify-between items-center bg-neutral-900/40 text-white font-bold text-xs hover:bg-neutral-900/80 transition-all uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Music size={14} className="text-burgundy" />
                  Soundtrack
                </span>
                {activeSection === 'music' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeSection === 'music' && (
                <div className="p-4 bg-neutral-950/40 flex flex-col gap-3 animate-slide-down">
                  {music ? (
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-neutral-900 border border-neutral-850 rounded-xl flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-2">
                          <h5 className="text-xs text-white font-bold truncate">{music.title}</h5>
                          <p className="text-[10px] text-neutral-500 truncate mt-0.5">{music.artist}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMusic(null);
                            if (audioRef.current) {
                              audioRef.current.pause();
                              setIsPlayingPreview(false);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMusicPickerOpen(true)}
                      className="w-full py-3 bg-neutral-900 border border-neutral-850 hover:border-burgundy/50 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Music size={14} />
                      Choose Background Music
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 4: STICKERS */}
            <div className="glass-panel border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => toggleSection('stickers')}
                className="w-full px-4 py-3 flex justify-between items-center bg-neutral-900/40 text-white font-bold text-xs hover:bg-neutral-900/80 transition-all uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Smile size={14} className="text-burgundy" />
                  Stickers & Emojis
                </span>
                {activeSection === 'stickers' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeSection === 'stickers' && (
                <div className="p-4 bg-neutral-950/40 flex flex-col gap-3.5 animate-slide-down">
                  {/* Mentions */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Mention Friend</label>
                    <input
                      type="text"
                      placeholder="E.g., @AliceSmith"
                      value={mentions}
                      onChange={(e) => setMentions(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-850 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-burgundy transition-all"
                    />
                  </div>

                  {/* Emoji selection grid */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Emoji Stickers</label>
                      {selectedEmoji && (
                        <button onClick={() => setSelectedEmoji('')} className="text-[9px] text-red-400 font-bold">Clear</button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {EMOJI_LIST.map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => setSelectedEmoji(selectedEmoji === emo ? '' : emo)}
                          className={`p-1.5 rounded-lg text-lg hover:bg-neutral-800 transition-all ${
                            selectedEmoji === emo ? 'bg-burgundy scale-110 shadow-md shadow-burgundy/25' : 'bg-neutral-900/40'
                          }`}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 5: BACKGROUND */}
            <div className="glass-panel border border-neutral-900 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => toggleSection('background')}
                className="w-full px-4 py-3 flex justify-between items-center bg-neutral-900/40 text-white font-bold text-xs hover:bg-neutral-900/80 transition-all uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Palette size={14} className="text-burgundy" />
                  Background Style
                </span>
                {activeSection === 'background' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {activeSection === 'background' && (
                <div className="p-4 bg-neutral-950/40 flex flex-col gap-4 animate-slide-down">
                  {/* Selector Solid / Gradient */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUseGradient(false)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        !useGradient ? 'bg-burgundy text-secondary' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850'
                      }`}
                    >
                      Solid Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseGradient(true)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        useGradient ? 'bg-burgundy text-secondary' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850'
                      }`}
                    >
                      Gradients
                    </button>
                  </div>

                  {!useGradient ? (
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setBgColor(c);
                            setFileType('text');
                          }}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            bgColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {GRADIENT_PALETTE.map((g) => (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() => {
                            setBgGradient(g.value);
                            setFileType('text');
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] text-left text-white font-bold transition-all flex items-center justify-between border ${
                            bgGradient === g.value ? 'border-white' : 'border-neutral-850'
                          }`}
                          style={{ background: g.value }}
                        >
                          <span>{g.name}</span>
                          {bgGradient === g.value && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* 3. Bottom Quick Action Footer Toolbar (Action shortcuts) */}
      <div className="h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-6 shrink-0 z-30 shadow-inner">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              toggleSection('media');
              fileInputRef.current?.click();
            }}
            className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
            title="Add media"
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={() => {
              toggleSection('music');
              setMusicPickerOpen(true);
            }}
            className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
            title="Add Music"
          >
            <Music size={16} />
          </button>
          <button
            onClick={() => {
              toggleSection('text');
            }}
            className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
            title="Add text"
          >
            <Type size={16} />
          </button>
          <button
            onClick={() => {
              toggleSection('stickers');
            }}
            className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
            title="Add emoji sticker"
          >
            <Smile size={16} />
          </button>
          <button
            onClick={() => {
              toggleSection('background');
            }}
            className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl transition-all"
            title="Change background color"
          >
            <Palette size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1"
          >
            Save
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || (fileType === 'text' && !text.trim())}
            className="px-5 py-2 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-md"
          >
            Publish Story
          </button>
        </div>
      </div>

      {/* Music Picker Drawer slide-up overlay */}
      {musicPickerOpen && (
        <div className="absolute inset-x-0 bottom-0 bg-neutral-950 z-40 border-t border-neutral-850 animate-slide-up">
          <div className="flex justify-between items-center p-4 border-b border-neutral-800 shrink-0">
            <span className="text-white font-bold text-sm">Select Soundtrack</span>
            <button onClick={() => setMusicPickerOpen(false)} className="text-neutral-500 hover:text-white text-xs font-semibold p-1">
              Close
            </button>
          </div>
          <MusicPicker onSelect={handleSelectMusic} onClose={() => setMusicPickerOpen(false)} />
        </div>
      )}

    </div>
  );
};

export default StoryCreator;
