// routes/authRoutes.js
import express from 'express';
import { signup, verifyOTP, resendOTP, signin } from '../controllers/AuthController.js'

const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/signin', signin);

export default router;
