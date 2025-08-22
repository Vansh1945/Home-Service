const mongoose = require('mongoose');
const { Schema } = mongoose;
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const transactionSchema = new Schema({
  transactionId: {
    type: String,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'cash', 'online'], // Added 'online'
    default: 'online' 
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  razorpayResponse: Object,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate transaction ID
transactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Create Razorpay order
transactionSchema.statics.createRazorpayOrder = async function(amount, currency, receipt, notes) {
  const options = {
    amount: Math.round(amount * 100), // Convert to paise
    currency: currency || 'INR',
    receipt: receipt,
    payment_capture: 1,
    notes: notes
  };

  try {
    return await razorpay.orders.create(options);
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    throw new Error(err.error.description || 'Payment processing failed');
  }
};

// Verify Razorpay signature
transactionSchema.statics.verifySignature = function(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
};

// Fetch payment details
transactionSchema.statics.fetchPaymentDetails = async function(paymentId) {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (err) {
    console.error('Error fetching payment details:', err);
    throw new Error(err.error.description || 'Failed to fetch payment details');
  }
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;