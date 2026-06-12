import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Calendar, FileText, Image, Video, Mic, ArrowRight, History } from 'lucide-react';
import axios from 'axios';
import { getAvatarUrl } from '../utils/avatar';

const SearchModal = ({ onClose, onJumpToMessage, decryptMessage }) => {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '', 'today', 'last7', 'last30'
  const [typeFilter, setTypeFilter] = useState(''); // '', 'image', 'video', 'voice', 'document'
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    // Load recent searches
    const cached = localStorage.getItem('wechat_recent_searches');
    if (cached) {
      setRecentSearches(JSON.parse(cached));
    }
  }, []);

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('wechat_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('wechat_recent_searches');
  };

  const handleSearch = async (e, fresh = true) => {
    if (e) e.preventDefault();
    if (!query.trim() && !dateFilter && !typeFilter) return;

    setLoading(true);
    const searchPage = fresh ? 1 : page;

    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chats/search/advanced`, {
        params: {
          query: query.trim(),
          filter: dateFilter,
          type: typeFilter,
          page: searchPage,
          limit: 20
        }
      });

      // Decrypt messages client-side if encrypted
      const decryptedResults = await Promise.all(
        res.data.map(async (msg) => {
          let text = msg.message;
          if (text && text.startsWith('[E2E]:') && decryptMessage) {
            try {
              text = await decryptMessage(text, msg.senderId === msg.receiverId ? null : (msg.groupId ? null : (msg.senderId)));
            } catch (err) {
              text = '[Encrypted Message]';
            }
          }
          return { ...msg, decryptedMessage: text };
        })
      );

      // Filter locally for decrypted message query if server Op.like missed it due to DB encryption
      let finalResults = decryptedResults;
      if (query.trim() && decryptMessage) {
        finalResults = decryptedResults.filter(
          msg => (msg.decryptedMessage || '').toLowerCase().includes(query.trim().toLowerCase())
        );
      }

      if (fresh) {
        setResults(finalResults);
        setPage(2);
        saveRecentSearch(query);
      } else {
        setResults((prev) => [...prev, ...finalResults]);
        setPage(searchPage + 1);
      }

      setHasMore(res.data.length === 20);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const highlightMatch = (text, term) => {
    if (!text) return '';
    if (!term || !term.trim()) return text;

    const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-primary font-bold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header input area */}
        <div className="p-5 border-b border-neutral-850 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white text-lg font-bold">Advanced Search</h3>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => handleSearch(e, true)} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-neutral-500" size={18} />
              <input
                type="text"
                placeholder="Search messages, text keywords, or media logs..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 bg-primary hover:bg-primary-light text-secondary rounded-2xl text-sm font-bold shadow-md shadow-primary/10 transition-all">
              Search
            </button>
          </form>

          {/* Filters pills row */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mr-1">Filters:</span>
            
            {/* Date ranges filters */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-neutral-955 border border-neutral-800 rounded-xl text-xs text-neutral-300 outline-none cursor-pointer focus:border-primary"
            >
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
            </select>

            {/* Media type filters */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-neutral-955 border border-neutral-800 rounded-xl text-xs text-neutral-300 outline-none cursor-pointer focus:border-primary"
            >
              <option value="">Any Format</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="voice">Voice Notes</option>
              <option value="document">Documents</option>
            </select>

            {/* Clear filter button if active */}
            {(dateFilter || typeFilter) && (
              <button
                onClick={() => { setDateFilter(''); setTypeFilter(''); }}
                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results stream area */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && results.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center py-12 text-center">
              {recentSearches.length > 0 && !query ? (
                <div className="w-full max-w-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <History size={12} />
                      Recent Searches
                    </span>
                    <button onClick={clearRecentSearches} className="text-[9px] text-neutral-500 hover:text-red-400 font-bold">
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(term); }}
                        className="w-full p-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 rounded-xl text-left text-xs text-neutral-300 transition-colors flex justify-between items-center"
                      >
                        <span>{term}</span>
                        <ArrowRight size={10} className="text-neutral-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <Search size={40} className="text-neutral-600 mb-3" />
                  <h4 className="text-white text-sm font-bold">No results found</h4>
                  <p className="text-neutral-500 text-xs mt-1">Try refining search query or filters.</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => onJumpToMessage(msg)}
                  className="w-full p-4 bg-neutral-950 border border-neutral-850 hover:bg-neutral-850 rounded-2xl text-left transition-all duration-200 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={getAvatarUrl(msg.Sender?.profileImage, msg.Sender?.name)}
                      alt={msg.Sender?.name}
                      className="w-9 h-9 rounded-full object-cover border border-neutral-800 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-semibold">{msg.Sender?.name}</span>
                        <span className="text-[9px] text-neutral-500">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neutral-300 text-xs leading-relaxed mt-1 truncate">
                        {highlightMatch(msg.decryptedMessage || msg.message, query)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {msg.message === '[Voice Note]' && <Mic size={14} className="text-primary" />}
                    {msg.messageType === 'image' && <Image size={14} className="text-blue-400" />}
                    {msg.messageType === 'file' && msg.fileUrl?.endsWith('.mp4') && <Video size={14} className="text-red-400" />}
                    {msg.messageType === 'file' && msg.message !== '[Voice Note]' && !msg.fileUrl?.endsWith('.mp4') && <FileText size={14} className="text-green-400" />}
                    <ArrowRight size={14} className="text-neutral-600 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}

              {hasMore && (
                <button
                  onClick={() => handleSearch(null, false)}
                  className="w-full py-2.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-400 rounded-xl text-xs font-bold transition-all mt-2"
                >
                  Load More Results
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SearchModal;
