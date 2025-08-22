const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/Services-controller');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');
const providerAuthMiddleware = require('../middlewares/Provider-middleware');
const { uploadServiceImage, uploadServicesFile, upload} = require('../middlewares/upload');

/**
 * ADMIN ROUTES
 */
router.post('/admin/services',
    adminAuthMiddleware,
    uploadServiceImage.single('image'),
    serviceController.createService
);

router.put('/admin/service/:id',
    adminAuthMiddleware,
    uploadServiceImage.single('image'),
    serviceController.updateService
);

router.patch('/admin/services/:id/price',
    adminAuthMiddleware,
    serviceController.updateBasePrice
);

router.delete('/admin/services/:id',
    adminAuthMiddleware,
    serviceController.deleteService
);

router.get('/admin/services',
    adminAuthMiddleware,
    serviceController.getAllServices
);

router.get('/admin/services/:id',
    adminAuthMiddleware,
    serviceController.getServiceById
);

router.post('/admin/bulk-import', 
    adminAuthMiddleware,
    uploadServicesFile.single('servicesFile'), 
    serviceController.bulkImportServices
);

/**
 * PROVIDER ROUTES
 */
router.get('/provider/services',
    providerAuthMiddleware.providerAuthMiddleware,
    providerAuthMiddleware.providerTestPassedMiddleware,
    serviceController.getServicesForProvider
);

router.get('/provider/services/:id',
    providerAuthMiddleware.providerAuthMiddleware,
    providerAuthMiddleware.providerTestPassedMiddleware,
    serviceController.getServiceDetailsForProvider
);

/**
 * PUBLIC ROUTES
 */
router.get('/services', serviceController.getActiveServices);
router.get('/services/:id', serviceController.getPublicServiceById);
router.get('/services/category/:category', serviceController.getServicesByCategory);

module.exports = router;