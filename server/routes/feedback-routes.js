const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getCustomerFeedbacks,
  getProviderFeedbacks,
  getProviderAverageRating,
  getAllFeedbacks,
  getFeedback,
  editFeedback,
  getServiceFeedbacks
} = require('../controllers/feedback-controller');
const { userAuthMiddleware } = require('../middlewares/User-middleware');
const { providerAuthMiddleware } = require('../middlewares/Provider-middleware');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Customer routes
router.post('/', userAuthMiddleware, submitFeedback);
router.get('/my-feedbacks', userAuthMiddleware, getCustomerFeedbacks);
router.get('/:feedbackId', userAuthMiddleware, getFeedback);
router.put('/edit/:feedbackId', userAuthMiddleware, editFeedback);

// Public route to get all feedbacks for a specific service
router.get('/service/:serviceId', getServiceFeedbacks);

// Provider routes
router.get('/provider/my-feedbacks', providerAuthMiddleware, getProviderFeedbacks);
router.get('/provider/average-rating', providerAuthMiddleware, getProviderAverageRating);

// Admin routes
router.get('/admin/all-feedbacks', adminAuthMiddleware, getAllFeedbacks);


module.exports = router;