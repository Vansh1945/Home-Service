const mongoose = require('mongoose');
const { Schema } = mongoose;

// Address Sub-Schema
const addressSchema = new Schema({
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  postalCode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  }
});

// Service Item Sub-Schema
const serviceItemSchema = new Schema({
  service: {
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  }
}, { _id: true });

// Booking Schema
const bookingSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
  },
  services: [serviceItemSchema],
  date: {
    type: Date,
    required: [true, 'Booking date is required'],
    validate: [
      {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: 'Invalid date format'
      },
      {
        validator: function (value) {
          // Only validate future date for new bookings, not when updating existing ones
          if (this.isNew) {
            return value >= new Date();
          }
          return true;
        },
        message: 'Booking date cannot be in the past'
      }
    ]
  },
  time: {
    type: String,
    required: [true, 'Booking time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled', 'confirmed', 'no-show'],
    default: 'pending'
  },
  
  // Payment method and status tracking
  paymentMethod: {
    type: String,
    enum: ['online', 'cash'],
    required: [true, 'Payment method is required']
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'processing'],
    default: 'pending'
  },
  
  // Cancellation tracking  progress
  cancellationProgress: {
    status: {
      type: String,
      enum: ['not_cancelled', 'cancelled', 'processing_refund', 'refund_completed'],
      default: 'not_cancelled'
    },
    reason: {
      type: String,
      trim: true
    },
    cancelledAt: {
      type: Date
    },
    refundInitiatedAt: {
      type: Date
    },
    refundCompletedAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative']
    },
    refundTransactionId: {
      type: String,
      trim: true
    }
  },
  
  // Status history for progress tracking
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true
    },
    updatedBy: {
      type: String,
      enum: ['customer', 'provider', 'admin', 'system'],
      default: 'system'
    }
  }],
  
  // Estimated completion time for better UX
  estimatedCompletionTime: {
    type: Date
  },
  
  // Service completion tracking
  serviceStartedAt: {
    type: Date
  },
  
  serviceCompletedAt: {
    type: Date
  },

  address: {
    type: addressSchema,
    required: [true, 'Address is required']
  },
  // Store coupon details as an object so frontend can read full coupon meta
  couponApplied: {
    code: { type: String, trim: true },
    discountType: { type: String, trim: true },
    discountValue: { type: Number, min: [0, 'Discount cannot be negative'] },
    maxDiscount: { type: Number, min: [0, 'Max discount cannot be negative'], default: null }
  },
  // Optional customer notes for the booking
  notes: {
    type: String,
    default: null,
    trim: true
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  commissionAmount: {
    type: Number,
    default: 0,
    min: [0, 'Commission cannot be negative']
  },
  commissionRule: {
    type: Schema.Types.ObjectId,
    ref: 'CommissionRule'
  },

  feedback: [{
    type: Schema.Types.ObjectId,
    ref: 'Feedback'
  }],
  complaint: {
    type: Schema.Types.ObjectId,
    ref: 'Complaint'
  },
  adminRemark: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  confirmedBooking: {
    type: Boolean,
    default: false
  }
}, {
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.id; // Remove the virtual id field
      // Keep ret._id for API responses so frontend can access booking ID
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function (doc, ret) {
      delete ret.id; 
      return ret;
    }
  },
  timestamps: false
});

// Pre-save hook to calculate commission and totals
bookingSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  // Track status changes for progress history
  if (this.isModified('status') && !this.isNew) {
    const statusChange = {
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system'
    };
    
    // Add appropriate notes for status changes
    switch (this.status) {
      case 'pending':
        statusChange.note = 'Booking is waiting for provider assignment';
        break;
      case 'accepted':
        statusChange.note = 'Provider has accepted the booking';
        break;
      case 'in-progress':
        statusChange.note = 'Service is in progress';
        this.serviceStartedAt = new Date();
        break;
      case 'completed':
        statusChange.note = 'Service has been completed successfully';
        this.serviceCompletedAt = new Date();
        break;
      case 'cancelled':
        statusChange.note = 'Booking has been cancelled';
        this.cancellationProgress.status = 'cancelled';
        this.cancellationProgress.cancelledAt = new Date();
        break;
    }
    
    this.statusHistory.push(statusChange);
  }

  // Track cancellation progress changes
  if (this.isModified('cancellationProgress.status') && !this.isNew) {
    const cancellationStatus = this.cancellationProgress.status;
    const statusChange = {
      status: `cancellation_${cancellationStatus}`,
      timestamp: new Date(),
      updatedBy: 'system'
    };
    
    switch (cancellationStatus) {
      case 'cancelled':
        statusChange.note = 'Booking cancellation initiated';
        break;
      case 'processing_refund':
        statusChange.note = 'Refund is being processed';
        this.cancellationProgress.refundInitiatedAt = new Date();
        break;
      case 'refund_completed':
        statusChange.note = 'Refund has been completed successfully';
        this.cancellationProgress.refundCompletedAt = new Date();
        break;
    }
    
    this.statusHistory.push(statusChange);
  }

  // Initialize status history for new bookings
  if (this.isNew) {
    this.statusHistory.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'Booking created successfully',
      updatedBy: 'customer'
    });
  }

  // Calculate subtotal from services
  this.subtotal = this.services.reduce((sum, service) => {
    return sum + (service.price * service.quantity) - service.discountAmount;
  }, 0);

  // Ensure subtotal is never negative
  this.subtotal = Math.max(0, this.subtotal);

  // Ensure totalDiscount is properly set (never null or undefined)
  if (this.totalDiscount === null || this.totalDiscount === undefined) {
    this.totalDiscount = 0;
  }

  // Calculate total amount after discount
  this.totalAmount = Math.max(0, this.subtotal - this.totalDiscount);

  // Ensure couponApplied is properly structured when a coupon is used
  if (this.totalDiscount > 0 && (!this.couponApplied || !this.couponApplied.code)) {
    // If there's a discount but no coupon details, this might be a manual discount
    // We should preserve any existing coupon details or set to null if none
    if (!this.couponApplied) {
      this.couponApplied = null;
    }
  }

  // Calculate commission when provider is set, on provider change, transaction change or new booking
  if (this.provider && (this.isModified('transaction') || this.isModified('provider') || this.isNew || this.isModified('totalAmount'))) {
    try {
      const CommissionRule = mongoose.model('CommissionRule');
      const commissionRule = await CommissionRule.getCommissionForProvider(this.provider);

      if (commissionRule) {
        const { commission, netAmount } = CommissionRule.calculateCommission(this.totalAmount, commissionRule);
        this.commissionAmount = commission || 0;
        this.providerEarnings = netAmount || this.totalAmount; // Ensure providerEarnings is never null/0 unless totalAmount is 0
        this.commissionRule = commissionRule._id;
      } else {
        // No commission rule found - provider gets full amount
        this.commissionAmount = 0;
        this.providerEarnings = this.totalAmount; // Provider gets full amount if no commission
        this.commissionRule = null;
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      // Fallback: provider gets full amount if commission calculation fails
      this.commissionAmount = 0;
      this.providerEarnings = this.totalAmount;
      this.commissionRule = null;
    }
  } else if (!this.provider) {
    // If no provider is assigned, reset commission-related fields
    this.commissionAmount = 0;
    this.providerEarnings = 0; // Will be calculated when provider is assigned
    this.commissionRule = null;
  }

  // Ensure providerEarnings is never null or undefined
  if (this.providerEarnings === null || this.providerEarnings === undefined) {
    this.providerEarnings = this.provider ? this.totalAmount : 0;
  }

  // Note: Payment confirmation logic will be handled in the controller
  // when updating the transaction status

  next();
});

// Add providerEarnings field to the schema
bookingSchema.add({
  providerEarnings: {
    type: Number,
    default: 0,
    min: [0, 'Provider earnings cannot be negative']
  }
});

// Payment confirmation will be handled through Transaction model updates
// in the booking controller

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;