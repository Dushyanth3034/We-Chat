import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_STORIES } from '../utils/demoData';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';
import { getAvatarUrl } from '../utils/avatar';

const StoriesBar = () => {
  const { user } = useAuth();
  const [userGroups, setUserGroups] = useState([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeUserIndex, setActiveUserIndex] = useState(0);

  const fetchStories = async () => {
    if (user?.role === 'guest') {
      const grouped = [];
      MOCK_STORIES.forEach(story => {
        let group = grouped.find(g => g.user.id === story.User.id);
        if (!group) {
          group = {
            user: story.User,
            stories: [],
            hasUnread: true
          };
          grouped.push(group);
        }
        group.stories.push(story);
      });
      setUserGroups(grouped);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stories`);
      setUserGroups(res.data);
    } catch (err) {
      console.error('Failed to retrieve stories:', err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [user]);

  // Check if own user has stories
  const ownGroup = userGroups.find((g) => g.user.id === user.id);
  const friendsGroups = userGroups.filter((g) => g.user.id !== user.id);

  const handleOpenViewer = (idx) => {
    setActiveUserIndex(idx);
    setViewerOpen(true);
  };

  return (
    <div className="w-full shrink-0 py-4 px-1 select-none">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide py-1 items-center">
        {/* Own User Story item bubble */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 relative">
          <div className="relative group">
            {ownGroup ? (
              // Own active story template
              <button
                onClick={() => handleOpenViewer(userGroups.findIndex((g) => g.user.id === user.id))}
                className={`w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                  ownGroup.hasUnread
                    ? 'bg-gradient-to-tr from-burgundy via-neutral-900 to-burgundy-light'
                    : 'bg-neutral-800'
                }`}
              >
                <img
                  src={getAvatarUrl(user?.profileImage, user?.name)}
                  alt="My Avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-darkBg"
                />
              </button>
            ) : (
              // Empty own story (Add button) template
              <button
                onClick={() => setCreatorOpen(true)}
                className="w-14 h-14 rounded-full border border-dashed border-neutral-850 hover:border-burgundy/50 bg-neutral-900/40 hover:bg-neutral-900 flex items-center justify-center transition-all p-0.5 group-hover:scale-105"
              >
                <img
                  src={getAvatarUrl(user?.profileImage, user?.name)}
                  alt="My Avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-darkBg"
                />
                <span className="absolute bottom-0 right-0 bg-burgundy border border-darkBg text-secondary rounded-full p-0.5 shadow-md">
                  <Plus size={10} />
                </span>
              </button>
            )}
          </div>
          <span className="text-[10px] text-neutral-500 font-semibold truncate max-w-[64px]">My Story</span>
        </div>

        {/* Friends Stories */}
        {friendsGroups.map((group) => {
          const originalIdx = userGroups.findIndex((g) => g.user.id === group.user.id);
          return (
            <div key={group.user.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleOpenViewer(originalIdx)}
                className={`w-14 h-14 rounded-full p-0.5 transition-transform hover:scale-105 ${
                  group.hasUnread
                    ? 'bg-gradient-to-tr from-burgundy via-neutral-900 to-burgundy-light'
                    : 'bg-neutral-800'
                }`}
              >
                <img
                  src={getAvatarUrl(group.user.profileImage, group.user.name)}
                  alt={group.user.name}
                  className="w-full h-full rounded-full object-cover border-2 border-darkBg"
                />
              </button>
              <span className="text-[10px] text-neutral-500 font-semibold truncate max-w-[64px]">{group.user.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Story Creator Modal */}
      {creatorOpen && (
        <StoryCreator
          onClose={() => setCreatorOpen(false)}
          onPublishSuccess={() => {
            setCreatorOpen(false);
            fetchStories();
          }}
        />
      )}

      {/* Story Viewer Modal */}
      {viewerOpen && (
        <StoryViewer
          userStoriesList={userGroups}
          initialUserIndex={activeUserIndex}
          onClose={() => setViewerOpen(false)}
          onRefreshStories={() => {
            fetchStories();
          }}
        />
      )}
    </div>
  );
};

export default StoriesBar;
