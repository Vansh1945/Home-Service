const mongoose = require('mongoose');
const { Schema } = mongoose;

// Complaint Schema
const complaintSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required']
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider ID is required']
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking reference is required']
  },
  message: {
    type: String,
    required: [true, 'Complaint message is required'],
    trim: true,
    minlength: [20, 'Complaint message must be at least 20 characters'],
    maxlength: [1000, 'Complaint message cannot exceed 1000 characters']
  },
  imageProof: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open'
  },
  responseByAdmin: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin response cannot exceed 1000 characters'],
    default: null
  },
  reopenedBy: {  // Added this field
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reopenedAt: {  // Added this field
    type: Date,
    default: null
  },
  reopenedReason: {  // Added this field
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
complaintSchema.index({ customer: 1 });
complaintSchema.index({ provider: 1 });
complaintSchema.index({ booking: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ createdAt: -1 });

// Virtual for complaint duration (if resolved)
complaintSchema.virtual('resolutionTime').get(function() {
  if (this.status === 'resolved' && this.resolvedAt) {
    return this.resolvedAt - this.createdAt;
  }
  return null;
});

// Virtual for formatted creation date
complaintSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save hook to set resolvedAt timestamp
complaintSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

// Static method to get open complaints count
complaintSchema.statics.getOpenComplaintsCount = function() {
  return this.countDocuments({ status: 'open' });
};

// Static method to find complaints by user (customer or provider)
complaintSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [{ customer: userId }, { provider: userId }]
  }).sort({ createdAt: -1 });
};

// Instance method to resolve complaint
complaintSchema.methods.resolveComplaint = function(adminResponse) {
  if (this.status === 'resolved') {
    throw new Error('Complaint is already resolved');
  }
  this.status = 'resolved';
  this.responseByAdmin = adminResponse;
  return this.save();
};

// Instance method to reopen complaint
complaintSchema.methods.reopenComplaint = function(reason, userId) {
  if (this.status !== 'resolved') {
    throw new Error('Only resolved complaints can be reopened');
  }
  this.status = 'open';
  this.reopenedAt = new Date();
  this.reopenedBy = userId;
  this.reopenedReason = reason;
  this.resolvedAt = null;
  return this.save();
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;