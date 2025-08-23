const express = require('express');
const router = express.Router();
const providerController = require('../controllers/Provider-controller');
const { providerAuthMiddleware, providerTestPassedMiddleware } = require('../middlewares/Provider-middleware');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');
const { uploadProfilePic, uploadResume, uploadPassbookImg, upload } = require('../middlewares/upload');

// Registration Routes (Public)
router.post('/register/initiate', providerController.initiateRegistration);
router.post('/register/complete', providerController.completeRegistration);
router.post('/login-for-completion', providerController.loginForCompletion);

// Service Categories Route (Public)
router.get('/service-categories', providerController.getServiceCategories);

// Profile Completion Route (Private)
router.put('/profile/complete', 
  providerAuthMiddleware, 
  upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'passbookImage', maxCount: 1 }
  ]),
  providerController.completeProfile
);

// Profile Routes (Protected)
router.get('/profile', providerAuthMiddleware, providerController.getProfile);

// Unified Profile Update Route (Protected) - handles all profile updates
router.put('/profile', 
  providerAuthMiddleware, 
  upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'resume', maxCount: 1 },
    { name: 'passbookImage', maxCount: 1 }
  ]),
  providerController.updateProviderProfile
);

// Document Viewing Route (Protected)
router.get('/document/:type', providerAuthMiddleware, providerController.viewDocument);

// Backward compatibility routes (these will redirect to the unified endpoint)
router.put('/profile/professional', 
  providerAuthMiddleware, 
  providerTestPassedMiddleware, 
  (req, res, next) => {
    req.body.updateType = 'professional';
    next();
  },
  providerController.updateProviderProfile
);

router.put('/profile/address', 
  providerAuthMiddleware, 
  (req, res, next) => {
    req.body.updateType = 'address';
    next();
  },
  providerController.updateProviderProfile
);

router.put('/profile/bank', 
  providerAuthMiddleware, 
  uploadPassbookImg.single('passbookImage'), 
  (req, res, next) => {
    req.body.updateType = 'bank';
    next();
  },
  providerController.updateProviderProfile
);

router.put('/profile/picture', 
  providerAuthMiddleware, 
  uploadProfilePic.single('profilePic'), 
  (req, res, next) => {
    req.body.updateType = 'basic';
    next();
  },
  providerController.updateProviderProfile
);

router.put('/profile/resume', 
  providerAuthMiddleware, 
  uploadResume.single('resume'), 
  (req, res, next) => {
    req.body.updateType = 'professional';
    next();
  },
  providerController.updateProviderProfile
);

// Account Deletion Routes
router.delete('/profile', providerAuthMiddleware, providerController.deleteAccount);
router.delete('/:id/permanent', adminAuthMiddleware, providerController.permanentDeleteAccount);

module.exports = router;