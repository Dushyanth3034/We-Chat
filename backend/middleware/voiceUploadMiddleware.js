const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'voice-' + uniqueSuffix + '.webm'); // Standardize on webm or use original extension if provided
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/mpeg',
    'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/3gpp', 'audio/m4a',
    'application/octet-stream'
  ];

  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio recordings are allowed.'), false);
  }
};

const voiceUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});

module.exports = voiceUpload;
