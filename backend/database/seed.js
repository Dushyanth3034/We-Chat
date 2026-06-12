const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const {
  sequelize,
  User,
  Friend,
  Chat,
  Group,
  GroupMember,
  Post,
  Like,
  Comment,
  QRCodeFriend,
  Song,
  Story,
} = require('../models');

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Force sync tables to clear existing data and set up fresh tables
    await sequelize.sync({ force: true });
    console.log('Database synced (force: true).');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Users
    const usersData = [
      { name: 'Alice Smith', email: 'alice@wechat.com', password: hashedPassword, bio: 'Exploring Paris and coding React apps. ✈️💻' },
      { name: 'Bob Johnson', email: 'bob@wechat.com', password: hashedPassword, bio: 'Nature lover & backend developer. 🌲🚀' },
      { name: 'Charlie Brown', email: 'charlie@wechat.com', password: hashedPassword, bio: 'Always learning new things! 📚✨' },
      { name: 'David Miller', email: 'david@wechat.com', password: hashedPassword, bio: 'Work hard, play hard.' },
      { name: 'Eve Wilson', email: 'eve@wechat.com', password: hashedPassword, bio: 'Art and design enthusiast 🎨' },
    ];

    const users = [];
    for (const uData of usersData) {
      const user = await User.create(uData);
      
      // Generate QR Code containing unique user identifier and email
      const qrData = JSON.stringify({ userId: user.id, email: user.email, name: user.name });
      const qrCodeDataUrl = await QRCode.toDataURL(qrData);
      
      // Update User with QR Code URL
      user.qrCode = qrCodeDataUrl;
      await user.save();

      // Create mapping in QRCodeFriend
      await QRCodeFriend.create({
        qrCode: qrData,
        userId: user.id,
      });

      users.push(user);
    }
    console.log(`Created ${users.length} users with unique QR codes.`);

    // Extract users
    const [alice, bob, charlie, david, eve] = users;

    // Establish Friendships
    // Alice <-> Bob (Accepted)
    await Friend.create({ senderId: alice.id, receiverId: bob.id, status: 'accepted' });
    // Alice <-> Charlie (Accepted)
    await Friend.create({ senderId: alice.id, receiverId: charlie.id, status: 'accepted' });
    // Bob <-> Charlie (Accepted)
    await Friend.create({ senderId: bob.id, receiverId: charlie.id, status: 'accepted' });
    // David -> Alice (Pending Request)
    await Friend.create({ senderId: david.id, receiverId: alice.id, status: 'pending' });
    // Eve -> Bob (Pending Request)
    await Friend.create({ senderId: eve.id, receiverId: bob.id, status: 'pending' });

    console.log('Friendships established.');

    // Create Moments Posts
    const post1 = await Post.create({
      userId: alice.id,
      content: 'Beautiful evening walking around Paris! 🌅🇫🇷 #travel #photography',
      imageUrl: JSON.stringify(['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop']),
    });

    const post2 = await Post.create({
      userId: bob.id,
      content: 'Completed the 15km mountain hike this morning! The view from the top is spectacular 🌲🥾🏔️',
      imageUrl: JSON.stringify(['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop']),
    });

    const post3 = await Post.create({
      userId: charlie.id,
      content: 'Learning Sequelize associations today. Database engineering is fascinating!',
      imageUrl: JSON.stringify([]),
    });

    console.log('Moments posts created.');

    // Add Likes
    await Like.create({ userId: bob.id, postId: post1.id });
    await Like.create({ userId: charlie.id, postId: post1.id });
    await Like.create({ userId: alice.id, postId: post2.id });

    console.log('Likes added.');

    // Add Comments
    await Comment.create({ userId: charlie.id, postId: post1.id, comment: 'Gorgeous view, Alice! Enjoy!' });
    await Comment.create({ userId: bob.id, postId: post1.id, comment: 'Nice! Have a safe trip!' });
    await Comment.create({ userId: alice.id, postId: post2.id, comment: 'Wow, Bob! That is impressive. Where is this?' });
    await Comment.create({ userId: bob.id, postId: post2.id, comment: 'Thanks Alice! It is Mount Mitchell.' });

    console.log('Comments added.');

    // Create a Group Chat: "Weekend Explorers"
    const group = await Group.create({
      groupName: 'Weekend Explorers',
      groupImage: '',
      createdBy: alice.id,
    });

    // Add Members (Alice, Bob, Charlie)
    await GroupMember.create({ groupId: group.id, userId: alice.id });
    await GroupMember.create({ groupId: group.id, userId: bob.id });
    await GroupMember.create({ groupId: group.id, userId: charlie.id });

    console.log('Group chat "Weekend Explorers" created with members.');

    // Create Direct Messages (Alice <-> Bob)
    await Chat.create({ senderId: alice.id, receiverId: bob.id, message: 'Hey Bob! Are you free this weekend?', messageType: 'text', isSeen: true });
    await Chat.create({ senderId: bob.id, receiverId: alice.id, message: 'Hey Alice! Yes, planning to go hiking. How about you?', messageType: 'text', isSeen: true });
    await Chat.create({ senderId: alice.id, receiverId: bob.id, message: 'Sounds fun! I created a group chat for us and Charlie to plan something.', messageType: 'text', isSeen: false });

    console.log('Direct messages created.');

    // Seed Background Music Songs
    const songsData = [
      {
        title: 'Inspiring Acoustic',
        artist: 'SoundHelix',
        coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        duration: 372,
      },
      {
        title: 'Chill Hip Hop',
        artist: 'SoundHelix',
        coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        duration: 423,
      },
      {
        title: 'Upbeat Synth',
        artist: 'SoundHelix',
        coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        duration: 302,
      },
      {
        title: 'Relaxing Piano',
        artist: 'SoundHelix',
        coverImage: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=120&auto=format&fit=crop',
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        duration: 502,
      },
    ];

    const songs = [];
    for (const songData of songsData) {
      const song = await Song.create(songData);
      songs.push(song);
    }
    console.log(`Seeded ${songs.length} background songs.`);

    // Seed Stories
    const story1 = await Story.create({
      userId: alice.id,
      mediaType: 'text',
      text: 'Having a great week coding WeChat! 🚀 Burgundy style all the way.',
      backgroundColor: '#800020',
      musicId: songs[0].id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const story2 = await Story.create({
      userId: bob.id,
      mediaType: 'text',
      text: 'Early morning hike vibes 🌲. Ambient sound is perfect.',
      backgroundColor: '#2D2D2D',
      musicId: songs[1].id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log('Seeded initial user stories.');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Only run directly
if (require.main === module) {
  seed();
}
