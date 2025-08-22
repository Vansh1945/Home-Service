const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/Commission-controller');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Admin routes for managing commission rules
router.post('/rules', adminAuthMiddleware, commissionController.createCommissionRule);
router.get('/rules/list', adminAuthMiddleware, commissionController.listCommissionRules);
router.patch('/rules/:id/toggle', adminAuthMiddleware, commissionController.toggleCommissionRuleStatus);
router.put('/rules/:id', adminAuthMiddleware, commissionController.updateCommissionRule); // New update route
router.delete('/rules/:id', adminAuthMiddleware, commissionController.deleteCommissionRule); // New delete route

// Booking commission processing
router.post('/process/:id', adminAuthMiddleware, commissionController.processBookingCommission);

// Provider commission details
router.get('/provider/:providerId', adminAuthMiddleware, commissionController.getProviderCommissionDetails);

module.exports = router;