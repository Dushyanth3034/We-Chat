const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { User, QRCodeFriend } = require('../models');
const { generateUserQRCode } = require('../utils/qrGenerator');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-placeholder';

const validateEmail = (email) => {
  if (!email) return false;
  
  // 1. Must contain exactly one "@"
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;
  
  // 2. Reject if the domain part contains digits
  if (/\d/.test(domainPart)) return false;
  
  // 3. Must follow standard format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  // 4. Domain part must not contain consecutive dots or start/end with dot/hyphen
  if (domainPart.includes('..') || domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-')) {
    return false;
  }
  
  // Let's check each label of the domain
  const domainLabels = domainPart.split('.');
  if (domainLabels.length < 2) return false;
  
  for (const label of domainLabels) {
    if (!label) return false;
    if (!/^[a-zA-Z-]+$/.test(label)) return false;
  }
  
  const tld = domainLabels[domainLabels.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  
  return true;
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Check if the password is already in use by any other user
    const allUsers = await User.findAll({ attributes: ['password'] });
    for (const u of allUsers) {
      const isPasswordSame = await bcrypt.compare(password, u.password);
      if (isPasswordSame) {
        return res.status(400).json({ message: 'Password already in use.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });

    // Simulate sending email
    const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
    const emailContent = `
========================================
VERIFICATION EMAIL SIMULATION
To: ${user.name} (${user.email})
Subject: Verify your WeChat Account
Token: ${verificationToken}
Link: ${verificationLink}
Date: ${new Date().toISOString()}
========================================
`;
    console.log(emailContent);
    
    const logDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(path.join(logDir, 'verification_emails.log'), emailContent + '\n');

    const { data, dataUrl } = await generateUserQRCode(user.id, user.email, user.name);
    user.qrCode = dataUrl;
    await user.save();

    await QRCodeFriend.create({
      qrCode: data,
      userId: user.id,
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new passwords.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }

    // Check if the new password is already in use by any other user
    const allUsers = await User.findAll({ attributes: ['password'] });
    for (const u of allUsers) {
      const isPasswordSame = await bcrypt.compare(newPassword, u.password);
      if (isPasswordSame) {
        return res.status(400).json({ message: 'Password already in use.' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Server error changing password.' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Please provide Google access token.' });
    }

    // Fetch user info from Google
    let googleUser;
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      googleUser = response.data;
    } catch (err) {
      console.error('Google userinfo fetch error:', err.message);
      return res.status(400).json({ message: 'Invalid or expired Google access token.' });
    }

    const { name, email, picture } = googleUser;

    if (!email) {
      return res.status(400).json({ message: 'Google account does not provide an email.' });
    }

    let user = await User.findOne({ where: { email } });

    if (user) {
      // User already exists, log them in. Update provider if needed.
      let updated = false;
      if (user.provider !== 'Google') {
        user.provider = 'Google';
        updated = true;
      }
      if (picture && !user.profileImage) {
        user.profileImage = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      // Create new user automatically.
      const placeholderPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(placeholderPassword, 10);

      user = await User.create({
        name,
        email,
        password: hashedPassword,
        profileImage: picture || '',
        provider: 'Google',
      });

      // Generate QR Code and register in QRCodeFriend table
      const { data, dataUrl } = await generateUserQRCode(user.id, user.email, user.name);
      user.qrCode = dataUrl;
      await user.save();

      await QRCodeFriend.create({
        qrCode: data,
        userId: user.id,
      });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        qrCode: user.qrCode,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    return res.status(500).json({ message: 'Server error during Google Authentication.' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Server error during email verification.' });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    const verificationLink = `http://localhost:5173/verify-email?token=${verificationToken}`;
    const emailContent = `
========================================
RESEND VERIFICATION EMAIL SIMULATION
To: ${user.name} (${user.email})
Subject: Verify your WeChat Account (New Code)
Token: ${verificationToken}
Link: ${verificationLink}
Date: ${new Date().toISOString()}
========================================
`;
    console.log(emailContent);
    
    const logDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(path.join(logDir, 'verification_emails.log'), emailContent + '\n');

    return res.status(200).json({ success: true, message: 'Verification email resent successfully.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error resending verification email.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  googleLogin,
  verifyEmail,
  resendVerificationEmail,
};
