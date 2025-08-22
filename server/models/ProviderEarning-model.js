// models/ProviderEarning-model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const providerEarningSchema = new Schema({
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    default: 0
  },
  commissionAmount: {
    type: Number,
    required: true,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'available', 'processing', 'paid'],
    default: 'pending'
  },
  availableAfter: {
    type: Date,
    required: true
  },
  paymentRecord: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentRecord'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
providerEarningSchema.index({ provider: 1 });
providerEarningSchema.index({ status: 1 });
providerEarningSchema.index({ availableAfter: 1 });
providerEarningSchema.index({ booking: 1 });

// models/ProviderEarning-model.js
providerEarningSchema.statics.getAvailableBalance = async function(providerId) {
  try {
    
    const providerObjectId = new mongoose.Types.ObjectId(providerId);
    
    const result = await this.aggregate([
      { 
        $match: { 
          provider: providerObjectId,
          status: 'available',
          availableAfter: { $lte: new Date() }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$netAmount' } 
        } 
      }
    ]);
    
    console.log(`[DEBUG] Available balance query result:`, result);
    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error('Error in getAvailableBalance:', error);
    return 0;
  }
};


providerEarningSchema.statics.getEarningsSummary = async function(providerId) {
  const result = await this.aggregate([
    { 
      $match: { 
        provider: new mongoose.Types.ObjectId(providerId)
      } 
    },
    { 
      $group: { 
        _id: '$status',
        totalGross: { $sum: '$grossAmount' },
        totalCommission: { $sum: '$commissionAmount' },
        totalNet: { $sum: '$netAmount' },
        count: { $sum: 1 }
      } 
    }
  ]);
  
  return result;
};

providerEarningSchema.statics.getEarningsByBooking = async function(bookingId) {
  return this.find({ booking: bookingId })
    .populate('provider', 'name email')
    .populate('paymentRecord', 'status transactionReference');
};

providerEarningSchema.statics.markAsProcessing = async function(providerId, amount, session) {
  const earnings = await this.find({
    provider: providerId,
    status: 'available',
    availableAfter: { $lte: new Date() }
  }).sort({ availableAfter: 1 }).session(session);

  let remaining = amount;
  const processedEarnings = [];
  
  for (const earning of earnings) {
    if (remaining <= 0) break;
    
    const deductAmount = Math.min(earning.netAmount, remaining);
    earning.netAmount -= deductAmount;
    remaining -= deductAmount;
    
    if (earning.netAmount === 0) {
      earning.status = 'processing';
    } else {
      // Create a partial withdrawal record
      const newEarning = new this({
        provider: providerId,
        booking: earning.booking,
        grossAmount: (deductAmount / earning.netAmount) * earning.grossAmount,
        commissionRate: earning.commissionRate,
        commissionAmount: (deductAmount / earning.netAmount) * earning.commissionAmount,
        netAmount: deductAmount,
        status: 'processing',
        availableAfter: earning.availableAfter
      });
      await newEarning.save({ session });
      processedEarnings.push(newEarning);
    }
    
    await earning.save({ session });
    processedEarnings.push(earning);
  }

  if (remaining > 0) {
    throw new Error('Insufficient available balance');
  }

  return processedEarnings;
};

module.exports = mongoose.model('ProviderEarning', providerEarningSchema);