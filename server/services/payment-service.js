const Transaction = require('../models/Transaction-model ');
const Booking = require('../models/Booking-model');
const User = require('../models/User-model');
const Provider = require('../models/Provider-model');
const razorpayService = require('./razorpay-service');

module.exports = {
  async createCustomerPayment(userId, bookingId, amount, paymentMethod) {
    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('provider');
    
    if (!booking) throw new Error('Booking not found');
    if (booking.customer.toString() !== userId.toString()) {
      throw new Error('Not authorized for this booking');
    }

    // Calculate amounts based on booking
    const serviceAmount = booking.totalAmount || amount;
    const productsAmount = booking.productsUsed?.reduce((sum, p) => sum + (p.total || p.quantity * p.rate), 0) || 0;
    const adminAmount = serviceAmount;
    const providerAmount = productsAmount;

    // Create transaction
    const transaction = new Transaction({
      booking: bookingId,
      customer: userId,
      provider: booking.provider._id,
      amount,
      adminAmount,
      providerAmount,
      paymentMethod,
      status: paymentMethod === 'cash' ? 'completed' : 'pending'
    });

    // Handle online payment
    let razorpayOrder;
    if (paymentMethod === 'online') {
      razorpayOrder = await razorpayService.createOrder(amount, `Payment for booking ${bookingId}`);
      transaction.razorpayOrderId = razorpayOrder.id;
    }

    await transaction.save();

    // Update booking payment status if payment is completed
    if (transaction.status === 'completed') {
      booking.paymentStatus = 'paid';
      await booking.save();
    }

    return { transaction, razorpayOrder };
  },

  async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const isValid = await razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    if (!isValid) throw new Error('Invalid payment signature');

    const transaction = await Transaction.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: 'completed'
      },
      { new: true }
    ).populate('booking');

    if (!transaction) throw new Error('Transaction not found');

    // Update booking payment status
    if (transaction.booking) {
      transaction.booking.paymentStatus = 'paid';
      await transaction.booking.save();
    }

    return transaction;
  },

  async payFromWallet(userId, bookingId, amount) {
    const user = await User.findById(userId);
    if (user.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const booking = await Booking.findById(bookingId)
      .populate('service')
      .populate('provider');
    
    if (!booking) throw new Error('Booking not found');
    if (booking.customer.toString() !== userId.toString()) {
      throw new Error('Not authorized for this booking');
    }

    // Calculate amounts based on booking
    const serviceAmount = booking.totalAmount || amount;
    const productsAmount = booking.productsUsed?.reduce((sum, p) => sum + (p.total || p.quantity * p.rate), 0) || 0;
    const adminAmount = serviceAmount;
    const providerAmount = productsAmount;

    // Deduct from wallet
    user.walletBalance -= amount;
    await user.save();

    // Create transaction
    const transaction = await Transaction.create({
      booking: bookingId,
      customer: userId,
      provider: booking.provider._id,
      amount,
      adminAmount,
      providerAmount,
      paymentMethod: 'wallet',
      status: 'completed'
    });

    // Update booking payment status
    booking.paymentStatus = 'paid';
    await booking.save();

    return transaction;
  },

  async initiateWithdrawal(providerId, amount, method, details) {
    const provider = await Provider.findById(providerId);
    
    // Calculate available balance
    const completedTxns = await Transaction.find({
      provider: providerId,
      status: 'completed',
      paymentMethod: { $ne: 'withdrawal' }
    });
    
    const withdrawnAmount = await Transaction.aggregate([
      { 
        $match: { 
          provider: providerId,
          paymentMethod: 'withdrawal',
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalEarnings = completedTxns.reduce((sum, txn) => sum + txn.providerAmount, 0);
    const totalWithdrawn = withdrawnAmount.length > 0 ? withdrawnAmount[0].total : 0;
    const availableBalance = totalEarnings - totalWithdrawn;
    
    if (availableBalance < amount) {
      throw new Error('Insufficient balance for withdrawal');
    }

    // Create withdrawal transaction
    const transaction = await Transaction.create({
      provider: providerId,
      amount,
      providerAmount: amount,
      adminAmount: 0,
      paymentMethod: 'withdrawal',
      withdrawalMethod: method,
      withdrawalDetails: details,
      status: 'pending'
    });

    return transaction;
  },


  async getTransactions(userId, userRole) {
    const query = userRole === 'provider' 
      ? { provider: userId } 
      : { customer: userId };
    
    return Transaction.find(query)
      .sort({ createdAt: -1 })
      .populate('booking')
      .populate('customer', 'name email')
      .populate('provider', 'name email');
  }
};