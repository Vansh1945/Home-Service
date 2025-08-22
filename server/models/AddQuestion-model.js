const mongoose = require('mongoose');
const { Schema } = mongoose;

const questionSchema = new Schema({
  questionText: {
    type: String,
    required: true, 
    trim: true
  },
  options: {
    type: [String],
    required: true, 
    validate: {
      validator: function(v) {
        return v.length >= 2 && v.length <= 5;
      },
      message: 'Questions must have between 2-5 options'
    }
  },
  correctAnswer: {
    type: Number,
    required: true, 
    min: 0, 
    validate: {
      validator: function(v) {
        return v < this.options.length;
      },
      message: 'Correct answer index must be within options range'
    }
  },
  category: {
    type: String,
    required: true, 
    enum: ['electrical','general'],
    index: true
  },
  subcategory: {
    type: String,
    required: true,
    enum: ['wiring','ac','repair','all'],
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ isActive: 1 });

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;