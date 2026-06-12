export const MOCK_FRIENDS = [
  {
    id: "alex-id",
    name: "Alex Johnson",
    email: "alex@demo.local",
    bio: "Senior Product Designer | Figma wizard 🎨",
    profileImage: null,
    status: "online"
  },
  {
    id: "emma-id",
    name: "Emma Wilson",
    email: "emma@demo.local",
    bio: "Frontend Engineer | Passionate about CSS & React ⚛️",
    profileImage: null,
    status: "online"
  },
  {
    id: "john-id",
    name: "John Carter",
    email: "john@demo.local",
    bio: "WebRTC Engineer | Video & Audio Streaming Specialist 📞",
    profileImage: null,
    status: "online"
  },
  {
    id: "sophia-id",
    name: "Sophia Brown",
    email: "sophia@demo.local",
    bio: "Full Stack Developer | Coffee enthusiast & dog mom 🐶☕",
    profileImage: null,
    status: "offline"
  },
  {
    id: "david-id",
    name: "David Lee",
    email: "david@demo.local",
    bio: "Security Analyst | DevSecOps advocate 🔒",
    profileImage: null,
    status: "online"
  },
  {
    id: "alice-id",
    name: "Alice Smith",
    email: "alice@wechat.com",
    bio: "UX Designer | Design Thinker | Coffee Lover ☕",
    profileImage: null,
    status: "online"
  },
  {
    id: "bob-id",
    name: "Bob Johnson",
    email: "bob@wechat.com",
    bio: "Backend Engineer | Node.js & WebRTC enthusiast 💻",
    profileImage: null,
    status: "online"
  },
  {
    id: "charlie-id",
    name: "Charlie Brown",
    email: "charlie@wechat.com",
    bio: "Product Manager | Building the future of messaging 🚀",
    profileImage: null,
    status: "offline"
  },
  {
    id: "sarah-id",
    name: "Sarah Jenkins",
    email: "sarah@demo.local",
    bio: "Developer Advocate | Open source contributor 🌟",
    profileImage: null,
    status: "online"
  },
  {
    id: "liam-id",
    name: "Liam Davis",
    email: "liam@demo.local",
    bio: "Systems Architect | Kubernetes & Docker lover 🐳",
    profileImage: null,
    status: "offline"
  }
];

export const MOCK_GROUPS = [
  {
    id: "group-1",
    groupName: "WeChat Dev Team",
    groupImage: null,
    Members: [
      { id: 1, User: { id: 101, name: "Alice Smith" } },
      { id: 2, User: { id: 102, name: "Bob Johnson" } },
      { id: 3, User: { id: "guest-user", name: "Guest User" } },
      { id: 4, User: { id: "alex-id", name: "Alex Johnson" } },
      { id: 5, User: { id: "emma-id", name: "Emma Wilson" } }
    ]
  },
  {
    id: "group-2",
    groupName: "Weekend Hangout",
    groupImage: null,
    Members: [
      { id: 1, User: { id: 101, name: "Alice Smith" } },
      { id: 2, User: { id: "charlie-id", name: "Charlie Brown" } },
      { id: 3, User: { id: "guest-user", name: "Guest User" } },
      { id: 4, User: { id: "sophia-id", name: "Sophia Brown" } }
    ]
  }
];

export const MOCK_DMS = {
  "alex-id": [
    {
      id: "msg-alex1",
      senderId: "alex-id",
      message: "Hi! Welcome to WeChat. I designed some templates for the Moments wall.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      Sender: { name: "Alex Johnson" },
      Reactions: [
        { id: 1, reaction: "💚", User: { name: "Guest User" } }
      ]
    },
    {
      id: "msg-alex2",
      senderId: "guest-user",
      message: "Wow, Alex! Those mockups look incredibly neat.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    },
    {
      id: "msg-alex3",
      senderId: "alex-id",
      message: "Appreciate it! Check out the settings page too. We support dynamic rebranding there.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      Sender: { name: "Alex Johnson" },
      ReplyLink: {
        ParentMessage: {
          id: "msg-alex2",
          message: "Wow, Alex! Those mockups look incredibly neat.",
          Sender: { name: "Guest User" }
        }
      }
    }
  ],
  "emma-id": [
    {
      id: "msg-emma1",
      senderId: "emma-id",
      message: "Hey guest, check out the story viewer. It supports background music and emojis!",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      Sender: { name: "Emma Wilson" }
    },
    {
      id: "msg-emma2",
      senderId: "guest-user",
      message: "Just tried it, it's really cool!",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    },
    {
      id: "msg-emma3",
      senderId: "emma-id",
      message: "Nice! Let me know if you run into any responsiveness bugs.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      Sender: { name: "Emma Wilson" },
      ForwardLink: true
    }
  ],
  "john-id": [
    {
      id: "msg-john1",
      senderId: "john-id",
      message: "Hey, do you want to test group call? I can invite you to the dev team room.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      Sender: { name: "John Carter" }
    },
    {
      id: "msg-john2",
      senderId: "guest-user",
      message: "Yes sure, let me see.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    },
    {
      id: "msg-john3",
      senderId: "john-id",
      message: "[Call Log]: audio call finished | completed | 120",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      Sender: { name: "John Carter" }
    }
  ],
  "sophia-id": [
    {
      id: "msg-sophia1",
      senderId: "sophia-id",
      message: "I sent you a quick voice memo from my morning coffee run. Check it out!",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      Sender: { name: "Sophia Brown" }
    },
    {
      id: "msg-sophia2",
      senderId: "sophia-id",
      message: "[Voice Note]||3",
      messageType: "voice",
      fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      createdAt: new Date(Date.now() - 3600000 * 5.9).toISOString(),
      Sender: { name: "Sophia Brown" }
    },
    {
      id: "msg-sophia3",
      senderId: "guest-user",
      message: "Love the voice clarity! E2E encryption is solid.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    }
  ],
  "david-id": [
    {
      id: "msg-david1",
      senderId: "david-id",
      message: "All chat databases are secured. E2E uses RSA and AES-GCM.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      Sender: { name: "David Lee" }
    },
    {
      id: "msg-david2",
      senderId: "guest-user",
      message: "That is highly secure, David. Good job!",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    }
  ],
  "alice-id": [
    {
      id: "msg-d1",
      senderId: "alice-id",
      message: "Hey! Welcome to the WeChat Demo. How do you like the mobile UI?",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      Sender: { name: "Alice Smith" }
    },
    {
      id: "msg-d2",
      senderId: "guest-user",
      message: "It looks incredible! The animations are super smooth.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    },
    {
      id: "msg-d3",
      senderId: "alice-id",
      message: "Thanks! Feel free to explore the Moments feed and stories.",
      messageType: "text",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      Sender: { name: "Alice Smith" }
    }
  ],
  "bob-id": [
    {
      id: "msg-db1",
      senderId: "bob-id",
      message: "Hey there! I configured WebRTC mesh calling for groups.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      Sender: { name: "Bob Johnson" }
    },
    {
      id: "msg-db2",
      senderId: "bob-id",
      message: "[Call Log]: audio call finished | completed | 42",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      Sender: { name: "Bob Johnson" }
    },
    {
      id: "msg-db3",
      senderId: "guest-user",
      message: "Nice, the mesh scaling works beautifully on mobile viewports.",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 2.2).toISOString(),
      isSeen: true,
      Sender: { name: "Guest User" }
    }
  ]
};

export const MOCK_GROUP_MESSAGES = {
  "group-1": [
    {
      id: "gmsg-1",
      senderId: "bob-id",
      message: "Did everyone review the E2E encryption scheme?",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      Sender: { name: "Bob Johnson" }
    },
    {
      id: "gmsg-2",
      senderId: "alice-id",
      message: "Yes, verified client-side RSA/AES key derivation. Works perfectly!",
      messageType: "text",
      createdAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      Sender: { name: "Alice Smith" }
    }
  ],
  "group-2": []
};

export const MOCK_FEED_POSTS = [
  {
    id: "post-1",
    content: "Just launched the WeChat rebrand with custom HSL CSS variables. Love the vibrant lime green accents! 💚🌱 Check out the glowing border animations.",
    imageUrl: JSON.stringify(["https://images.unsplash.com/photo-1551434678-e076c223a692?w=800"]),
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    Likes: [{ id: 1, userId: "alice-id" }, { id: 2, userId: "alex-id" }],
    Comments: [
      {
        id: "c-1",
        content: "Outstanding visual contrast! Meets WCAG AA requirements.",
        User: { name: "Alice Smith" }
      },
      {
        id: "c-2",
        content: "The custom scrollbars are a nice touch too.",
        User: { name: "Alex Johnson" }
      }
    ],
    Author: {
      id: "bob-id",
      name: "Bob Johnson",
      profileImage: null,
      bio: "Backend Engineer | Node.js & WebRTC enthusiast 💻"
    },
    User: {
      id: "bob-id",
      name: "Bob Johnson",
      profileImage: null,
      bio: "Backend Engineer | Node.js & WebRTC enthusiast 💻"
    }
  },
  {
    id: "post-2",
    content: "Sunsets in the park are best enjoyed with some good tunes. 🌅🎶 Check out my story with the new Audius integration! Playing some premium Chill Lo-Fi.",
    imageUrl: JSON.stringify(["https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800"]),
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    Likes: [{ id: 3, userId: "emma-id" }],
    Comments: [
      {
        id: "c-3",
        content: "Super chill vibe. Let's hang out this weekend!",
        User: { name: "Emma Wilson" }
      }
    ],
    Author: {
      id: "alice-id",
      name: "Alice Smith",
      profileImage: null,
      bio: "UX Designer | Design Thinker | Coffee Lover ☕"
    },
    User: {
      id: "alice-id",
      name: "Alice Smith",
      profileImage: null,
      bio: "UX Designer | Design Thinker | Coffee Lover ☕"
    }
  },
  {
    id: "post-3",
    content: "Cozy office setups for late-night programming sessions. Dual monitor config is a game-changer! 💻⌨️🚀",
    imageUrl: JSON.stringify(["https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800"]),
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    Likes: [{ id: 4, userId: "david-id" }, { id: 5, userId: "sophia-id" }],
    Comments: [],
    Author: {
      id: "emma-id",
      name: "Emma Wilson",
      profileImage: null,
      bio: "Frontend Engineer | Passionate about CSS & React ⚛️"
    },
    User: {
      id: "emma-id",
      name: "Emma Wilson",
      profileImage: null,
      bio: "Frontend Engineer | Passionate about CSS & React ⚛️"
    }
  },
  {
    id: "post-4",
    content: "Fresh coffee beans roasted to perfection. Starting the day right! ☕🌱✨",
    imageUrl: JSON.stringify(["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800"]),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    Likes: [],
    Comments: [],
    Author: {
      id: "sophia-id",
      name: "Sophia Brown",
      profileImage: null,
      bio: "Full Stack Developer | Coffee enthusiast & dog mom 🐶☕"
    },
    User: {
      id: "sophia-id",
      name: "Sophia Brown",
      profileImage: null,
      bio: "Full Stack Developer | Coffee enthusiast & dog mom 🐶☕"
    }
  }
];

export const MOCK_STORIES = [
  {
    id: "story-s1",
    text: "Reviewing the mobile responsiveness updates! 📱✨",
    backgroundColor: "linear-gradient(135deg, #4c0519 0%, #800020 50%, #0c0a09 100%)",
    fileUrl: null,
    fileType: "text",
    createdAt: new Date().toISOString(),
    User: {
      id: "alice-id",
      name: "Alice Smith",
      profileImage: null
    },
    Views: [
      { id: 1, User: { id: "bob-id", name: "Bob Johnson" }, viewedAt: new Date(Date.now() - 600000).toISOString() },
      { id: 2, User: { id: "alex-id", name: "Alex Johnson" }, viewedAt: new Date(Date.now() - 300000).toISOString() }
    ],
    StoryViews: [
      { id: 1, User: { id: "bob-id", name: "Bob Johnson" }, viewedAt: new Date(Date.now() - 600000).toISOString() },
      { id: 2, User: { id: "alex-id", name: "Alex Johnson" }, viewedAt: new Date(Date.now() - 300000).toISOString() }
    ],
    Reactions: [
      { id: 1, reactionType: "❤️", userId: "bob-id", User: { id: "bob-id", name: "Bob Johnson" } }
    ],
    StoryReactions: [
      { id: 1, reactionType: "❤️", User: { id: "bob-id", name: "Bob Johnson" } }
    ],
    Replies: [
      { id: 1, message: "Clean UI!", Sender: { id: "alex-id", name: "Alex Johnson" }, createdAt: new Date(Date.now() - 300000).toISOString() }
    ],
    StoryReplies: [
      { id: 1, message: "Clean UI!", User: { id: "alex-id", name: "Alex Johnson" } }
    ],
    Music: {
      id: "music-1",
      title: "Lo-Fi Coffee Vibes",
      artist: "Chill Beats Collective",
      coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    }
  },
  {
    id: "story-s2",
    text: "Building WebRTC mesh network calling overlays 📞💻",
    backgroundColor: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #030712 100%)",
    fileUrl: null,
    fileType: "text",
    createdAt: new Date().toISOString(),
    User: {
      id: "bob-id",
      name: "Bob Johnson",
      profileImage: null
    },
    Views: [
      { id: 1, User: { id: "alice-id", name: "Alice Smith" }, viewedAt: new Date(Date.now() - 900000).toISOString() }
    ],
    StoryViews: [
      { id: 1, User: { id: "alice-id", name: "Alice Smith" }, viewedAt: new Date(Date.now() - 900000).toISOString() }
    ],
    Reactions: [],
    StoryReactions: [],
    Replies: [],
    StoryReplies: []
  },
  {
    id: "story-s3",
    text: "Enjoying the new Lime & Charcoal color scheme! 💚🖤",
    backgroundColor: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #052e16 100%)",
    fileUrl: null,
    fileType: "text",
    createdAt: new Date().toISOString(),
    User: {
      id: "alex-id",
      name: "Alex Johnson",
      profileImage: null
    },
    Views: [],
    StoryViews: [],
    Reactions: [],
    StoryReactions: [],
    Replies: [],
    StoryReplies: []
  },
  {
    id: "story-s4",
    text: "Late night refactoring... dynamic imports are sweet! 🚀🌙",
    backgroundColor: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e3a8a 100%)",
    fileUrl: null,
    fileType: "text",
    createdAt: new Date().toISOString(),
    User: {
      id: "emma-id",
      name: "Emma Wilson",
      profileImage: null
    },
    Views: [],
    StoryViews: [],
    Reactions: [],
    StoryReactions: [],
    Replies: [],
    StoryReplies: []
  },
  {
    id: "story-s5",
    text: "Audius API search caching works like a charm! 🎶✨",
    backgroundColor: "linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)",
    fileUrl: null,
    fileType: "text",
    createdAt: new Date().toISOString(),
    User: {
      id: "sophia-id",
      name: "Sophia Brown",
      profileImage: null
    },
    Views: [
      { id: 1, User: { id: "alex-id", name: "Alex Johnson" }, viewedAt: new Date(Date.now() - 100000).toISOString() }
    ],
    StoryViews: [
      { id: 1, User: { id: "alex-id", name: "Alex Johnson" }, viewedAt: new Date(Date.now() - 100000).toISOString() }
    ],
    Reactions: [
      { id: 1, reactionType: "🔥", userId: "alex-id", User: { id: "alex-id", name: "Alex Johnson" } }
    ],
    StoryReactions: [
      { id: 1, reactionType: "🔥", User: { id: "alex-id", name: "Alex Johnson" } }
    ],
    Replies: [],
    StoryReplies: [],
    Music: {
      id: "music-2",
      title: "Chill Beats Synth",
      artist: "Lo-Fi Producers Inc.",
      coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    }
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "notif-1",
    type: "friend_request",
    isRead: false,
    message: "Alex Johnson sent you a friend request.",
    createdAt: new Date(Date.now() - 600000).toISOString(),
    Sender: { name: "Alex Johnson" }
  },
  {
    id: "notif-2",
    type: "like",
    isRead: false,
    message: "Alice Smith liked your Moments post.",
    createdAt: new Date(Date.now() - 1200000).toISOString(),
    Sender: { name: "Alice Smith" },
    Post: { content: "Just launched the WeChat rebrand with custom HSL CSS variables..." }
  },
  {
    id: "notif-3",
    type: "comment",
    isRead: true,
    message: "Bob Johnson commented on your Moments post: 'Outstanding visual contrast...'",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    Sender: { name: "Bob Johnson" },
    Post: { content: "Sunsets in the park are best enjoyed..." }
  },
  {
    id: "notif-4",
    type: "story_reaction",
    isRead: false,
    message: "Sophia Brown reacted with ❤️ to your story.",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    Sender: { name: "Sophia Brown" }
  },
  {
    id: "notif-5",
    type: "message_reaction",
    isRead: true,
    message: "Emma Wilson reacted with 😂 to your chat message.",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    Sender: { name: "Emma Wilson" }
  },
  {
    id: "notif-6",
    type: "story_view",
    isRead: true,
    message: "David Lee viewed your story.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    Sender: { name: "David Lee" }
  },
  {
    id: "notif-7",
    type: "new_follower",
    isRead: false,
    message: "John Carter started following you.",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    Sender: { name: "John Carter" }
  },
  {
    id: "notif-8",
    type: "friend_accepted",
    isRead: true,
    message: "Sarah Jenkins accepted your friend request.",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    Sender: { name: "Sarah Jenkins" }
  },
  {
    id: "notif-9",
    type: "like",
    isRead: true,
    message: "Liam Davis liked your Moments post.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    Sender: { name: "Liam Davis" },
    Post: { content: "Just launched the WeChat rebrand with custom HSL CSS variables..." }
  },
  {
    id: "notif-10",
    type: "comment",
    isRead: true,
    message: "Charlie Brown commented on your post: 'Nice custom scrollbars!'",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    Sender: { name: "Charlie Brown" },
    Post: { content: "Just launched the WeChat rebrand with custom HSL CSS variables..." }
  }
];

export const MOCK_FRIEND_REQUESTS = [
  {
    id: "req-1",
    Sender: {
      id: "sarah-id",
      name: "Sarah Jenkins",
      bio: "Developer Advocate | Open source contributor 🌟",
      profileImage: null
    }
  },
  {
    id: "req-2",
    Sender: {
      id: "liam-id",
      name: "Liam Davis",
      bio: "Systems Architect | Kubernetes & Docker lover 🐳",
      profileImage: null
    }
  }
];

export const MOCK_SUGGESTIONS = [
  {
    id: "alice-id",
    name: "Alice Smith",
    bio: "UX Designer | Design Thinker | Coffee Lover ☕",
    profileImage: null
  },
  {
    id: "bob-id",
    name: "Bob Johnson",
    bio: "Backend Engineer | Node.js & WebRTC enthusiast 💻",
    profileImage: null
  },
  {
    id: "charlie-id",
    name: "Charlie Brown",
    bio: "Product Manager | PM building the future of messaging 🚀",
    profileImage: null
  }
];
