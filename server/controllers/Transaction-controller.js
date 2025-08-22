const Transaction = require('../models/Transaction-model ');
const Booking = require('../models/Booking-model');
const User = require('../models/User-model');
const Provider = require('../models/Provider-model');
const Service = require('../models/Service-model');
const CommissionRule = require('../models/CommissionRule-model');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const sendEmail = require('../utils/sendEmail');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    const userId = req.user._id;

    // Validate input with more detailed checks
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Valid booking ID is required'
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Valid positive amount is required'
      });
    }

    // IMPORTANT: Only allow online payments to create transactions
    if (!paymentMethod || paymentMethod !== 'online') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Transaction records can only be created for online payments. Cash payments should not create transactions.'
      });
    }

    // Check if booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: userId
    }).session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Booking not found or unauthorized'
      });
    }

    // Check if a transaction already exists for this booking to prevent duplicates
    const existingTransaction = await Transaction.findOne({
      booking: bookingId,
      paymentStatus: { $in: ['pending', 'completed', 'paid'] }
    }).session(session);

    if (existingTransaction) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'A transaction already exists for this booking',
        data: {
          existingTransactionId: existingTransaction._id,
          status: existingTransaction.paymentStatus
        }
      });
    }

    // Validate Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Payment gateway configuration error'
      });
    }

    // Create Razorpay order with better error handling
    const options = {
      amount: amount, // Convert to paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      payment_capture: 1,
      notes: {
        bookingId: bookingId.toString(),
        userId: userId.toString()
      }
    };

    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (razorpayError) {
      console.error('Razorpay order creation failed:', razorpayError);
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: razorpayError.error?.description || 'Payment gateway error',
        error: razorpayError
      });
    }

    // Create transaction record ONLY for online payments
    const transaction = new Transaction({
      amount: amount,
      currency: 'INR',
      paymentMethod: 'online', // Force online payment method
      booking: bookingId,
      user: userId,
      razorpayOrderId: order.id,
      paymentStatus: 'pending'
    });

    await transaction.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        key: process.env.RAZORPAY_KEY_ID,
        transactionId: transaction._id
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating order:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      errorDetails: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  } finally {
    session.endSession();
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      bookingId,
      transactionId
    } = req.body;

    // Validate input
    if (!orderId || !paymentId || !signature || !bookingId || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'All payment verification fields are required'
      });
    }

    // Verify the payment signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update transaction record
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    transaction.razorpayPaymentId = paymentId;
    transaction.razorpaySignature = signature;
    transaction.paymentStatus = 'completed';
    transaction.razorpayResponse = req.body;
    await transaction.save();

    // Update booking payment status
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // IMPORTANT: Keep booking status as "pending" after payment
    // The booking will remain pending until provider accepts it
    // This ensures proper workflow: Payment -> Pending -> Provider Accepts -> Accepted
    booking.paymentStatus = 'paid';
    // booking.status remains "pending" - do not change to "accepted"
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Booking is pending provider acceptance.',
      data: {
        transactionId: transaction._id,
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/payments/webhook
 * @access  Public
 */
const handleWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers['x-razorpay-signature'];

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).send('Server error');
  }

  // Verify webhook signature
  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const generatedSignature = shasum.digest('hex');

  if (generatedSignature !== razorpaySignature) {
    console.warn('Webhook signature verification failed');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body.event;
  const payment = req.body.payload.payment?.entity;

  if (!payment) {
    return res.status(400).send('Invalid webhook payload');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handleSuccessfulPayment(payment, session);
        break;
      case 'payment.failed':
        await handleFailedPayment(payment, session);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    await session.commitTransaction();
    res.json({ success: true });
  } catch (error) {
    await session.abortTransaction();
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// Helper function to handle successful payment from webhook
const handleSuccessfulPayment = async (payment, session) => {
  // 1. Find transaction by order ID
  const transaction = await Transaction.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    {
      paymentStatus: 'completed',
      razorpayPaymentId: payment.id,
      razorpayResponse: payment,
      paymentMethod: payment.method || 'online',
      updatedAt: new Date()
    },
    { new: true, session }
  );

  if (!transaction) {
    throw new Error('Transaction not found for successful payment');
  }

  // 2. Find the booking
  const booking = await Booking.findById(transaction.booking).session(session);
  
  if (!booking) {
    throw new Error('Booking not found');
  }

  // 3. Update booking payment status but keep booking status as "pending"
  // IMPORTANT: Booking status remains "pending" until provider accepts it
  // This ensures proper workflow: Payment -> Pending -> Provider Accepts -> Accepted
  booking.paymentStatus = 'paid';
  booking.paidAmount = transaction.amount;
  booking.paymentDate = new Date();
  // booking.status remains "pending" - do not change to "accepted"
  await booking.save({ session });

  // 4. Post-service payment handling - invoice generation removed
  // Payment is now handled directly through transactions and provider earnings

  // 5. Send payment confirmation email
  await sendPaymentConfirmationEmail(booking, transaction, transaction.user);
};

// Helper function to handle failed payment from webhook
const handleFailedPayment = async (payment, session) => {
  await Transaction.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    {
      status: 'failed',
      razorpayPaymentId: payment.id,
      razorpayResponse: payment,
      updatedAt: new Date()
    },
    { session }
  );

  // For upfront payments, mark booking as payment failed
  const transaction = await Transaction.findOne({ 
    razorpayOrderId: payment.order_id 
  }).session(session);

  if (transaction && transaction.paymentType !== 'post_service') {
    await Booking.findByIdAndUpdate(
      transaction.booking,
      { paymentStatus: 'failed' },
      { session }
    );
  }
};

// Helper function to send payment confirmation email
const sendPaymentConfirmationEmail = async (booking, transaction, userId) => {
  try {
    const user = await User.findById(userId);
    const service = await Service.findById(booking.services[0].service);

    const emailHtml = `
      <h2>Payment Confirmation</h2>
      <p>Your payment has been successfully processed.</p>
      <p><strong>Transaction ID:</strong> ${transaction._id}</p>
      <p><strong>Booking ID:</strong> ${booking._id}</p>
      <p><strong>Service:</strong> ${service.title}</p>
      <p><strong>Amount Paid:</strong> ₹${transaction.amount.toFixed(2)}</p>
      <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
      <p><strong>Payment Date:</strong> ${new Date().toLocaleString()}</p>
      <p>Thank you for your payment!</p>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Payment Confirmation',
      html: emailHtml
    });
  } catch (emailError) {
    console.error('Failed to send payment confirmation email:', emailError);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook
};
