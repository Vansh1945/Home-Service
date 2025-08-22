const express = require('express');
const router = express.Router();
const testController = require('../controllers/Test-controller');

const { providerAuthMiddleware } = require('../middlewares/Provider-middleware');





// ===================== PROVIDER ROUTES ===================== //
router.get('/categories', providerAuthMiddleware, testController.getTestCategories);
router.post('/start', providerAuthMiddleware, testController.startTest);
router.post('/submit', providerAuthMiddleware, testController.submitTest);
router.get('/results', providerAuthMiddleware, testController.getTestResults);
router.get('/details/:testId', providerAuthMiddleware, testController.getTestDetails);

module.exports = router;