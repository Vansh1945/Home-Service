const express = require('express');
const router = express.Router();
const {
  submitComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaint,
  resolveComplaint,
  reopenComplaint
} = require('../controllers/Complaint-controller');
const { uploadComplaintImage } = require('../middlewares/upload');
const {userAuthMiddleware} = require('../middlewares/User-middleware');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Customer routes
router.post(
  '/',
  userAuthMiddleware,
  uploadComplaintImage.single('imageProof'),
  submitComplaint
);

router.get(
  '/my-complaints',
  userAuthMiddleware,
  getMyComplaints
);

router.get(
  '/:id',
  userAuthMiddleware,
  getComplaint
);


router.put(
  '/:id/reopen',
  userAuthMiddleware,
  reopenComplaint
);


// Admin routes
router.get(
  '/',
  adminAuthMiddleware,
  getAllComplaints
);

router.put(
  '/:id/resolve',
  adminAuthMiddleware,
  resolveComplaint
);



module.exports = router;