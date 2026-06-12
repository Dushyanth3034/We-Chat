const QRCode = require('qrcode');

const generateUserQRCode = async (userId, email, name) => {
  try {
    const data = JSON.stringify({ userId, email, name });
    const dataUrl = await QRCode.toDataURL(data);
    return { data, dataUrl };
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR Code');
  }
};

module.exports = { generateUserQRCode };
