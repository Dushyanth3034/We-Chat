import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Heart,
  MessageCircle,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  Trash2,
  AlertCircle,
  Plus,
  Compass,
} from 'lucide-react';
import StoriesBar from '../components/StoriesBar';
import { getAvatarUrl } from '../utils/avatar';

const FeedPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Create Moment States
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [creating, setCreating] = useState(false);

  // Comments drawer states
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  const imageInputRef = useRef(null);

  const fetchFeed = async (reset = false) => {
    setError('');
    const curPage = reset ? 0 : page;
    const offset = curPage * 8;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/feed?limit=8&offset=${offset}`);
      if (res.data.length < 8) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (reset) {
        setPosts(res.data);
        setPage(1);
      } else {
        setPosts((prev) => [...prev, ...res.data]);
        setPage(curPage + 1);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load moments feed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/trending`);
      setTrending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFeed(true);
    fetchTrending();
  }, []);

  // Listen to Socket.IO events to refresh feed
  useEffect(() => {
    if (!socket) return;

    const handleFeedUpdate = () => {
      // Fetch trending list and refresh feed if required, or let it sync
      fetchTrending();
    };

    socket.on('new_notification', handleFeedUpdate);

    return () => {
      socket.off('new_notification', handleFeedUpdate);
    };
  }, [socket]);

  const handlePostImagesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setPostImages((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeSelectedImage = (index) => {
    setPostImages((prev) => prev.filter((_, idx) => idx !== index));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && postImages.length === 0) return;

    setError('');
    setCreating(true);

    const formData = new FormData();
    formData.append('content', postContent);
    postImages.forEach((img) => {
      formData.append('images', img);
    });

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts`, formData);

      setPosts((prev) => [res.data, ...prev]);
      setPostContent('');
      setPostImages([]);
      setImagePreviews([]);
      setPostModalOpen(false);
      fetchTrending();
    } catch (err) {
      console.error(err);
      setError('Failed to post moment.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/${postId}/like`);
      
      // Update local posts list state
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const alreadyLiked = post.Likes.some((like) => like.userId === user.id);
            let updatedLikes = [];
            if (alreadyLiked) {
              updatedLikes = post.Likes.filter((like) => like.userId !== user.id);
            } else {
              updatedLikes = [...post.Likes, { userId: user.id, User: { id: user.id, name: user.name } }];
            }
            return { ...post, Likes: updatedLikes };
          }
          return post;
        })
      );
      fetchTrending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/${postId}/comment`, {
        comment: newCommentText,
      });

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return { ...post, Comments: [...post.Comments, res.data] };
          }
          return post;
        })
      );
      setNewCommentText('');
      setActiveCommentPostId(null);
      fetchTrending();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/comment/${commentId}`);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return { ...post, Comments: post.Comments.filter((c) => c.id !== commentId) };
          }
          return post;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this moment post permanently?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/posts/${postId}`);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      fetchTrending();
    } catch (err) {
      console.error(err);
    }
  };

  const parseImages = (jsonStr) => {
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="flex-1 h-screen overflow-hidden bg-darkBg flex flex-col lg:flex-row relative">
      
      {/* Feed Stream pane */}
      <div className="flex-1 h-full overflow-y-auto pr-1">
        {/* Cover photo banner */}
        <div className="h-64 bg-gradient-to-r from-red-950 via-burgundy-dark to-neutral-900 relative shadow-inner">
          <button
            onClick={() => setPostModalOpen(true)}
            className="absolute bottom-6 right-6 p-4 bg-burgundy hover:bg-burgundy-light text-secondary rounded-full shadow-lg shadow-burgundy/30 transition-all scale-100 hover:scale-105"
            title="Post a Moment"
          >
            <Camera size={22} />
          </button>
          
          <div className="absolute -bottom-10 right-6 flex items-end gap-4">
            <h3 className="text-white font-bold text-lg drop-shadow-md select-none">{user?.name}</h3>
            <img
              src={getAvatarUrl(user?.profileImage, user?.name)}
              alt="My Profile"
              className="w-20 h-20 rounded-2xl object-cover border-4 border-darkBg shadow-lg"
            />
          </div>
        </div>

        {/* Moments content wrapper */}
        <div className="max-w-2xl mx-auto px-4 pt-16 pb-12 flex flex-col gap-6">
          
          <StoriesBar />
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {posts.length === 0 && !loading ? (
            <div className="glass-panel rounded-3xl p-12 border border-neutral-800/80 text-center flex flex-col items-center">
              <Compass size={40} className="text-neutral-700 mb-3 animate-spin" />
              <p className="text-neutral-500 text-sm">No moments posted by your circle yet.</p>
              <button
                onClick={() => setPostModalOpen(true)}
                className="mt-4 bg-burgundy hover:bg-burgundy-light text-secondary font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all"
              >
                Post the first Moment
              </button>
            </div>
          ) : (
            <>
              {/* Post List */}
              {posts.map((post) => {
                const images = parseImages(post.imageUrl);
                const isMyPost = post.userId === user.id;
                const hasLiked = post.Likes.some((like) => like.userId === user.id);

                return (
                  <div key={post.id} className="glass-panel rounded-3xl p-6 border border-neutral-800/80 animate-slide-up flex gap-4">
                    {/* User profile picture */}
                    <img
                      src={getAvatarUrl(post.Author.profileImage, post.Author.name)}
                      alt={post.Author.name}
                      className="w-10 h-10 rounded-full object-cover border border-neutral-750 shrink-0"
                    />

                    {/* Right core card */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="text-burgundy-light font-bold text-sm">{post.Author.name}</h4>
                          {isMyPost && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1 text-neutral-600 hover:text-red-400 rounded-lg"
                              title="Delete Post"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="text-neutral-500 text-[10px] mt-0.5">{post.Author.bio}</p>
                      </div>

                      {post.content && (
                        <p className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      )}

                      {/* Moments Images Grid layouts */}
                      {images.length > 0 && (
                        <div
                          className={`grid gap-2 mt-1 ${
                            images.length === 1
                              ? 'grid-cols-1 max-w-sm'
                              : images.length === 2
                              ? 'grid-cols-2 max-w-md'
                              : 'grid-cols-3 max-w-lg'
                          }`}
                        >
                          {images.map((imgUrl, idx) => (
                            <img
                              key={idx}
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${imgUrl}`}
                              alt={`Moment Attachment ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded-xl border border-neutral-850 cursor-zoom-in hover:scale-[1.02] transition-transform duration-300"
                              onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${imgUrl}`, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      {/* Time display */}
                      <span className="text-[10px] text-neutral-600 block mt-1 font-sans">
                        {new Date(post.createdAt).toLocaleDateString()} at{' '}
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Moments Engagement toolbar */}
                      <div className="flex items-center gap-6 mt-2 border-t border-neutral-850 pt-3 text-neutral-500">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-2 text-xs font-semibold hover:text-red-400 transition-colors ${
                            hasLiked ? 'text-red-500' : ''
                          }`}
                        >
                          <Heart size={16} className={hasLiked ? 'fill-red-500' : ''} />
                          <span>Like</span>
                        </button>
                        <button
                          onClick={() =>
                            setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)
                          }
                          className="flex items-center gap-2 text-xs font-semibold hover:text-blue-400 transition-colors"
                        >
                          <MessageCircle size={16} />
                          <span>Comment ({post.Comments?.length || 0})</span>
                        </button>
                      </div>

                      {/* Likes display list */}
                      {post.Likes?.length > 0 && (
                        <div className="bg-neutral-950/35 rounded-xl p-3 text-xs text-neutral-400 flex items-start gap-2 border border-neutral-850 mt-1">
                          <Heart size={14} className="text-burgundy shrink-0 mt-0.5 fill-burgundy" />
                          <div className="flex-1 font-semibold text-neutral-300 leading-relaxed pr-2">
                            {post.Likes.map((l) => l.User?.name).join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Comments Drawer / List */}
                      {post.Comments?.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1 bg-neutral-950/20 rounded-2xl p-3 border border-neutral-850/60">
                          {post.Comments.map((c) => (
                            <div key={c.id} className="text-xs flex items-start justify-between gap-3 p-1">
                              <div className="flex-1">
                                <span className="text-burgundy font-semibold mr-2">{c.User?.name}:</span>
                                <span className="text-neutral-300">{c.comment}</span>
                              </div>
                              {(c.userId === user.id || isMyPost) && (
                                <button
                                  onClick={() => handleDeleteComment(post.id, c.id)}
                                  className="text-neutral-600 hover:text-red-400 transition-colors"
                                  title="Delete Comment"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Comment Form */}
                      {activeCommentPostId === post.id && (
                        <form
                          onSubmit={(e) => handleCommentSubmit(e, post.id)}
                          className="flex gap-2 mt-2 animate-slide-up"
                        >
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs text-white bg-neutral-900"
                            required
                          />
                          <button
                            type="submit"
                            className="bg-burgundy text-secondary px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-burgundy-light transition-all"
                          >
                            Send
                          </button>
                        </form>
                      )}

                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={() => fetchFeed()}
                  className="w-full py-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 font-semibold rounded-2xl transition-all text-xs"
                >
                  {loading ? 'Loading...' : 'Load Older Moments'}
                </button>
              )}
            </>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-burgundy border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Trending moments widget */}
      <div className="hidden lg:flex w-80 h-full border-l border-neutral-800/80 bg-deepBg p-6 flex-col gap-6 shrink-0">
        <div>
          <h3 className="text-white font-bold text-sm">Trending</h3>
          <p className="text-neutral-500 text-xs mt-0.5">Recent popular moments</p>
        </div>

        {trending.length === 0 ? (
          <p className="text-neutral-600 text-xs italic">No moments posted recently.</p>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {trending.map((post) => (
              <div key={post.id} className="glass-card rounded-xl p-3 border border-neutral-800/40 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <img
                    src={getAvatarUrl(post.Author.profileImage, post.Author.name)}
                    alt={post.Author.name}
                    className="w-6 h-6 rounded-full object-cover border border-neutral-800"
                  />
                  <h4 className="text-burgundy-light text-xs font-semibold truncate">{post.Author.name}</h4>
                </div>
                {post.content && (
                  <p className="text-neutral-400 text-xs truncate">{post.content}</p>
                )}
                <div className="flex gap-3 text-neutral-600 text-[10px] border-t border-neutral-850 pt-1.5 mt-0.5">
                  <span>❤️ {post.Likes?.length || 0}</span>
                  <span>💬 {post.Comments?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MOMENT MODAL */}
      {postModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-neutral-800 shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh]">
            <button
              onClick={() => setPostModalOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-xl"
            >
              <X size={18} />
            </button>

            <h3 className="text-white font-bold text-lg mb-1">Create Moment</h3>
            <p className="text-neutral-500 text-xs mb-6">Share what's on your mind with your WeChat circle</p>

            <form onSubmit={handleCreatePost} className="flex flex-col gap-5 overflow-y-auto pr-1">
              <textarea
                placeholder="Share your thoughts..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="w-full bg-neutral-950/60 p-4 rounded-2xl text-sm text-white outline-none border border-neutral-850/80 min-h-[120px] focus:border-burgundy transition-all"
                required={postImages.length === 0}
              />

              {/* Photo selector */}
              <div>
                <label className="block text-xs text-neutral-500 font-semibold mb-2 uppercase tracking-wide">Add Photos</label>
                <div className="flex flex-wrap gap-2">
                  {/* Selected images preview */}
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-neutral-800">
                      <img src={preview} alt="Selected" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {/* Add photo card button */}
                  {imagePreviews.length < 9 && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border border-dashed border-neutral-800 hover:border-burgundy/50 text-neutral-500 hover:text-neutral-300 flex items-center justify-center transition-all bg-neutral-900/40"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={imageInputRef}
                    className="hidden"
                    onChange={handlePostImagesChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || (!postContent.trim() && postImages.length === 0)}
                className="w-full py-3.5 bg-burgundy hover:bg-burgundy-light disabled:opacity-50 text-secondary font-semibold rounded-xl shadow-lg shadow-burgundy/25 transition-all text-sm mt-3"
              >
                {creating ? 'Sharing Moment...' : 'Post Moment'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FeedPage;
