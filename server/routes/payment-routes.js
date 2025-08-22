// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { providerAuthMiddleware } = require('../middlewares/Provider-middleware');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Provider routes
router.get('/summary', providerAuthMiddleware, paymentController.getEarningsSummary);
router.post('/withdraw', providerAuthMiddleware, paymentController.requestWithdrawal);
router.get('/history', providerAuthMiddleware, paymentController.getPaymentHistory);
router.get('/earnings', providerAuthMiddleware, paymentController.getProviderEarnings);
router.get('/booking/:bookingId', providerAuthMiddleware, paymentController.getEarningsByBooking);
router.get('/download-statement-excel', providerAuthMiddleware, paymentController.downloadStatementExcel);
router.get('/earnings/statement', providerAuthMiddleware, paymentController.downloadStatement);

// Admin routes
router.get('/admin/earnings', adminAuthMiddleware, paymentController.getAllProviderEarnings);
router.post('/admin/bookings/:bookingId/process-payment', adminAuthMiddleware, paymentController.processBookingPayment);
router.get('/admin/requests', adminAuthMiddleware, paymentController.getAllWithdrawalRequests);
router.put('/admin/process/:recordId', adminAuthMiddleware, paymentController.processWithdrawal);
router.get('/admin/top-providers', adminAuthMiddleware, paymentController.getTopProviders);
router.get('/admin/generate-report', adminAuthMiddleware, paymentController.generateReport);
router.get('/admin/generate-report-excel', adminAuthMiddleware, paymentController.generateReportExcel);

module.exports = router;