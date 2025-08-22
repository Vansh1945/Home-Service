const express = require('express');
const router = express.Router();
const adminController = require('../controllers/Admin-controller');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Public routes
router.post('/register', adminController.registerAdmin);

// Protected routes (require admin authentication)
router.use(adminAuthMiddleware); // Apply admin auth middleware to all routes below

// Admin profile
router.get('/profile', adminController.getAdminProfile);

// Admin management
router.get('/admins', adminController.getAllAdmins);

// Customer management
router.get('/customers', adminController.getAllCustomers);

// Provider management
router.get('/providers/pending', adminController.getPendingProviders);
router.put('/providers/:id/status', adminController.approveProvider); // Changed from /approve to /status
router.get('/providers', adminController.getAllProviders);
router.get('/providers/:id', adminController.getProviderDetails);
router.get('/providers/:id/documents/:type', adminController.getProviderDocument); // Consolidated document routes

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;