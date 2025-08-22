// routes/Booking-routes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/Booking-controller');

// Middleware imports
const { userAuthMiddleware } = require('../middlewares/User-middleware');
const { providerAuthMiddleware, providerTestPassedMiddleware } = require('../middlewares/Provider-middleware');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// USER ROUTES
router.post('/', userAuthMiddleware, bookingController.createBooking);
router.post('/confirm', userAuthMiddleware, bookingController.confirmBooking); 
router.patch('/:id/status', userAuthMiddleware, bookingController.updateBookingStatus);
router.get('/user', userAuthMiddleware, bookingController.getUserBookings);
router.get('/customer', userAuthMiddleware, bookingController.getCustomerBookings);
router.post('/:id/payment', userAuthMiddleware, bookingController.updateBookingPayment);
router.get('/providers/:id', userAuthMiddleware, bookingController.getProviderById);
router.get('/services/:id', userAuthMiddleware, bookingController.getServiceById);
router.get('/:id', userAuthMiddleware, bookingController.getBooking);
router.patch('/user/:id/cancel', userAuthMiddleware, bookingController.cancelBooking);
router.patch('/user/:id/reschedule', userAuthMiddleware, bookingController.userUpdateBookingDateTime);

// PROVIDER ROUTES
router.get('/provider-booking/:id', providerAuthMiddleware, bookingController.getProviderBookingById);
router.get('/provider/status/:status', providerAuthMiddleware, bookingController.getBookingsByStatus);
router.patch('/provider/:id/accept', providerAuthMiddleware, providerTestPassedMiddleware, bookingController.acceptBooking);
router.patch('/provider/:id/start', providerAuthMiddleware, providerTestPassedMiddleware, bookingController.startBooking);
router.patch('/provider/:id/reject', providerAuthMiddleware, providerTestPassedMiddleware, bookingController.rejectBooking);
router.patch('/provider/:id/complete', providerAuthMiddleware, providerTestPassedMiddleware, bookingController.completeBooking);



// ADMIN ROUTES 
router.get('/admin/bookings', adminAuthMiddleware, bookingController.getAllBookings);
router.get('/bookings/:id', adminAuthMiddleware, bookingController.getBookingDetails);
router.patch('/admin/:id/assign', adminAuthMiddleware, bookingController.assignProvider);
router.delete('/admin/:id', adminAuthMiddleware, bookingController.deleteBooking);
router.delete('/admin/user/:userId/booking/:bookingId', adminAuthMiddleware, bookingController.deleteUserBooking);
router.patch('/admin/:id/reschedule', adminAuthMiddleware, bookingController.updateBookingDateTime);

module.exports = router;
