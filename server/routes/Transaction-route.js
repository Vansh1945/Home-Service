const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/Transaction-controller');
const { userAuthMiddleware } = require('../middlewares/User-middleware');

// @desc    Create Razorpay order for booking payment
// @route   POST /api/transaction/create-order
// @access  Private (user)
router.post('/create-order', userAuthMiddleware, paymentController.createOrder);

// @desc    Verify payment and update records
// @route   POST /api/transaction/verify
// @access  Private (user)
router.post('/verify', userAuthMiddleware, paymentController.verifyPayment);

// @desc    Razorpay webhook handler
// @route   POST /api/transaction/webhook
// @access  Public
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;