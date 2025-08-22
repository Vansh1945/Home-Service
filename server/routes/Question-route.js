const express = require('express');
const router = express.Router();
const questionController = require('../controllers/Question-controller');
const adminAuthMiddleware = require('../middlewares/Admin-middleware');

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// Question CRUD routes
router.post('/',  questionController.addQuestion);
router.put('/edit/:id',  questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);
router.get('/get', questionController.getAllQuestions);
router.get('/:id', questionController.getQuestion);

// Bulk operations
router.post('/bulk', questionController.addBulkQuestions);

// Download PDF
router.get('/download/pdf', questionController.downloadQuestionsPDF);


module.exports = router;