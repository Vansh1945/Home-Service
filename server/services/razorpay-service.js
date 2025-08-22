const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction-model ');
const Booking = require('../models/Booking-model');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay order
const createOrder = async (options) => {
  try {
    const order = await razorpay.orders.create({
      amount: options.amount * 100, // Convert to paise
      currency: options.currency || 'INR',
      receipt: `booking_${options.bookingId}_${Date.now()}`,
      payment_capture: 1,
      notes: options.notes || {}
    });
    
    return order;
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw new Error('Failed to create payment order');
  }
};

// Verify Razorpay payment
const verifyPayment = async (orderId, paymentId, signature) => {
  try {
    // Verify signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new Error('Invalid payment signature');
    }

    // Update transaction
    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        status: 'completed',
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        verifiedAt: new Date()
      },
      { new: true }
    ).populate('booking');

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
};

// Handle Razorpay webhook
const handleWebhook = async (webhookBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new Error('Invalid webhook signature');
  }

  const event = webhookBody.event;
  const payment = webhookBody.payload.payment.entity;

  switch (event) {
    case 'payment.captured':
      return handleSuccessfulPayment(payment);
    case 'payment.failed':
      return handleFailedPayment(payment);
    default:
      return { status: 'ignored', event };
  }
};

// Handle successful payment
const handleSuccessfulPayment = async (payment) => {
  const transaction = await Transaction.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    {
      status: 'completed',
      razorpayPaymentId: payment.id,
      verifiedAt: new Date()
    },
    { new: true }
  );

  if (!transaction) {
    throw new Error('Transaction not found for successful payment');
  }

  // Update booking status
  await Booking.findByIdAndUpdate(transaction.booking, {
    $inc: { paidAmount: transaction.amount },
    paymentStatus: 'paid'
  });

  return { status: 'processed', transactionId: transaction._id };
};

// Handle failed payment
const handleFailedPayment = async (payment) => {
  await Transaction.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    { status: 'failed', error: payment.error_description }
  );
  
  return { status: 'processed', paymentId: payment.id };
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook
};