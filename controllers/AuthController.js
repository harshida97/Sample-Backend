// controllers/authController.js
import User from '../models/UserModel.js';
import OTP from '../models/OtpModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

export const signup = async (req, res) => {
  const { email_or_phone, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ email_or_phone });
  if (existingUser) {
    return res.status(400).json({ message: "User already registered." });
  }

  // Generate OTP and set expiration time
  const otp = generateOTP();
  const expirationTime = new Date(Date.now() + 5 * 60 * 1000);

  // Save the OTP to the database
  await OTP.findOneAndUpdate(
    { email_or_phone },
    { otp, expirationTime },
    { upsert: true }
  );

  // Simulate OTP sending with console log
  console.log(`Generated OTP for ${email_or_phone}: ${otp}`);
  console.log(`OTP expiration time: ${expirationTime}`);

  // Respond to the user
  res.json({ message: 'OTP sent. Please verify it to complete registration.' });
};

export const verifyOTP = async (req, res) => {
  const { email_or_phone, otp, password } = req.body;

  // Find OTP entry in the database
  const otpEntry = await OTP.findOne({ email_or_phone });
  
  if (!otpEntry || otpEntry.otp !== otp || otpEntry.expirationTime < Date.now()) {
    // Handle OTP expiration case
    if (otpEntry && otpEntry.expirationTime < Date.now()) {
      const newOtp = generateOTP();
      otpEntry.otp = newOtp;
      otpEntry.expirationTime = new Date(Date.now() + 5 * 60 * 1000);
      await otpEntry.save();

      // Log and respond to user about OTP expiration
      console.log(`New OTP for ${email_or_phone}: ${newOtp}`);
      console.log(`New OTP expiration time: ${otpEntry.expirationTime}`);
      return res.status(400).json({ message: "OTP expired. A new OTP has been sent." });
    }

    // Log invalid OTP attempt
    console.log(`Invalid OTP entered for ${email_or_phone}. OTP: ${otp}`);
    return res.status(400).json({ message: "Invalid OTP. Please try again." });
  }

  // If OTP is valid, hash the password and create the new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ email_or_phone, password: hashedPassword });
  await newUser.save();

  // Delete the OTP entry after successful registration
  await OTP.deleteOne({ email_or_phone });

  // Log registration success
  console.log("Registration successful for", email_or_phone);

  // Respond to the user
  res.json({ message: "User registered successfully." });
};

export const resendOTP = async (req, res) => {
  const { email_or_phone } = req.body;

  // Check if an OTP request exists for the given email/phone
  const otpEntry = await OTP.findOne({ email_or_phone });
  if (otpEntry) {
    const newOtp = generateOTP();
    otpEntry.otp = newOtp;
    otpEntry.expirationTime = new Date(Date.now() + 5 * 60 * 1000);
    await otpEntry.save();

    // Log the resent OTP details
    console.log(`Resent OTP for ${email_or_phone}: ${newOtp}`);
    console.log(`New OTP expiration time: ${otpEntry.expirationTime}`);

    // Respond to the user
    res.json({ message: "A new OTP has been sent to your email or phone." });
  } else {
    // Handle case where no OTP exists
    console.log(`No OTP request found for ${email_or_phone}.`);
    res.status(400).json({ message: "No OTP request found or user not registered." });
  }
};

export const signin = async (req, res) => {
  const { email_or_phone, password } = req.body;

  // Find the user in the database
  const user = await User.findOne({ email_or_phone });
  if (!user) {
    return res.status(400).json({ message: "User not found." });
  }

  // Check if the password matches
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password." });
  }

  // Generate JWT tokens
  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // Log login details
  console.log(`User ${email_or_phone} logged in successfully.`);

  // Respond with tokens
  res.json({ message: "Login successful.", accessToken, refreshToken });
};
