// models/PaymentRecord-model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentRecordSchema = new Schema({
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking'
  },
  earnings: [{
    type: Schema.Types.ObjectId,
    ref: 'ProviderEarning'
  }],
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'neft', 'rtgs', 'other'],
    required: true
  },
  paymentDetails: {
    accountNumber: String,
    accountName: String,
    ifscCode: String,
    upiId: String,
    bankName: String
  },
  transactionReference: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  processedAt: Date,
  completedAt: Date,
  notes: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

// Indexes
paymentRecordSchema.index({ provider: 1 });
paymentRecordSchema.index({ status: 1 });
paymentRecordSchema.index({ createdAt: 1 });
paymentRecordSchema.index({ transactionReference: 1 }, { unique: true });
paymentRecordSchema.index({ booking: 1 });

// Static Methods
paymentRecordSchema.statics.getProviderRecords = async function(providerId, page = 1, limit = 10) {
  return this.find({ provider: providerId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('booking', 'service date')
    .populate('admin', 'name email');
};

paymentRecordSchema.statics.getAdminRecords = async function(filter = {}, page = 1, limit = 10) {
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('provider', 'name email phone')
    .populate('booking', 'service date')
    .populate('admin', 'name email');
};

paymentRecordSchema.statics.getSummaryStats = async function(providerId = null) {
  const match = providerId ? { provider: mongoose.Types.ObjectId(providerId) } : {};
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        totalCommission: { $sum: '$commissionAmount' },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return result.length ? result[0] : {
    totalAmount: 0,
    totalNetAmount: 0,
    totalCommission: 0,
    pendingCount: 0,
    completedCount: 0
  };
};

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);

module.exports = PaymentRecord;