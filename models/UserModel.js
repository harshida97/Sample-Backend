// models/userModel.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email_or_phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

export default mongoose.model('User', userSchema);
