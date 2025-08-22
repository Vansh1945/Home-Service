const mongoose = require('mongoose');
const { Schema } = mongoose;
const Question = require('./AddQuestion-model');

const providerTestSchema = new Schema({
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  questions: [{
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: true
    },
    correctAnswer: {
      type: Number,
      required: true
    },
    selectedOption: {
      type: Number,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['unanswered', 'answered', 'skipped'],
      default: 'unanswered'
    }
  }],
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'expired'],
    default: 'in-progress',
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  testCategory: {
    type: String,
    required: true,
    default: 'general'
  },
  testSubcategory: {
    type: String,
    required: true,
    default: 'all'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  timeTaken: {
    type: Number, // in seconds
    min: 0
  },
  questionsAnswered: {
    type: Number,
    default: 0
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1 // Default to 1 for the first attempt
  },
  expiresAt: {
    type: Date // To track when the test expires
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better performance
providerTestSchema.index({ provider: 1, status: 1 });
providerTestSchema.index({ completedAt: -1 });
providerTestSchema.index({ score: -1 });

// Virtuals
providerTestSchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return Math.floor((this.completedAt - this.startedAt) / 1000); // in seconds
  }
  return null;
});

// Pre-save hooks
providerTestSchema.pre('save', function(next) {
  // Auto-calculate passed status if score changes
  if (this.isModified('score')) {
    this.passed = this.score >= 70; // Passing threshold
  }

  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Calculate timeTaken if completed
  if (this.status === 'completed' && this.completedAt && this.startedAt && !this.timeTaken) {
    this.timeTaken = Math.floor((this.completedAt - this.startedAt) / 1000);
  }

  next();
});

const ProviderTest = mongoose.model('ProviderTest', providerTestSchema);

module.exports = ProviderTest;
