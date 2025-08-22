const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9_]{5,20}$/, 'Coupon code must be 5-20 alphanumeric characters']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['flat', 'percent'],
    default: 'flat'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [1, 'Discount value must be at least 1'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'percent') {
          return value <= 100;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    min: [Date.now, 'Expiry date cannot be in the past']
  },
  minBookingValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum booking value cannot be negative']
  },
  isGlobal: {
    type: Boolean,
    default: false
  },
  isFirstBooking: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    default: 1, // null means unlimited usage
    min: [1, 'Usage limit must be at least 1']
  },
  usedBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    bookingValue: Number
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ assignedTo: 1, isActive: 1 });
couponSchema.index({ isGlobal: 1, isActive: 1 });
couponSchema.index({ isFirstBooking: 1, isActive: 1 });

// Virtual properties
couponSchema.virtual('remainingUses').get(function() {
  if (this.usageLimit === null) return Infinity;
  return this.usageLimit - this.usedBy.length;
});

couponSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

couponSchema.virtual('formattedDiscount').get(function() {
  return this.discountType === 'flat' 
    ? `₹${this.discountValue} OFF` 
    : `${this.discountValue}% OFF`;
});

// Pre-save hook
couponSchema.pre('save', function(next) {
  if (this.isExpired) {
    this.isActive = false;
  }
  
  if (this.isGlobal && this.isFirstBooking) {
    throw new Error('Coupon cannot be both global and first-booking');
  }
  
  next();
});

// ADMIN METHODS ==============================================

couponSchema.statics.createCoupon = async function(adminId, couponData) {
  if (couponData.isFirstBooking) {
    const exists = await this.findOne({ isFirstBooking: true, isActive: true });
    if (exists) {
      throw new Error('Active first-booking coupon already exists');
    }
  }
  
  const coupon = new this({
    ...couponData,
    createdBy: adminId
  });
  
  return coupon.save();
};

couponSchema.statics.listAllCoupons = async function(adminId, filters = {}) {
  const query = { createdBy: adminId, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

// USER METHODS ==============================================

couponSchema.statics.validateCoupon = async function(userId, couponCode, serviceAmount) {
  const coupon = await this.findOne({ code: couponCode });
  
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  // Check if coupon is active
  if (!coupon.isActive) {
    throw new Error('Coupon is not active');
  }

  // Check expiration (using expiryDate instead of validUntil)
  if (coupon.expiryDate && new Date() > coupon.expiryDate) {
    throw new Error('Coupon has expired');
  }

  // Check minimum amount (using minBookingValue instead of minOrderAmount)
  if (coupon.minBookingValue && serviceAmount < coupon.minBookingValue) {
    throw new Error(`Order amount must be at least ₹${coupon.minBookingValue}`);
  }

  // Check usage limits
  if (coupon.usageLimit && coupon.usedBy.length >= coupon.usageLimit) {
    throw new Error('Coupon usage limit reached');
  }

  // Check if user has already used this coupon
  const alreadyUsed = coupon.usedBy.some(usage => usage.user && usage.user.equals(userId));
  if (alreadyUsed) {
    throw new Error('You have already used this coupon');
  }

  return coupon;
};

couponSchema.statics.getAvailableCoupons = async function(userId, bookingValue = 0) {
  const user = await mongoose.model('User').findById(userId);
  
  const query = {
    isActive: true,
    expiryDate: { $gte: new Date() },
    $or: [
      { assignedTo: null },
      { assignedTo: userId }
    ],
    minBookingValue: { $lte: bookingValue },
    // Only include coupons the user hasn't used yet
    "usedBy.user": { $ne: userId }
  };

  // For coupons with usage limit
  query.$or = [
    { usageLimit: null },
    { 
      usageLimit: { $ne: null },
      $expr: { $lt: [{ $size: "$usedBy" }, "$usageLimit"] }
    }
  ];

  // Exclude first-booking coupon if user has bookings
  if (user.totalBookings > 0) {
    query.isFirstBooking = false;
  }

  return this.find(query).select('-usedBy -createdBy');
};

couponSchema.methods.applyCoupon = function(totalAmount) {
  if (totalAmount < this.minBookingValue) {
    throw new Error(`Minimum booking value of ₹${this.minBookingValue} required`);
  }

  if (this.discountType === 'flat') {
    return {
      discount: this.discountValue,
      finalAmount: Math.max(0, totalAmount - this.discountValue)
    };
  } else {
    const discount = (totalAmount * this.discountValue) / 100;
    return {
      discount,
      finalAmount: totalAmount - discount
    };
  }
};

couponSchema.methods.markAsUsed = async function(userId, bookingValue = 0) {
  // Check if user already used this coupon
  const alreadyUsed = this.usedBy.some(usage => usage.user && usage.user.equals(userId));
  if (alreadyUsed) {
    throw new Error('User has already used this coupon');
  }
  
  this.usedBy.push({ 
    user: userId,
    bookingValue: bookingValue
  });
  
  // Check if we've reached the usage limit (if there is one)
  if (this.usageLimit !== null && this.remainingUses <= 0) {
    this.isActive = false;
  }
  
  if (this.isFirstBooking) {
    await mongoose.model('User').findByIdAndUpdate(userId, { 
      $set: { firstBookingUsed: true }
    });
  }
  
  return this.save();
};

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;