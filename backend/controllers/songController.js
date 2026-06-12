const { Song, Story } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// In-memory caching for Audius searches
const searchCache = new Map();
const trendingCache = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let activeDiscoveryNode = 'https://api.audius.co/v1';

// Dynamically resolve healthy Audius discovery host
const resolveDiscoveryNode = async () => {
  try {
    const res = await axios.get('https://api.audius.co', { timeout: 3000 });
    if (res.data && res.data.data && res.data.data.length > 0) {
      // Pick first active host
      activeDiscoveryNode = `${res.data.data[0]}/v1`;
    }
  } catch (err) {
    console.error('Error resolving Audius host, fallback to default:', err.message);
    activeDiscoveryNode = 'https://api.audius.co/v1';
  }
  return activeDiscoveryNode;
};

const searchSongs = async (req, res) => {
  try {
    const { query, page } = req.query;
    const limit = 20;
    const currentPage = parseInt(page, 10) || 1;
    const offset = (currentPage - 1) * limit;

    if (!query || !query.trim()) {
      return res.status(200).json([]);
    }

    const cacheKey = `${query.trim().toLowerCase()}_p${currentPage}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const node = await resolveDiscoveryNode();
    const audiusUrl = `${node}/tracks/search`;

    const response = await axios.get(audiusUrl, {
      params: {
        query: query.trim(),
        limit,
        offset,
        app_name: 'DushuChat',
      },
      timeout: 5000,
    });

    const tracks = response.data.data || [];
    const mappedSongs = tracks.map((track) => ({
      audiusTrackId: track.id,
      title: track.title,
      artist: track.user?.name || 'Unknown Artist',
      coverImage: track.artwork?.['150x150'] || track.artwork?.['480x480'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
      audioUrl: `${node}/tracks/${track.id}/stream?app_name=DushuChat`,
      duration: track.duration,
    }));

    // Save in Cache
    searchCache.set(cacheKey, {
      data: mappedSongs,
      timestamp: Date.now(),
    });

    return res.status(200).json(mappedSongs);
  } catch (error) {
    console.error('Search songs error, falling back to local DB:', error.message);
    // Graceful fallback to existing SQL records
    try {
      const localSongs = await Song.findAll({ limit: 20 });
      return res.status(200).json(localSongs);
    } catch (dbErr) {
      return res.status(500).json({ message: 'Failed to retrieve tracks from Audius and local DB.' });
    }
  }
};

const getTrendingSongs = async (req, res) => {
  try {
    if (trendingCache.data && Date.now() - trendingCache.timestamp < CACHE_TTL) {
      return res.status(200).json(trendingCache.data);
    }

    const node = await resolveDiscoveryNode();
    const audiusUrl = `${node}/tracks/trending`;

    const response = await axios.get(audiusUrl, {
      params: {
        limit: 10,
        app_name: 'DushuChat',
      },
      timeout: 5000,
    });

    const tracks = response.data.data || [];
    const mappedSongs = tracks.map((track) => ({
      audiusTrackId: track.id,
      title: track.title,
      artist: track.user?.name || 'Unknown Artist',
      coverImage: track.artwork?.['150x150'] || track.artwork?.['480x480'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80',
      audioUrl: `${node}/tracks/${track.id}/stream?app_name=DushuChat`,
      duration: track.duration,
    }));

    trendingCache.data = mappedSongs;
    trendingCache.timestamp = Date.now();

    return res.status(200).json(mappedSongs);
  } catch (error) {
    console.error('Get trending songs error, falling back to local DB:', error.message);
    try {
      const localSongs = await Song.findAll({ limit: 10 });
      return res.status(200).json(localSongs);
    } catch (dbErr) {
      return res.status(200).json([]);
    }
  }
};

const getRecentlyUsedSongs = async (req, res) => {
  try {
    const recentStories = await Story.findAll({
      where: {
        userId: req.user.id,
        musicId: { [Op.ne]: null },
      },
      include: [
        { model: Song, as: 'Music' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    // Unique filter
    const songMap = new Map();
    recentStories.forEach(s => {
      if (s.Music && !songMap.has(s.Music.id)) {
        songMap.set(s.Music.id, s.Music);
      }
    });

    return res.status(200).json(Array.from(songMap.values()));
  } catch (error) {
    console.error('Get recently used songs error:', error);
    return res.status(500).json({ message: 'Server error retrieving recently used songs.' });
  }
};

const selectSong = async (req, res) => {
  try {
    const { audiusTrackId, title, artist, coverImage, audioUrl, duration } = req.body;

    if (!audiusTrackId) {
      return res.status(400).json({ message: 'audiusTrackId is required.' });
    }

    // Find or insert local relational DB representation
    const [song] = await Song.findOrCreate({
      where: { audiusTrackId },
      defaults: {
        title: title || 'Unknown Title',
        artist: artist || 'Unknown Artist',
        coverImage: coverImage || '',
        audioUrl: audioUrl || '',
        duration: duration ? parseInt(duration, 10) : 0,
      },
    });

    return res.status(200).json(song);
  } catch (error) {
    console.error('Select song error:', error);
    return res.status(500).json({ message: 'Server error saving selected song.' });
  }
};

module.exports = {
  searchSongs,
  getTrendingSongs,
  getRecentlyUsedSongs,
  selectSong,
};
