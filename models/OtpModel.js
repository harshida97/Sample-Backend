// models/otpModel.js
import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email_or_phone: { type: String, required: true },
  otp: { type: String, required: true },
  expirationTime: { type: Date, required: true },
});

export default mongoose.model('OTP', otpSchema);
