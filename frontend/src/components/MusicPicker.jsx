import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Play, Pause, Music, Flame, History, Loader2 } from 'lucide-react';

const MusicPicker = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [activeTab, setActiveTab] = useState('trending'); // trending, search, recent
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [playingSongId, setPlayingSongId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchTrending();
    fetchRecent();
  }, []);

  const fetchTrending = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/songs/trending`);
      setTrending(res.data);
      setSongs(res.data);
    } catch (err) {
      console.error('Failed to fetch trending songs:', err);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/songs/recent`);
      setRecent(res.data);
    } catch (err) {
      console.error('Failed to fetch recently used songs:', err);
    }
  };

  const handleSearch = async (val, pageNum = 1) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSongs(activeTab === 'trending' ? trending : recent);
      setPage(1);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/songs/search`, {
        params: {
          query: val.trim(),
          page: pageNum,
        },
      });

      if (pageNum === 1) {
        setSongs(res.data);
      } else {
        setSongs((prev) => [...prev, ...res.data]);
      }

      setPage(pageNum);
      // Audius tracks search returns 20 items per page limit
      setHasMore(res.data.length === 20);
    } catch (err) {
      console.error('Search query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    // Check if scrolled to bottom
    const isBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    if (isBottom && !loading && hasMore && searchQuery.trim()) {
      handleSearch(searchQuery, page + 1);
    }
  };

  const togglePreview = (song) => {
    const songId = song.audiusTrackId || song.id;
    if (playingSongId === songId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSongId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.audioUrl);
      audioRef.current.play().catch((e) => console.error('Audio playback blocked:', e));
      setPlayingSongId(songId);
      audioRef.current.onended = () => {
        setPlayingSongId(null);
      };
    }
  };

  const handleSelectSong = async (song) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Save/upsert song to the local relational database first
    if (song.audiusTrackId) {
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/songs/select`, song);
        onSelect(res.data);
      } catch (err) {
        console.error('Failed to sync song to local DB:', err);
        // Fallback: pass song as is
        onSelect(song);
      }
    } else {
      onSelect(song);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-96 bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden p-4 shadow-2xl relative">
      {/* Search Header */}
      <div className="relative mb-4 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search songs or artists..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value, 1)}
          className="w-full pl-9 pr-4 py-2 bg-neutral-950/60 border border-neutral-850 rounded-xl text-xs text-white outline-none focus:border-burgundy transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-neutral-850 pb-2 shrink-0">
        <button
          onClick={() => {
            setActiveTab('trending');
            setSongs(trending);
            setSearchQuery('');
            setPage(1);
            setHasMore(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'trending' ? 'bg-burgundy text-secondary' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Flame size={12} />
          Trending
        </button>
        <button
          onClick={() => {
            setActiveTab('recent');
            setSongs(recent);
            setSearchQuery('');
            setPage(1);
            setHasMore(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'recent' ? 'bg-burgundy text-secondary' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <History size={12} />
          Recently Used
        </button>
      </div>

      {/* Song List */}
      <div
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2"
      >
        {songs.length === 0 && !loading ? (
          <div className="text-center py-12 text-neutral-600 text-xs italic flex flex-col items-center gap-2">
            <Music size={24} />
            No songs found
          </div>
        ) : (
          <>
            {songs.map((song) => {
              const songId = song.audiusTrackId || song.id;
              return (
                <div
                  key={songId}
                  className="flex items-center justify-between p-2 rounded-xl border border-neutral-850 bg-neutral-950/20 hover:bg-neutral-900/60 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={song.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80'}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-800"
                    />
                    <div className="min-w-0">
                      <h4 className="text-white text-xs font-bold truncate">{song.title}</h4>
                      <p className="text-neutral-500 text-[10px] truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePreview(song)}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-all"
                      title="Preview audio"
                    >
                      {playingSongId === songId ? <Pause size={12} className="text-burgundy animate-pulse" /> : <Play size={12} />}
                    </button>
                    <button
                      onClick={() => handleSelectSong(song)}
                      className="px-3 py-1.5 bg-burgundy hover:bg-burgundy-light text-secondary text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                    >
                      Select
                    </button>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-center items-center py-3">
                <Loader2 size={16} className="text-burgundy animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MusicPicker;
