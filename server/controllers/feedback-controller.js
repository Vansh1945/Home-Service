const mongoose = require('mongoose');
const Feedback = require('../models/Feedback-model');
const Booking = require('../models/Booking-model');
const Service = require('../models/Service-model');
const User = require('../models/User-model');
const Provider = require('../models/Provider-model');

// Helper function to update service feedback in Service model
const updateServiceFeedback = async (serviceId, feedbackId, updateData) => {
  try {
    const service = await Service.findById(serviceId);
    if (!service) return;

    // Find the index of the feedback to update
    const feedbackIndex = service.feedback.findIndex(
      f => f._id.equals(feedbackId)
    );

    if (feedbackIndex === -1) return;

    // Update the specific feedback
    if (updateData.rating !== undefined) {
      service.feedback[feedbackIndex].rating = updateData.rating;
    }
    if (updateData.comment !== undefined) {
      service.feedback[feedbackIndex].comment = updateData.comment;
    }
    service.feedback[feedbackIndex].updatedAt = new Date();

    await service.save();
    await updateServiceAverageRating(serviceId);
  } catch (error) {
    console.error('Error updating service feedback:', error);
    throw error;
  }
};

// Helper function to update service average rating
const updateServiceAverageRating = async (serviceId) => {
  try {
    const service = await Service.findById(serviceId);
    if (!service) return;

    if (!service.feedback || service.feedback.length === 0) {
      service.averageRating = 0;
      service.ratingCount = 0;
      await service.save();
      return;
    }

    const sum = service.feedback.reduce((acc, curr) => acc + curr.rating, 0);
    const average = sum / service.feedback.length;

    service.averageRating = parseFloat(average.toFixed(1));
    service.ratingCount = service.feedback.length;
    await service.save();
  } catch (error) {
    console.error('Error updating service average rating:', error);
    throw error;
  }
};

// @desc    Submit feedback for a booking
// @route   POST /api/feedback
// @access  Private (Customer)
const submitFeedback = async (req, res) => {
  try {
    const { 
      bookingId, 
      providerRating, 
      providerComment, 
      serviceRating, 
      serviceComment 
    } = req.body;
    const customerId = req.user._id;

    // Validate required fields
    if (!bookingId || !providerRating || !serviceRating) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, provider rating and service rating are required'
      });
    }

    // Check if booking exists and belongs to this customer
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
      status: 'completed'
    }).populate('provider', 'name email')
      .populate('services.service', 'title');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Completed booking not found or unauthorized'
      });
    }

    // Check if booking has at least one service
    if (!booking.services || booking.services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Booking has no services to provide feedback for'
      });
    }

    // Check for existing feedback
    const existingFeedback = await Feedback.findOne({ booking: bookingId });
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this booking'
      });
    }

    // Create new feedback
    const feedback = await Feedback.create({
      customer: customerId,
      booking: bookingId,
      providerFeedback: {
        provider: booking.provider._id,
        rating: providerRating,
        comment: providerComment || ''
      },
      serviceFeedback: {
        service: booking.services[0].service._id,
        rating: serviceRating,
        comment: serviceComment || ''
      }
    });

    // Update booking with feedback reference
    booking.feedback = feedback._id;
    await booking.save();

    // Update provider's feedbacks array
    await Provider.findByIdAndUpdate(
      booking.provider._id,
      { $push: { feedbacks: feedback._id } }
    );

    // Add feedback to service
    const service = await Service.findById(booking.services[0].service._id);
    service.feedback.push({
      rating: serviceRating,
      comment: serviceComment || '',
      customer: customerId,
      feedbackId: feedback._id // Store reference to original feedback
    });
    await service.save();

    // Update service average rating
    await updateServiceAverageRating(service._id);

    return res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting feedback'
    });
  }
};

// @desc    Get customer's own feedbacks
// @route   GET /api/feedback/my-feedbacks
// @access  Private (Customer)
const getCustomerFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ customer: req.user._id })
      .populate({
        path: 'providerFeedback.provider',
        select: 'name profilePicUrl'
      })
      .populate({
        path: 'serviceFeedback.service',
        select: 'title image averageRating'
      })
      .populate('booking', 'date')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    console.error('Error getting customer feedbacks:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching feedbacks'
    });
  }
};

// @desc    Get single feedback (customer can only view their own)
// @route   GET /api/feedback/:feedbackId
// @access  Private (Customer)
const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({
      _id: req.params.feedbackId,
      customer: req.user._id
    })
      .populate({
        path: 'providerFeedback.provider',
        select: 'name profilePicUrl'
      })
      .populate({
        path: 'serviceFeedback.service',
        select: 'title image averageRating'
      })
      .populate('booking', 'date');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or unauthorized'
      });
    }

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching feedback'
    });
  }
};

// @desc    Edit feedback (customer can only edit their own)
// @route   PUT /api/feedback/:feedbackId
// @access  Private (Customer)
const editFeedback = async (req, res) => {
  try {
    const {
      providerRating,
      providerComment,
      serviceRating,
      serviceComment
    } = req.body;

    // Validate feedback ID
    if (!mongoose.Types.ObjectId.isValid(req.params.feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID format'
      });
    }

    // Find the feedback
    const feedback = await Feedback.findOne({
      _id: req.params.feedbackId,
      customer: req.user._id
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or unauthorized'
      });
    }

    // Check if feedback is too old to edit (e.g., 7 days)
    const daysOld = (Date.now() - feedback.createdAt) / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      return res.status(400).json({
        success: false,
        message: 'Feedback cannot be edited after 7 days'
      });
    }

    // Track changes for service feedback
    const serviceRatingChanged = serviceRating !== undefined && 
                               serviceRating !== feedback.serviceFeedback.rating;
    const serviceCommentChanged = serviceComment !== undefined && 
                                 serviceComment !== feedback.serviceFeedback.comment;

    // Update provider feedback if provided
    if (providerRating !== undefined) {
      feedback.providerFeedback.rating = providerRating;
      feedback.providerFeedback.comment = providerComment || feedback.providerFeedback.comment;
      feedback.providerFeedback.isEdited = true;
    }

    // Update service feedback if provided
    if (serviceRating !== undefined) {
      feedback.serviceFeedback.rating = serviceRating;
      feedback.serviceFeedback.comment = serviceComment || feedback.serviceFeedback.comment;
      feedback.serviceFeedback.isEdited = true;
    }

    await feedback.save();

    // Update service feedback if service rating or comment changed
    if (serviceRatingChanged || serviceCommentChanged) {
      await updateServiceFeedback(
        feedback.serviceFeedback.service, 
        feedback._id,
        {
          rating: feedback.serviceFeedback.rating,
          comment: feedback.serviceFeedback.comment
        }
      );
    }

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error editing feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while editing feedback'
    });
  }
};

// @desc    Delete feedback (customer can only delete their own)
// @route   DELETE /api/feedback/:feedbackId
// @access  Private (Customer)
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndDelete({
      _id: req.params.feedbackId,
      customer: req.user._id
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found or unauthorized'
      });
    }

    // Remove feedback reference from booking
    await Booking.findByIdAndUpdate(
      feedback.booking,
      { $unset: { feedback: 1 } }
    );

    // Remove feedback reference from provider
    await Provider.findByIdAndUpdate(
      feedback.providerFeedback.provider,
      { $pull: { feedbacks: feedback._id } }
    );

    // Remove feedback from service
    await updateServiceFeedback(
      feedback.serviceFeedback.service, 
      feedback._id, 
      'remove'
    );

    return res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting feedback'
    });
  }
};

// @desc    Get provider's feedbacks
// @route   GET /api/feedback/provider/my-feedbacks
// @access  Private (Provider)
const getProviderFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({
      'providerFeedback.provider': req.provider._id
    })
      .populate('customer', 'name profilePicUrl')
      .populate({
        path: 'serviceFeedback.service',
        select: 'title image'
      })
      .populate({
        path: 'booking',
        select: '_id date time status totalAmount address services',
        populate: {
          path: 'services.service',
          select: 'title'
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    console.error('Error getting provider feedbacks:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching feedbacks'
    });
  }
};

// @desc    Get provider's average rating
// @route   GET /api/feedback/provider/average-rating
// @access  Private (Provider)
const getProviderAverageRating = async (req, res) => {
  try {
    const result = await Feedback.aggregate([
      { $match: { 'providerFeedback.provider': req.provider._id } },
      { $group: { _id: null, avgRating: { $avg: '$providerFeedback.rating' }, count: { $sum: 1 } } }
    ]);

    const averageRating = result.length > 0 ? parseFloat(result[0].avgRating.toFixed(1)) : 0;
    const ratingCount = result.length > 0 ? result[0].count : 0;

    return res.status(200).json({
      success: true,
      data: {
        averageRating,
        ratingCount
      }
    });
  } catch (error) {
    console.error('Error getting provider average rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating average rating'
    });
  }
};

// @desc    Get all feedbacks (admin only)
// @route   GET /api/feedback/admin/all-feedbacks
// @access  Private (Admin)
const getAllFeedbacks = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find()
      .populate('customer', 'name email')
      .populate({
        path: 'providerFeedback.provider',
        select: 'name email'
      })
      .populate({
        path: 'serviceFeedback.service',
        select: 'title category'
      })
      .populate('booking', 'date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments();

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: feedbacks
    });
  } catch (error) {
    console.error('Error getting all feedbacks:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching feedbacks'
    });
  }
};


/**
 * @desc    Get all feedbacks for a specific service (public)
 * @route   GET /api/feedback/service/:serviceId
 * @access  Public
 */
const getServiceFeedbacks = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    // Validate serviceId
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw new BadRequestError('Invalid service ID');
    }

    // Check if service exists
    const serviceExists = await Service.exists({ _id: serviceId });
    if (!serviceExists) {
      throw new NotFoundError('Service not found');
    }

    // Get all feedbacks for this service that have serviceFeedback
    const feedbacks = await Feedback.find({ 
      'serviceFeedback.service': serviceId 
    })
    .select('serviceFeedback customer createdAt')
    .populate({
      path: 'customer',
      select: 'name avatar'
    })
    .sort({ createdAt: -1 }) // Newest first
    .lean();

    // Format the response
    const formattedFeedbacks = feedbacks.map(feedback => ({
      _id: feedback._id,
      rating: feedback.serviceFeedback.rating,
      comment: feedback.serviceFeedback.comment,
      isEdited: feedback.serviceFeedback.isEdited,
      createdAt: feedback.createdAt,
      customer: {
        _id: feedback.customer?._id,
        name: feedback.customer?.name || 'Anonymous',
        avatar: feedback.customer?.avatar
      }
    }));

    // Calculate average rating
    let averageRating = 0;
    if (formattedFeedbacks.length > 0) {
      const sum = formattedFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = parseFloat((sum / formattedFeedbacks.length).toFixed(1));
    }

    res.status(200).json({
      success: true,
      count: formattedFeedbacks.length,
      averageRating,
      data: formattedFeedbacks
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getCustomerFeedbacks,
  getFeedback,
  editFeedback,
  deleteFeedback,
  getProviderFeedbacks,
  getProviderAverageRating,
  getAllFeedbacks,
  updateServiceAverageRating ,
  getServiceFeedbacks
};