export const getAvatarUrl = (profileImage, name) => {
  if (!profileImage) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
  }
  if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
    return profileImage;
  }
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${profileImage}`;
};
