import React, { useState } from 'react';

const ReactionBadge = ({ reactions = [], onToggle }) => {
  const [hoveredEmoji, setHoveredEmoji] = useState(null);

  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  // Map of emoji -> array of reactions
  const groups = {};
  reactions.forEach((r) => {
    if (!groups[r.reaction]) {
      groups[r.reaction] = [];
    }
    groups[r.reaction].push(r);
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 select-none relative z-10">
      {Object.keys(groups).map((emoji) => {
        const list = groups[emoji];
        const names = list.map((r) => r.User?.name || 'User').join(', ');
        
        return (
          <div
            key={emoji}
            className="relative"
            onMouseEnter={() => setHoveredEmoji(emoji)}
            onMouseLeave={() => setHoveredEmoji(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onToggle) onToggle(emoji);
              }}
              className="bg-neutral-850 hover:bg-neutral-800 text-[10px] text-neutral-300 font-semibold px-2 py-1 rounded-full border border-neutral-800/80 flex items-center gap-1 shadow-sm transition-all duration-200"
            >
              <span>{emoji}</span>
              <span className="font-mono text-neutral-400">{list.length}</span>
            </button>

            {/* Hover Tooltip Overlay showing who reacted */}
            {hoveredEmoji === emoji && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-950/95 border border-neutral-800 text-[9px] text-white px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-30 font-bold uppercase tracking-wider animate-scale-up">
                {names}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReactionBadge;
