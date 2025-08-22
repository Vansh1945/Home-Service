const mongoose = require('mongoose');
const Booking = require('../models/Booking-model');
const Service = require('../models/Service-model');
const Provider = require('../models/Provider-model');
const User = require('../models/User-model');
const CommissionRule = require('../models/CommissionRule-model');
const Coupon = require('../models/Coupon-model');
const Transaction = require('../models/Transaction-model ');
const ProviderEarning = require('../models/ProviderEarning-model');
const sendEmail = require('../utils/sendEmail');




// USER BOOKING CONTROLLERS


// Create single service booking
const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const {
      serviceId,
      date,
      time,
      address,
      notes,
      couponCode,
      quantity = 1,
      paymentMethod = 'online' // Default to online payment
    } = req.body;

    // Validate required fields
    if (!serviceId || !date || !address || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Service ID, date, address, and payment method are required'
      });
    }

    // Validate payment method
    if (!['online', 'cash'].includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Payment method must be either "online" or "cash"'
      });
    }

    // Check if service exists
    const service = await Service.findById(serviceId).session(session);
    if (!service) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Validate date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }



    // Calculate amounts
    let subtotal = service.basePrice * quantity;
    let totalDiscount = 0;
    let couponDetails = null;

    // Process coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode }).session(session);
      if (!coupon) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code'
        });
      }

      // Validate coupon
      if (coupon.usedBy.includes(req.user._id)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Coupon already used by this user'
        });
      }

      if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Coupon has expired'
        });
      }

      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Minimum order value of ${coupon.minOrderValue} required for this coupon`
        });
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discountType === 'percent') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.discountValue;
      }

      totalDiscount = discount;
      couponDetails = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount || null
      };

      // Mark coupon as used (but don't save yet - will save after booking is created)
      coupon.usedBy.push(req.user._id);
    }

    const totalAmount = subtotal - totalDiscount;

    // Create booking
    const booking = new Booking({
      customer: req.user._id,
      services: [{
        service: serviceId,
        quantity,
        price: service.basePrice,
        discountAmount: totalDiscount,
        serviceDetails: {
          title: service.title,
          description: service.description,
          duration: service.duration,
          category: service.category
        }
      }],
      date: bookingDate,
      time: time || null,
      address,
      notes: notes || null,
      couponApplied: couponDetails,
      totalDiscount,
      subtotal,
      totalAmount,
      paymentMethod, // Add the missing paymentMethod field
      status: 'pending',
      paymentStatus: 'pending',
      confirmedBooking: false
    });

    // Save booking
    await booking.save({ session });

    // If coupon was applied, save the updated coupon
    if (couponCode && couponDetails) {
      await Coupon.findOneAndUpdate(
        { code: couponCode },
        { $addToSet: { usedBy: req.user._id } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Please confirm payment to complete booking.',
      data: booking.toObject(),
      bookingId: booking._id
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Confirm booking and process payment 
const confirmBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fix: Add null check for req.body before destructuring
    const { bookingId, paymentMethod, paymentDetails } = req.body || {};
    const userId = req.user._id;

    // Validate required fields
    if (!bookingId || !paymentMethod) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Booking ID and payment method are required'
      });
    }

    // Find booking with all necessary data
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: userId
    })
    .populate('services.service')
    .session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check booking status
    if (booking.confirmedBooking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Booking is already confirmed'
      });
    }

    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm a cancelled booking'
      });
    }

    // Process payment
    let paymentResult;
    switch (paymentMethod) {
      case 'credit_card':
      case 'online':
        // Process online payment
        paymentResult = await processOnlinePayment({
          amount: booking.totalAmount,
          bookingId: booking._id,
          paymentDetails,
          userId
        }, session);
        break;

      case 'wallet':
        // Process wallet payment
        paymentResult = await processWalletPayment({
          amount: booking.totalAmount,
          userId,
          bookingId: booking._id
        }, session);
        break;

      case 'cash':
        // Cash payment - just record it
        paymentResult = {
          success: true,
          paymentStatus: 'pending'
        };
        break;

      default:
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid payment method'
        });
    }

    if (!paymentResult.success) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Payment failed'
      });
    }

    // Update booking status
    booking.paymentMethod = paymentMethod;
    booking.paymentStatus = paymentResult.paymentStatus || 'paid';
    booking.confirmedBooking = true;
    booking.status = 'pending';

    // Update transaction
    const transaction = await Transaction.findOneAndUpdate(
      { booking: bookingId },
      {
        paymentMethod,
        paymentStatus: booking.paymentStatus,
        transactionId: paymentResult.transactionId,
        razorpayOrderId: paymentResult.razorpayOrderId,
        razorpayPaymentId: paymentResult.razorpayPaymentId,
        amount: booking.totalAmount,
        completedAt: new Date()
      },
      { new: true, session }
    );

    await booking.save({ session });

    // Send confirmation emails
    try {
      const user = await User.findById(userId).session(session);
      
      const emailHtml = `
        <h2>Booking Confirmed</h2>
        <p>Your booking #${booking._id} has been confirmed.</p>
        <p><strong>Service:</strong> ${booking.services[0].service.title}</p>
        <p><strong>Date:</strong> ${booking.date.toDateString()}</p>
        <p><strong>Time:</strong> ${booking.time || 'To be confirmed'}</p>
        <p><strong>Amount Paid:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
        ${booking.couponApplied ? `<p><strong>Discount Applied:</strong> ₹${booking.totalDiscount.toFixed(2)}</p>` : ''}
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p>Thank you for your booking!</p>
      `;

      await sendEmail({
        to: user.email,
        subject: `Booking Confirmation #${booking._id}`,
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        booking,
        transaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error confirming booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm booking',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Helper function to process online payments
async function processOnlinePayment({ amount, bookingId, paymentDetails, userId }, session) {
  try {
    // In a real implementation, this would call your payment gateway (Razorpay, Stripe, etc.)
    // This is a simplified version
    
    // Validate payment details
    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiry || !paymentDetails.cvv) {
      return { success: false, message: 'Card details are required for online payment' };
    }

    // Simulate payment processing
    const paymentSuccess = Math.random() > 0.1; // 90% success rate
    
    if (paymentSuccess) {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}`,
        razorpayOrderId: `ORDER-${Date.now()}`,
        razorpayPaymentId: `PAY-${Date.now()}`,
        paymentStatus: 'paid'
      };
    } else {
      return {
        success: false,
        message: 'Payment declined by bank'
      };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      message: 'Payment processing failed'
    };
  }
}

// Helper function to process wallet payments
async function processWalletPayment({ amount, userId, bookingId }, session) {
  try {
    // Deduct from user's wallet
    const user = await User.findById(userId).session(session);
    
    if (user.walletBalance < amount) {
      return {
        success: false,
        message: 'Insufficient wallet balance'
      };
    }

    user.walletBalance -= amount;
    await user.save({ session });

    return {
      success: true,
      transactionId: `WALLET-${Date.now()}`,
      paymentStatus: 'paid'
    };
  } catch (error) {
    console.error('Wallet payment error:', error);
    return {
      success: false,
      message: 'Wallet payment failed'
    };
  }
}


// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Fix: Add null check for req.body before destructuring
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to update this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this booking'
      });
    }

    // Validate status transition
    const allowedTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'cancelled': []
    };

    if (!allowedTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${booking.status} to ${status}`
      });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update booking status'
    });
  }
};

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { customer: req.user._id };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('services.service', 'title description basePrice category image duration')
      .populate('provider', 'name email phone businessName contactPerson rating')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });

    // Fetch transaction details for each booking
    const Transaction = require('../models/Transaction-model ');
    const bookingsWithTransactions = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject();
        
        // Find transaction for this booking
        const transaction = await Transaction.findOne({ 
          booking: booking._id,
          paymentStatus: { $in: ['completed', 'paid'] }
        }).sort({ createdAt: -1 });

        if (transaction) {
          bookingObj.transactionId = transaction.transactionId;
          bookingObj.razorpayPaymentId = transaction.razorpayPaymentId;
          bookingObj.paymentMethod = transaction.paymentMethod;
          bookingObj.paymentDate = transaction.updatedAt;
        }

        return bookingObj;
      })
    );

    res.status(200).json({
      success: true,
      message: 'Bookings retrieved successfully',
      data: bookingsWithTransactions
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch bookings'
    });
  }
};

// Get customer bookings (alias for getUserBookings to match frontend requirements)
const getCustomerBookings = async (req, res) => {
  return getUserBookings(req, res);
};

// Update booking payment method and status
const updateBookingPayment = async (req, res) => {
  try {
    const { id } = req.params;
    // Fix: Add null check for req.body before destructuring
    const { paymentMethod, paymentStatus } = req.body || {};
    const userId = req.user._id;

    // Validate required fields
    if (!paymentMethod || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and payment status are required'
      });
    }

    // Validate payment method
    if (!['online', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be "online" or "cash"'
      });
    }

    // Validate payment status
    if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be "pending", "paid", or "failed"'
      });
    }

    // Find booking
    const booking = await Booking.findOne({
      _id: id,
      customer: userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be updated
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update payment for cancelled booking'
      });
    }

    // Update payment details
    booking.paymentMethod = paymentMethod;
    booking.paymentStatus = paymentStatus;
    
    // Keep booking status as "pending" until provider accepts
    if (booking.status !== 'accepted' && booking.status !== 'completed') {
      booking.status = 'pending';
    }

    await booking.save();

    // Send confirmation email if payment is completed
    if (paymentStatus === 'paid') {
      try {
        const user = await User.findById(userId);
        const emailHtml = `
          <h2>Payment Confirmed</h2>
          <p>Your payment has been successfully processed.</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Amount:</strong> ₹${booking.totalAmount}</p>
          <p>Your booking is now pending provider acceptance.</p>
        `;

        await sendEmail({
          to: user.email,
          subject: 'Payment Confirmed',
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment details updated successfully',
      data: {
        bookingId: booking._id,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('Error updating booking payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update payment details'
    });
  }
};

// Get provider details by ID
const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider ID'
      });
    }

    const provider = await Provider.findById(id)
      .select('name email phone businessName contactPerson rating services experience serviceArea address')
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Provider details retrieved successfully',
      data: provider
    });

  } catch (error) {
    console.error('Error fetching provider details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch provider details'
    });
  }
};

// Get service details by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service ID'
      });
    }

    const service = await Service.findById(id)
      .select('title description basePrice category image duration isActive')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service details retrieved successfully',
      data: service
    });

  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch service details'
    });
  }
};

// Get single booking
const getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('services.service', 'title description basePrice category image duration')
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone businessName contactPerson rating address')
      .populate('feedback');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to view this booking
    if (booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this booking'
      });
    }

    // Fetch transaction details
    const Transaction = require('../models/Transaction-model ');
    const transactions = await Transaction.find({ 
      booking: booking._id 
    }).sort({ createdAt: -1 });

    const bookingObj = booking.toObject();
    
    if (transactions.length > 0) {
      const completedTransaction = transactions.find(t => 
        ['completed', 'paid'].includes(t.paymentStatus)
      ) || transactions[0];
      
      bookingObj.transactionId = completedTransaction.transactionId;
      bookingObj.razorpayPaymentId = completedTransaction.razorpayPaymentId;
      bookingObj.razorpayOrderId = completedTransaction.razorpayOrderId;
      bookingObj.paymentMethod = completedTransaction.paymentMethod;
      bookingObj.paymentDate = completedTransaction.updatedAt;
      bookingObj.transactions = transactions;
    }

    res.status(200).json({
      success: true,
      message: 'Booking details retrieved successfully',
      data: bookingObj
    });

  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch booking details'
    });
  }
};

// Cancel booking with e-commerce style progress tracking
const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    // Handle cases where req.body might be undefined or empty
    const { reason } = req.body || {}; // Optional cancellation reason
    const userId = req.user.id;

    const booking = await Booking.findOne({ _id: id, customer: userId }).session(session);
    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'completed') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking'
      });
    }

    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    const previousStatus = booking.status;
    
    // Step 1: Mark booking as cancelled
    booking.status = 'cancelled';
    booking.cancellationProgress.status = 'cancelled';
    booking.cancellationProgress.reason = reason || 'Customer requested cancellation';
    booking.cancellationProgress.cancelledAt = new Date();
    
    await booking.save({ session });

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: { totalBookings: -1 }
    }, { session });

    // Update provider stats if booking was already accepted
    if (previousStatus === 'accepted' && booking.provider) {
      await Provider.findByIdAndUpdate(booking.provider, {
        $inc: { canceledBookings: 1 }
      }, { session });
    }

    let refundDetails = null;

    // Step 2: Process refund if payment was made (E-commerce style progress)
    if (booking.paymentStatus === 'paid') {
      // Mark refund as processing
      booking.cancellationProgress.status = 'processing_refund';
      booking.cancellationProgress.refundAmount = booking.totalAmount;
      await booking.save({ session });

      // Simulate refund processing delay (in real app, this would be async)
      setTimeout(async () => {
        try {
          const refundSession = await mongoose.startSession();
          refundSession.startTransaction();
          
          const bookingToUpdate = await Booking.findById(id).session(refundSession);
          
          if (booking.paymentMethod === 'online') {
            // For online payments, initiate refund through payment gateway
            // This is a simulation - in real app, call Razorpay/Stripe refund API
            const refundTransactionId = `REFUND-${Date.now()}`;
            
            bookingToUpdate.cancellationProgress.status = 'refund_completed';
            bookingToUpdate.cancellationProgress.refundTransactionId = refundTransactionId;
            bookingToUpdate.cancellationProgress.refundCompletedAt = new Date();
            
          } else if (booking.paymentMethod === 'cash') {
            // For cash payments, mark as refund completed immediately
            bookingToUpdate.cancellationProgress.status = 'refund_completed';
            bookingToUpdate.cancellationProgress.refundCompletedAt = new Date();
          }
          
          await bookingToUpdate.save({ session: refundSession });
          await refundSession.commitTransaction();
          refundSession.endSession();
          
          // Send refund completion email
          const user = await User.findById(userId);
          const refundEmailHtml = `
            <h2>Refund Processed Successfully</h2>
            <p>Your refund has been processed successfully.</p>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Refund Amount:</strong> ₹${booking.totalAmount}</p>
            <p><strong>Refund Method:</strong> ${booking.paymentMethod === 'online' ? 'Original payment method' : 'Cash refund'}</p>
            <p><strong>Processing Time:</strong> ${booking.paymentMethod === 'online' ? '3-5 business days' : 'Immediate'}</p>
            <p>Thank you for your patience.</p>
          `;

          await sendEmail({
            to: user.email,
            subject: 'Refund Processed Successfully',
            html: refundEmailHtml
          });
          
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
        }
      }, 2000); // 2 second delay to simulate processing

      refundDetails = {
        amount: booking.totalAmount,
        method: booking.paymentMethod,
        status: 'processing',
        estimatedCompletion: booking.paymentMethod === 'online' ? '3-5 business days' : 'Immediate'
      };
    }

    await session.commitTransaction();
    session.endSession();

    // Send immediate cancellation confirmation email
    try {
      const user = await User.findById(userId);
      const emailHtml = `
        <h2>Booking Cancelled Successfully</h2>
        <p>Your booking has been cancelled as requested.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${booking.services[0]?.serviceDetails?.title || 'Service'}</p>
        <p><strong>Original Date:</strong> ${booking.date.toDateString()}</p>
        ${booking.time ? `<p><strong>Time:</strong> ${booking.time}</p>` : ''}
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        
        ${refundDetails ? `
          <h3>Refund Information</h3>
          <p><strong>Refund Amount:</strong> ₹${refundDetails.amount}</p>
          <p><strong>Refund Status:</strong> ${refundDetails.status}</p>
          <p><strong>Expected Processing Time:</strong> ${refundDetails.estimatedCompletion}</p>
          <p>You will receive another email once the refund is processed.</p>
        ` : '<p>No refund applicable as payment was not completed.</p>'}
        
        <p>If you need to make a new booking or have any questions, please contact our support team.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Booking Cancellation Confirmed',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    // Return response with e-commerce style progress information
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: booking._id,
        status: booking.status,
        cancellationProgress: {
          status: booking.cancellationProgress.status,
          reason: booking.cancellationProgress.reason,
          cancelledAt: booking.cancellationProgress.cancelledAt,
          refundAmount: booking.cancellationProgress.refundAmount,
          estimatedRefundTime: refundDetails?.estimatedCompletion
        },
        nextSteps: refundDetails ? [
          'Cancellation confirmed',
          'Refund is being processed',
          'You will receive refund confirmation email',
          `Refund will be credited in ${refundDetails.estimatedCompletion}`
        ] : [
          'Cancellation confirmed',
          'No refund applicable'
        ]
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel booking'
    });
  }
};

// User - Update Booking Date/Time (with restrictions)
const userUpdateBookingDateTime = async (req, res) => {
  try {
    const { id } = req.params;
    // Fix: Add null check for req.body before destructuring
    const { date, time } = req.body || {};
    const userId = req.user.id;

    // Validate input
    if (!date && !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either date or time to update'
      });
    }

    // Find booking
    const booking = await Booking.findOne({ _id: id, customer: userId });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // User can only modify pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(403).json({
        success: false,
        message: 'Only pending or confirmed bookings can be rescheduled'
      });
    }

    // Calculate minimum allowed time (6 hours from now)
    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.time || '00:00'}`);

    // Check if it's too close to booking time
    if (bookingDateTime < sixHoursLater) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reschedule within 6 hours of booking time. Please contact support.'
      });
    }

    // Validate new date if provided
    if (date) {
      const newDate = new Date(date);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      if (newDate < now) {
        return res.status(400).json({
          success: false,
          message: 'New booking date must be in the future'
        });
      }
      booking.date = newDate;
    }

    // Validate new time if provided
    if (time) {
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format (use HH:MM)'
        });
      }
      booking.time = time;
    }

    // Save changes
    await booking.save();

    // Send notification email
    try {
      const user = await User.findById(userId);
      const emailHtml = `
        <h2>Booking Rescheduled</h2>
        <p>Your booking has been successfully rescheduled.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>New Date:</strong> ${booking.date.toDateString()}</p>
        <p><strong>New Time:</strong> ${booking.time || 'To be confirmed'}</p>
        <p>Please contact support if you need to make any further changes.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Booking Rescheduled',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Booking date/time updated successfully',
      data: {
        _id: booking._id,
        date: booking.date,
        time: booking.time,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error updating booking date/time:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update booking date/time'
    });
  }
};




// PROVIDER CONTROLLERS

/**
 * @desc    Get a single booking by ID for provider
 * @route   GET /api/providers/bookings/:id
 * @access  Private/Provider
 */
const getProviderBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.provider._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid booking ID format' 
      });
    }

    const provider = await Provider.findById(providerId)
      .select('services performanceTier')
      .lean();
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const commissionRule = await CommissionRule.getCommissionForProvider(
      providerId,
      provider.performanceTier
    );

    const servicesInCategory = await Service.find({
      category: { $in: provider.services }
    }).select('_id');

    const serviceIds = servicesInCategory.map(s => s._id);

    const booking = await Booking.findOne({
      _id: id,
      'services.service': { $in: serviceIds },
      $or: [
        { provider: { $exists: false } },
        { provider: providerId }
      ]
    })
    .populate('customer', 'name email phone')
    .populate('services.service', 'name description duration price')
    .lean();

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found or not available for this provider' 
      });
    }

    const { commission, netAmount } = CommissionRule.calculateCommission(
      booking.totalAmount,
      commissionRule
    );

    const responseData = {
      ...booking,
      commission: {
        rule: commissionRule ? {
          _id: commissionRule._id,
          name: commissionRule.name,
          type: commissionRule.type,
          value: commissionRule.value
        } : null,
        amount: commission
      },
      netAmount,
      providerCommissionRate: commissionRule ? commissionRule.value : 0
    };

    res.status(200).json({ 
      success: true,
      data: responseData 
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all bookings for a provider by status
 * @route   GET /api/providers/bookings/status/:status
 * @access  Private/Provider
 */
const getBookingsByStatus = async (req, res) => {
  try {
    const providerId = req.provider._id;
    let { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Handle status mapping - convert frontend camelCase to backend kebab-case
    const statusMapping = {
      'inProgress': 'in-progress'
    };
    
    // Apply status mapping if needed
    if (statusMapping[status]) {
      status = statusMapping[status];
    }

    const validStatuses = ['pending', 'accepted', 'completed', 'cancelled', 'in-progress'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status parameter'
      });
    }

    const provider = await Provider.findById(providerId)
      .select('services performanceTier');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const commissionRule = await CommissionRule.getCommissionForProvider(
      providerId,
      provider.performanceTier
    );

    const servicesInCategory = await Service.find({
      category: { $in: provider.services }
    }).select('_id');

    const serviceIds = servicesInCategory.map(s => s._id);

    const query = {
      status,
      'services.service': { $in: serviceIds }
    };

    if (status === 'pending') {
      query.$or = [
        { provider: { $exists: false } },
        { provider: providerId }
      ];
    } else {
      query.provider = providerId;
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('services.service', 'name price duration')
      .sort({ date: 1, time: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const bookingsWithCommission = bookings.map(booking => {
      const { commission, netAmount } = CommissionRule.calculateCommission(
        booking.totalAmount,
        commissionRule
      );
      
      return {
        ...booking,
        commission: {
          rule: commissionRule ? {
            _id: commissionRule._id,
            name: commissionRule.name,
            type: commissionRule.type,
            value: commissionRule.value
          } : null,
          amount: commission
        },
        netAmount,
        providerCommissionRate: commissionRule ? commissionRule.value : 0
      };
    });

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: bookingsWithCommission
    });

  } catch (error) {
    console.error('Booking Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Accept a booking
 * @route   PUT /api/bookings/:id/accept
 * @access  Private/Provider
 */
const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.provider._id;
    const { time } = req.body || {}; // Fix: Add null check for req.body

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Check if provider exists and get their services
    const provider = await Provider.findById(providerId).select('services name');
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Find the booking that matches:
    // 1. The booking ID
    // 2. Has services the provider offers
    // 3. Is either unassigned or assigned to this provider
    // 4. Is in pending status (regardless of payment status)
    const booking = await Booking.findOne({
      _id: id,
      status: 'pending',
      $or: [
        { provider: { $exists: false } },
        { provider: providerId }
      ]
    }).populate('services.service', 'category');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not available for acceptance'
      });
    }

    // Verify provider can service this booking
    const canService = booking.services.every(serviceItem => 
      provider.services.includes(serviceItem.service.category)
    );

    if (!canService) {
      return res.status(403).json({
        success: false,
        message: 'Provider is not qualified for all services in this booking'
      });
    }

    // Validate time format if provided
    if (time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format (use HH:MM)'
      });
    }

    // IMPORTANT: Provider can accept booking regardless of payment status
    // This allows the workflow: Booking Created -> Payment -> Pending -> Provider Accepts -> Accepted
    // OR: Booking Created -> Pending -> Provider Accepts -> Accepted -> Payment (for cash payments)
    
    // Update booking status to accepted
    booking.status = 'accepted';
    booking.provider = providerId;
    if (time) booking.time = time;
    booking.updatedAt = new Date();

    await booking.save();

    // Populate booking details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name email phone')
      .populate('services.service', 'title description price');

    // Send notification email (async - don't wait for it)
    try {
      const paymentStatusText = booking.paymentStatus === 'paid' 
        ? 'Payment has been received.' 
        : booking.paymentMethod === 'cash' 
          ? 'Payment will be collected after service completion.'
          : 'Payment is pending.';

      const emailHtml = `
        <h2>Booking Accepted</h2>
        <p>Your booking has been accepted by the service provider.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${populatedBooking.services[0].service.title}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toDateString()}</p>
        <p><strong>Time:</strong> ${booking.time || 'To be confirmed'}</p>
        <p><strong>Provider:</strong> ${provider.name}</p>
        <p><strong>Payment Status:</strong> ${paymentStatusText}</p>
        <p>The provider will contact you soon to confirm the service details.</p>
      `;

      await sendEmail({
        to: populatedBooking.customer.email,
        subject: 'Booking Accepted',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send acceptance email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: {
        ...populatedBooking.toObject(),
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod
      }
    });

  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while accepting booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Start a booking (change status from accepted to in-progress)
 * @route   PATCH /api/booking/provider/:id/start
 * @access  Private/Provider
 */
const startBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.provider._id;

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Find the booking
    const booking = await Booking.findOne({
      _id: id,
      provider: providerId,
      status: 'accepted'
    }).populate('customer', 'name email phone')
      .populate('services.service', 'title description');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not available to start'
      });
    }

    // Update booking status to in-progress
    booking.status = 'in-progress';
    booking.startedAt = new Date();
    booking.updatedAt = new Date();

    await booking.save();

    // Send notification email to customer
    try {
      const emailHtml = `
        <h2>Service Started</h2>
        <p>Your service provider has started working on your booking.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${booking.services[0].service.title}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toDateString()}</p>
        <p><strong>Time:</strong> ${booking.time || 'As scheduled'}</p>
        <p>The service is now in progress. You will be notified once it's completed.</p>
      `;

      await sendEmail({
        to: booking.customer.email,
        subject: 'Service Started',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send service start email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Service started successfully',
      data: {
        bookingId: booking._id,
        status: booking.status,
        startedAt: booking.startedAt
      }
    });

  } catch (error) {
    console.error('Error starting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Reject a booking
 * @route   PATCH /api/booking/provider/:id/reject
 * @access  Private/Provider
 */
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.provider._id;
    // Fix: Add null check for req.body before destructuring
    const { reason } = req.body || {};

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Find the booking
    const booking = await Booking.findOne({
      _id: id,
      status: 'pending',
      $or: [
        { provider: { $exists: false } },
        { provider: providerId }
      ]
    }).populate('customer', 'name email phone')
      .populate('services.service', 'title description');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not available for rejection'
      });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.rejectedBy = providerId;
    booking.rejectionReason = reason || 'Provider declined';
    booking.rejectedAt = new Date();
    booking.updatedAt = new Date();

    await booking.save();

    // Send notification email to customer
    try {
      const emailHtml = `
        <h2>Booking Update</h2>
        <p>Unfortunately, your booking request has been declined by the service provider.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${booking.services[0].service.title}</p>
        <p><strong>Date:</strong> ${new Date(booking.date).toDateString()}</p>
        <p><strong>Time:</strong> ${booking.time || 'As requested'}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Don't worry! We'll help you find another provider. Please check your dashboard for alternative options or contact our support team.</p>
      `;

      await sendEmail({
        to: booking.customer.email,
        subject: 'Booking Update - Alternative Provider Available',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Booking rejected successfully',
      data: {
        bookingId: booking._id,
        status: booking.status,
        rejectionReason: booking.rejectionReason,
        rejectedAt: booking.rejectedAt
      }
    });

  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while rejecting booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Complete a booking
 * @route   PATCH /api/booking/provider/:id/complete
 * @access  Private/Provider
 */
const completeBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const providerId = req.provider._id;
    
    // Fix: Add null check for req.body before destructuring
    const { servicePhotos } = req.body || {};

    console.log(`[COMPLETE BOOKING] Starting completion for booking ${id} by provider ${providerId}`);

    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format',
        details: 'The provided booking ID is not a valid MongoDB ObjectId'
      });
    }

    // Get provider with wallet information
    const provider = await Provider.findById(providerId)
      .select('name email performanceTier wallet services')
      .session(session);
      
    if (!provider) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
        details: 'The provider account could not be found in the system'
      });
    }

    console.log(`[COMPLETE BOOKING] Provider found: ${provider.name} (${provider.email})`);

    // Get commission rule
    const commissionRule = await CommissionRule.getCommissionForProvider(
      providerId,
      provider.performanceTier
    );

    console.log(`[COMPLETE BOOKING] Commission rule: ${commissionRule ? commissionRule.name : 'Default'}`);

    // Find booking with detailed logging
    const booking = await Booking.findOne({ _id: id })
      .populate('customer', 'name email phone')
      .populate('services.service', 'title basePrice category')
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        details: `No booking exists with ID: ${id}`,
        bookingId: id
      });
    }


    // Check if booking belongs to this provider
    if (!booking.provider || booking.provider.toString() !== providerId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Booking not assigned to this provider',
        details: 'You can only complete bookings that are assigned to you',
        bookingId: id,
        assignedProvider: booking.provider,
        requestingProvider: providerId
      });
    }

    // Check booking status - allow completion from both 'accepted' and 'in-progress' status
    const allowedStatuses = ['accepted', 'in-progress'];
    if (!allowedStatuses.includes(booking.status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Booking not available for completion',
        details: `Booking status is '${booking.status}'. Only bookings with status 'accepted' or 'in-progress' can be completed.`,
        currentStatus: booking.status,
        allowedStatuses: allowedStatuses,
        bookingId: id
      });
    }

    // Verify provider can service this booking (check service categories)
    const bookingServiceCategories = booking.services.map(s => s.service.category);
    const canServiceAll = bookingServiceCategories.every(category => 
      provider.services.includes(category)
    );

    if (!canServiceAll) {
      console.log(`[COMPLETE BOOKING] Provider cannot service all booking categories - Provider services: ${provider.services}, Booking categories: ${bookingServiceCategories}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Provider not qualified for all services in this booking',
        details: 'You can only complete bookings for services you are qualified to provide',
        providerServices: provider.services,
        requiredServices: bookingServiceCategories,
        bookingId: id
      });
    }

    console.log(`[COMPLETE BOOKING] All validations passed, proceeding with completion`);

    // Calculate commission and net amount
    const { commission, netAmount } = CommissionRule.calculateCommission(
      booking.totalAmount,
      commissionRule
    );

    console.log(`[COMPLETE BOOKING] Financial calculation - Total: ₹${booking.totalAmount}, Commission: ₹${commission}, Net: ₹${netAmount}`);

    // Update booking status
    const previousStatus = booking.status;
    booking.status = 'completed';
    booking.completedAt = new Date();
    
    // IMPORTANT FIX: Update payment status for cash payments when booking is completed
    if (booking.paymentMethod === 'cash' && booking.paymentStatus === 'pending') {
      booking.paymentStatus = 'paid';
      booking.paymentDate = new Date();
      console.log(`[COMPLETE BOOKING] Cash payment status updated to 'paid' for booking ${id}`);
      
      // Create transaction record for cash payment
      const Transaction = require('../models/Transaction-model ');
      const cashTransaction = new Transaction({
        booking: booking._id,
        user: booking.customer._id,
        amount: booking.totalAmount,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        transactionId: `CASH-${Date.now()}-${booking._id.toString().slice(-6)}`,
        currency: 'INR',
        completedAt: new Date(),
        description: `Cash payment for completed booking ${booking._id}`
      });
      await cashTransaction.save({ session });
      console.log(`[COMPLETE BOOKING] Cash transaction record created: ${cashTransaction.transactionId}`);
    }
    
    // Add service photos if provided
    if (servicePhotos && servicePhotos.length > 0) {
      booking.servicePhotos = servicePhotos;
    }

    await booking.save({ session });

    console.log(`[COMPLETE BOOKING] Booking status updated from '${previousStatus}' to 'completed'`);

    // Determine earning status - if cash payment, mark as paid immediately
    const isCashPayment = booking.paymentMethod === 'cash';
    const earningStatus = isCashPayment ? 'paid' : 'available';
    const availableAfter = isCashPayment ? new Date() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create provider earning record
    const providerEarning = new ProviderEarning({
      provider: providerId,
      booking: booking._id,
      grossAmount: booking.totalAmount,
      commissionRate: commissionRule ? commissionRule.value : 0,
      commissionAmount: commission,
      netAmount: netAmount,
      status: earningStatus, // Set status based on payment method
      availableAfter: availableAfter // Set availability based on payment method
    });
    await providerEarning.save({ session });

    console.log(`[COMPLETE BOOKING] Provider earning record created - Status: ${earningStatus}, Net amount: ₹${netAmount}`);

    // Update provider stats
    await Provider.findByIdAndUpdate(
      providerId,
      {
        $inc: {
          completedBookings: 1,
          totalEarnings: netAmount,
          totalCommissionPaid: commission
        }
      },
      { session }
    );

    console.log(`[COMPLETE BOOKING] Provider stats updated`);

    // Send confirmation emails (async, don't wait)
    setImmediate(async () => {
      try {
        const servicesList = booking.services.map(item => 
          `<li>${item.service.title} (Qty: ${item.quantity}) - ₹${item.price.toFixed(2)}</li>`
        ).join('');

        const paymentStatusText = booking.paymentMethod === 'cash' 
          ? 'Cash Payment Received - Thank you!' 
          : (booking.paymentStatus === 'paid' ? 'Paid - Thank you!' : 'Pending - Please make payment soon');

        const emailHtml = `
          <h2>Service Completed</h2>
          <p>The service for your booking has been marked as completed.</p>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          
          <h3>Services Provided:</h3>
          <ul>${servicesList}</ul>
          
          <p><strong>Total Amount:</strong> ₹${booking.totalAmount.toFixed(2)}</p>
          <p><strong>Commission:</strong> ₹${commission.toFixed(2)} (${commissionRule ? commissionRule.value : 0}${commissionRule?.type === 'percentage' ? '%' : ''})</p>
          <p><strong>Provider Earnings:</strong> ₹${netAmount.toFixed(2)}</p>
          
          <p><strong>Payment Status:</strong> ${paymentStatusText}</p>
          ${booking.paymentMethod === 'cash' ? '<p><strong>Payment Method:</strong> Cash payment received upon service completion</p>' : ''}
            
          <p>Thank you for using our service!</p>
        `;

        await Promise.all([
          sendEmail({
            to: booking.customer.email,
            subject: 'Service Completed',
            html: emailHtml
          }),
          sendEmail({
            to: provider.email,
            subject: 'Service Completed - Provider Copy',
            html: emailHtml.replace('Service Completed', 'Service Completed - Provider Copy')
          })
        ]);

        console.log(`[COMPLETE BOOKING] Confirmation emails sent successfully`);
      } catch (emailError) {
        console.error(`[COMPLETE BOOKING] Failed to send confirmation emails:`, emailError);
      }
    });

    await session.commitTransaction();
    session.endSession();

    console.log(`[COMPLETE BOOKING] Booking completion successful for ${id}`);

    res.json({
      success: true,
      message: 'Booking completed successfully',
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        completedAt: booking.completedAt,
        paymentDate: booking.paymentDate,
        totalAmount: booking.totalAmount,
        commission: commission,
        netAmount: netAmount,
        providerEarning: {
          grossAmount: providerEarning.grossAmount,
          commission: providerEarning.commissionAmount,
          netAmount: providerEarning.netAmount,
          status: providerEarning.status,
          availableAfter: providerEarning.availableAfter
        },
        servicePhotos: booking.servicePhotos || []
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    // Fix: Use req.params.id directly in case id variable is not in scope
    const bookingId = req.params.id || 'unknown';
    console.error(`[COMPLETE BOOKING] Error completing booking ${bookingId}:`, error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete booking',
      details: 'An internal server error occurred while processing the booking completion',
      bookingId: bookingId,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};






// ADMIN CONTROLLERS

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sorting
    let sort = {};
    if (req.query.sortBy) {
      const sortFields = req.query.sortBy.split(',');
      sortFields.forEach(field => {
        const [key, order] = field.split(':');
        sort[key] = order === 'desc' ? -1 : 1;
      });
    } else {
      sort = { createdAt: -1 }; // Default: newest first
    }

    // Filtering
    let filter = {};

    // Status filter
    if (req.query.status) {
      filter.status = { $in: req.query.status.split(',') };
    }

    // Payment status filter
    if (req.query.paymentStatus) {
      filter.paymentStatus = { $in: req.query.paymentStatus.split(',') };
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.date.$lte = new Date(req.query.endDate);
      }
    }

    // Search by customer name or ID (if implemented in your model)
    if (req.query.search) {
      filter.$or = [
        { 'customer.name': { $regex: req.query.search, $options: 'i' } },
        { 'customer.email': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get bookings with filters, pagination, and sorting
    const bookings = await Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('provider', 'businessName contactPerson')
      .populate('services.service', 'name description')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      page,
      pages,
      total,
      data: bookings
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



 // Get booking details with service and payment information
const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone businessName')
      .populate({
        path: 'services.service',
        select: 'title category description basePrice duration image'
      })
      .populate('feedback')
      .populate('complaint')
      .populate('commissionRule', 'name rate type');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Format services with service details
    const formattedServices = booking.services.map(item => ({
      _id: item._id,
      service: {
        _id: item.service?._id,
        title: item.service?.title,
        category: item.service?.category,
        description: item.service?.description,
        basePrice: item.service?.basePrice,
        duration: item.service?.duration,
        image: item.service?.image
      },
      quantity: item.quantity,
      price: item.price,
      discountAmount: item.discountAmount
    }));

    // Get payment details from transactions
    let paymentDetails = null;
    const Transaction = require('../models/Transaction-model ');
    const transactions = await Transaction.find({ 
      booking: booking._id 
    }).sort({ createdAt: -1 });

    if (transactions.length > 0 && booking.paymentMethod === 'online') {
      const transaction = transactions[0];
      paymentDetails = {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        paymentStatus: transaction.paymentStatus,
        paymentMethod: transaction.paymentMethod,
        currency: transaction.currency,
        razorpayOrderId: transaction.razorpayOrderId,
        razorpayPaymentId: transaction.razorpayPaymentId,
        createdAt: transaction.createdAt
      };
    }

    // Format the response
    const response = {
      booking: {
        _id: booking._id,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        address: booking.address,
        specialInstructions: booking.specialInstructions,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        bookingDateTime: booking.bookingDateTime,
        isUpcoming: booking.isUpcoming,
        confirmedBooking: booking.confirmedBooking
      },
      customer: booking.customer,
      provider: booking.provider,
      services: formattedServices,
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
        subtotal: booking.subtotal,
        totalDiscount: booking.totalDiscount,
        totalAmount: booking.totalAmount,
        couponApplied: booking.couponApplied,
        details: paymentDetails
      },
      commission: {
        amount: booking.commissionAmount,
        rule: booking.commissionRule
      },
      feedback: booking.feedback,
      complaint: booking.complaint,
      adminRemark: booking.adminRemark
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Assign provider to booking
const assignProvider = async (req, res) => {
  try {
    const { id } = req.params;
    // Fix: Add null check for req.body before destructuring
    const { providerId } = req.body || {};

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be reassigned'
      });
    }

    const provider = await Provider.findById(providerId);
    if (!provider || !provider.approved || provider.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider'
      });
    }

    // Use findByIdAndUpdate instead of modifying and saving to avoid validation issues
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { provider: providerId },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Provider assigned successfully',
      data: updatedBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete booking (Admin only)
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${booking.status} booking`
      });
    }

    // Get customer details for email notification
    const customer = await User.findById(booking.customer);
    const service = await Service.findById(booking.service);

    await Booking.findByIdAndDelete(id);

    // Send deletion notification email
    try {
      const emailHtml = `
        <h2>Booking Deleted</h2>
        <p>Your booking has been deleted by the administrator.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>Date:</strong> ${booking.date.toDateString()}</p>
        <p>If you believe this was a mistake, please contact our support team.</p>
      `;

      await sendEmail({
        to: customer.email,
        subject: 'Booking Deleted',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
    }

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user booking (Admin only)
const deleteUserBooking = async (req, res) => {
  try {
    const { userId, bookingId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const booking = await Booking.findOne({ _id: bookingId, customer: userId });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found for this user'
      });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${booking.status} booking`
      });
    }

    const service = await Service.findById(booking.service);

    await Booking.findByIdAndDelete(bookingId);

    // Send deletion notification email
    try {
      const emailHtml = `
        <h2>Booking Deleted</h2>
        <p>One of your bookings has been deleted by the administrator.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>Date:</strong> ${booking.date.toDateString()}</p>
        <p>If you believe this was a mistake, please contact our support team.</p>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Booking Deleted',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
    }

    res.json({
      success: true,
      message: 'User booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin - Update Booking Date/Time
const updateBookingDateTime = async (req, res) => {
  try {
    const { id } = req.params;
    // Fix: Add null check for req.body before destructuring
    const { date, time } = req.body || {};

    // Validate input
    if (!date && !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either date or time to update'
      });
    }

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate new date if provided
    if (date) {
      const newDate = new Date(date);
      if (newDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'New booking date must be in the future'
        });
      }
      booking.date = newDate;
    }

    // Validate new time if provided
    if (time) {
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format (use HH:MM)'
        });
      }
      booking.time = time;
    }

    // Save changes
    await booking.save();

    // Send notification email to customer and provider
    try {
      const [customer, provider, service] = await Promise.all([
        User.findById(booking.customer),
        Provider.findById(booking.provider),
        Service.findById(booking.service)
      ]);

      const emailHtml = `
        <h2>Booking Schedule Updated</h2>
        <p>Your booking has been rescheduled by the administrator.</p>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>New Date:</strong> ${booking.date.toDateString()}</p>
        <p><strong>New Time:</strong> ${booking.time || 'To be confirmed'}</p>
        <p>Please contact support if you have any questions.</p>
      `;

      // Send to both customer and provider
      await Promise.all([
        sendEmail({
          to: customer.email,
          subject: 'Booking Schedule Updated',
          html: emailHtml
        }),
        sendEmail({
          to: provider.email,
          subject: 'Booking Schedule Updated',
          html: emailHtml
        })
      ]);
    } catch (emailError) {
      console.error('Failed to send notification emails:', emailError);
    }

    res.json({
      success: true,
      message: 'Booking date/time updated successfully',
      data: {
        _id: booking._id,
        date: booking.date,
        time: booking.time,
        status: booking.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createBooking,
  confirmBooking,
  updateBookingStatus,
  getUserBookings,
  getCustomerBookings,
  updateBookingPayment,
  getProviderById,
  getServiceById,
  getBooking,
  cancelBooking,
  userUpdateBookingDateTime,
  getProviderBookingById,
  getBookingsByStatus,
  acceptBooking,
  startBooking,
  rejectBooking,
  completeBooking,
  getAllBookings,
  getBookingDetails,
  assignProvider,
  deleteBooking,
  deleteUserBooking,
  updateBookingDateTime
};
