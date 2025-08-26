// models/Service-model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Service Schema
const serviceSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  category: {
    type: String,
    required: true,
    enum: ['Electrical', 'AC', 'Appliance Repair', 'Other'], 
    default: 'Other'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  image: {
    type: String,
    default: 'default-service.jpg'
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 0.25,
    max: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  feedback: [{
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
      trim: true,
      default: ''
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    feedbackId: {
      type: Schema.Types.ObjectId,
      ref: 'Feedback',
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: false
});

// Indexes
serviceSchema.index({ title: 'text', description: 'text' });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ createdBy: 1 });
serviceSchema.index({ averageRating: -1 });

// Pre-save hook to update average rating
serviceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Calculate average rating if feedback array is modified
  if (this.isModified('feedback')) {
    if (this.feedback.length > 0) {
      const sum = this.feedback.reduce((acc, curr) => acc + curr.rating, 0);
      this.averageRating = sum / this.feedback.length;
      this.ratingCount = this.feedback.length;
    } else {
      this.averageRating = 0;
      this.ratingCount = 0;
    }
  }
  
  next();
});

// Virtual for formatted duration
serviceSchema.virtual('durationFormatted').get(function () {
  const hours = Math.floor(this.duration);
  const minutes = Math.round((this.duration - hours) * 60);
  return `${hours > 0 ? `${hours} hr` : ''} ${minutes > 0 ? `${minutes} min` : ''}`.trim();
});

// Method to add feedback and update average rating
serviceSchema.methods.addFeedback = async function(feedbackData) {
  this.feedback.push(feedbackData);
  
  // Recalculate average rating
  const sum = this.feedback.reduce((acc, curr) => acc + curr.rating, 0);
  this.averageRating = sum / this.feedback.length;
  this.ratingCount = this.feedback.length;
  
  await this.save();
  return this;
};

// ADMIN METHODS ==============================================

// Static method for admin to create service
serviceSchema.statics.createService = async function (adminId, serviceData) {
  const service = new this({
    ...serviceData,
    createdBy: adminId
  });
  return service.save();
};

// Static method for admin to update base price
serviceSchema.statics.updateBasePrice = async function (adminId, serviceId, newPrice) {
  const service = await this.findById(serviceId);

  if (!service.createdBy.equals(adminId)) {
    throw new Error('Not authorized to update this service');
  }

  service.basePrice = newPrice;
  return service.save();
};

// QUERY METHODS =============================================

// Query active services by category
serviceSchema.statics.findActiveByCategory = function (category) {
  return this.find({ category, isActive: true })
    .select('title category description image basePrice duration averageRating ratingCount');
};

// Query services with feedback stats
serviceSchema.statics.findWithFeedbackStats = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'feedbacks',
        localField: '_id',
        foreignField: 'serviceFeedback.service',
        as: 'fullFeedback'
      }
    },
    {
      $addFields: {
        feedbackCount: { $size: '$fullFeedback' },
        averageRating: { 
          $cond: {
            if: { $gt: [{ $size: '$fullFeedback' }, 0] },
            then: { $avg: '$fullFeedback.rating' },
            else: 0
          }
        }
      }
    },
    {
      $project: {
        title: 1,
        category: 1,
        description: 1,
        image: 1,
        basePrice: 1,
        duration: 1,
        isActive: 1,
        averageRating: 1,
        ratingCount: '$feedbackCount',
        createdAt: 1,
        updatedAt: 1
      }
    }
  ]);
};

// Query services for provider with average rating
serviceSchema.statics.findForProvider = function () {
  return this.find({ isActive: true })
    .select('title category description image basePrice duration averageRating ratingCount')
    .sort({ averageRating: -1 });
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;