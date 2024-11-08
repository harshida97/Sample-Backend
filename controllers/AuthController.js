// controllers/authController.js
import User from '../models/UserModel.js';
import OTP from '../models/OtpModel.js'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signup = async (req, res) => {
  const { email_or_phone, password } = req.body;

  const existingUser = await User.findOne({ email_or_phone });
  if (existingUser) {
    return res.status(400).json({ message: "User already registered." });
  }

  const otp = generateOTP();
  const expirationTime = new Date(Date.now() + 5 * 60 * 1000);

  await OTP.findOneAndUpdate(
    { email_or_phone },
    { otp, expirationTime },
    { upsert: true }
  );

  console.log(`Generated OTP for ${email_or_phone}: ${otp}`);
  res.json({ message: 'OTP sent. Please verify it to complete registration.' });
};

export const verifyOTP = async (req, res) => {
  const { email_or_phone, otp, password } = req.body;

  const otpEntry = await OTP.findOne({ email_or_phone });
  if (!otpEntry || otpEntry.otp !== otp || otpEntry.expirationTime < Date.now()) {
    if (otpEntry && otpEntry.expirationTime < Date.now()) {
      const newOtp = generateOTP();
      otpEntry.otp = newOtp;
      otpEntry.expirationTime = new Date(Date.now() + 5 * 60 * 1000);
      await otpEntry.save();

      console.log(`New OTP for ${email_or_phone}: ${newOtp}`);
      return res.status(400).json({ message: "OTP expired. A new OTP has been sent." });
    }
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ email_or_phone, password: hashedPassword });
  await newUser.save();

  await OTP.deleteOne({ email_or_phone });

  console.log("Registration successful.");
  res.json({ message: "User registered successfully." });
};

export const resendOTP = async (req, res) => {
  const { email_or_phone } = req.body;

  const otpEntry = await OTP.findOne({ email_or_phone });
  if (otpEntry) {
    const newOtp = generateOTP();
    otpEntry.otp = newOtp;
    otpEntry.expirationTime = new Date(Date.now() + 5 * 60 * 1000);
    await otpEntry.save();

    console.log(`Resent OTP for ${email_or_phone}: ${newOtp}`);
    res.json({ message: "A new OTP has been sent to your email or phone." });
  } else {
    res.status(400).json({ message: "No OTP request found or user not registered." });
  }
};

export const signin = async (req, res) => {
  const { email_or_phone, password } = req.body;

  const user = await User.findOne({ email_or_phone });
  if (!user) {
    return res.status(400).json({ message: "User not found." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password." });
  }

  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.json({ message: "Login successful.", accessToken, refreshToken });
};
