import React from 'react';

const REACTION_EMOJIS = ['❤️', '👍', '👎', '😂', '😮', '😢', '🔥', '🎉'];

const ReactionSelector = ({ onSelect, onClose, direction = 'above', isMe = false }) => {
  const positionClass = direction === 'above'
    ? `absolute bottom-full mb-3 ${isMe ? 'right-0' : 'left-0'}`
    : `absolute top-full mt-3 ${isMe ? 'right-0' : 'left-0'}`;

  return (
    <div 
      className={`${positionClass} bg-[#18181B] border border-[#27272A] rounded-full py-2 px-4 flex items-center gap-2.5 shadow-2xl z-30 animate-scale-up select-none whitespace-nowrap`}
      role="menu"
      aria-label="Message reaction selector"
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
            if (onClose) onClose();
          }}
          className="text-lg hover:scale-130 active:scale-95 transition-transform duration-200 cursor-pointer p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionSelector;
export { REACTION_EMOJIS };
