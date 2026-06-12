import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, MessageCircle, Heart, X, Sparkles } from 'lucide-react';
import { getAvatarUrl } from '../utils/avatar';

const StoryReplies = ({ story, onClose }) => {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViewers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories/${story.id}/viewers`);
        setViewers(res.data);
      } catch (err) {
        console.error('Error fetching story viewers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchViewers();
  }, [story.id]);

  return (
    <div className="flex flex-col h-96 bg-neutral-900 border border-neutral-800 rounded-t-3xl overflow-hidden p-5 shadow-2xl relative">
      {/* Title Header */}
      <div className="flex justify-between items-center mb-4 shrink-0 pb-2 border-b border-neutral-850">
        <div>
          <h4 className="text-white text-sm font-bold flex items-center gap-1.5">
            <Eye size={16} className="text-burgundy" />
            Story Analytics
          </h4>
          <p className="text-neutral-500 text-[10px] mt-0.5">Track views, reactions, and replies</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-lg transition-all">
          <X size={14} />
        </button>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
        <div className="bg-neutral-950/45 p-3 rounded-xl text-center border border-neutral-850">
          <span className="block text-white font-bold text-base">{viewers.length}</span>
          <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Views</span>
        </div>
        <div className="bg-neutral-950/45 p-3 rounded-xl text-center border border-neutral-850">
          <span className="block text-white font-bold text-base">
            {story.Reactions?.length || 0}
          </span>
          <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Reactions</span>
        </div>
        <div className="bg-neutral-950/45 p-3 rounded-xl text-center border border-neutral-850">
          <span className="block text-white font-bold text-base">
            {story.Replies?.length || 0}
          </span>
          <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Replies</span>
        </div>
      </div>

      {/* Lists split screen tabs */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
        {/* Viewers & Reactions */}
        <div>
          <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2 block">Viewer Directory</span>
          {loading ? (
            <div className="text-center py-4 text-neutral-600 text-xs">Loading viewers...</div>
          ) : viewers.length === 0 ? (
            <p className="text-neutral-600 text-xs italic py-2">No views yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {viewers.map((view) => {
                // Find if this viewer has reactions on this story
                const userReaction = story.Reactions?.find(r => r.userId === view.viewerId);
                return (
                  <div key={view.id} className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/25 border border-neutral-850/65">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={getAvatarUrl(view.Viewer?.profileImage, view.Viewer?.name)}
                        alt={view.Viewer?.name}
                        className="w-8 h-8 rounded-full object-cover border border-neutral-855 shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="text-white text-xs font-bold truncate">{view.Viewer?.name}</h5>
                        <p className="text-neutral-600 text-[9px]">{new Date(view.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {userReaction && (
                      <span className="w-7 h-7 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center text-sm shadow-md animate-scale-up">
                        {userReaction.reactionType}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Text Replies List */}
        <div>
          <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-2 block">Conversations & Replies</span>
          {!story.Replies || story.Replies.length === 0 ? (
            <p className="text-neutral-600 text-xs italic py-2">No replies yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {story.Replies.map((rep) => (
                <div key={rep.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-950/20 border border-neutral-850/40">
                  <img
                    src={getAvatarUrl(rep.Sender?.profileImage, rep.Sender?.name)}
                    alt={rep.Sender?.name}
                    className="w-7 h-7 rounded-full object-cover border border-neutral-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h5 className="text-burgundy-light text-[10px] font-bold truncate">{rep.Sender?.name}</h5>
                      <span className="text-neutral-600 text-[8px]">{new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-neutral-200 text-xs mt-0.5 whitespace-pre-wrap leading-relaxed">{rep.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryReplies;
