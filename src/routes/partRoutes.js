const { validateList } = require('../middleware/validationMiddleware');
const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
    validateIdParam,
    validateCreatePart,
    validateUpdatePart
} = require('../middleware/validationMiddleware');

// View access for admin, staff, and mechanic
router.get('/', verifyToken, requireRole(['admin', 'staff']), validateList, partController.getParts);
router.get('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), partController.getPartById);

// Inventory mutations restricted to admin and staff
router.post('/', verifyToken, requireRole(['admin', 'staff']), validateCreatePart, partController.createPart);
router.put('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), validateUpdatePart, partController.updatePart);
router.delete('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), partController.deletePart);

module.exports = router;
