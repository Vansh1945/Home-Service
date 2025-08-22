const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth-controller');


router.post('/login', authController.Login);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-otp', authController.resendOTP);

module.exports = router;