const { validateList } = require('../middleware/validationMiddleware');
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, requireRole(['admin', 'staff']), validateList, dashboardController.getDashboardStats);

module.exports = router;
