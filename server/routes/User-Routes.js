const express = require('express');
const router = express.Router();
const { 
    register,
    getProfile,
    updateProfile,
    uploadProfilePicture,
    getCustomerDashboardStats
} = require('../controllers/User-controller');
const { userAuthMiddleware } = require('../middlewares/User-middleware');
const { uploadProfilePic } = require('../middlewares/upload');

// Public routes (no authentication required)
router.post("/register", register);

router.get('/profile', userAuthMiddleware, getProfile);
router.put('/profile-update', userAuthMiddleware, updateProfile);
router.post('/profile-picture', 
    userAuthMiddleware, 
    uploadProfilePic.single('profilePic'),
    uploadProfilePicture
);

router.get('/dashboard', userAuthMiddleware, getCustomerDashboardStats);



module.exports = router;