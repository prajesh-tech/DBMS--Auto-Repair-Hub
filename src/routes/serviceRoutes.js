const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
    validateIdParam,
    validateCreateServiceJob,
    validateUpdateServiceJob,
    validateAddPartToJob
} = require('../middleware/validationMiddleware');

// View access for admin, staff, and mechanic
router.get('/', verifyToken, requireRole(['admin', 'staff', 'mechanic']), serviceController.getServices);
router.get('/:id', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), serviceController.getServiceById);
router.get('/:id/invoice', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), serviceController.downloadInvoicePDF);

// Work order creation restricted to admin and staff
router.post('/', verifyToken, requireRole(['admin', 'staff']), validateCreateServiceJob, serviceController.createService);

// Part assignment accessible to admin, staff, and mechanic
router.post('/:id/parts', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), validateAddPartToJob, serviceController.addPartToServiceJob);
router.delete('/:id/parts/:jobPartId', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), validateIdParam('jobPartId'), serviceController.removePartFromServiceJob);

// Updating service job accessible to admin, staff, and mechanic (mechanics can update status/description)
router.put('/:id', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), validateUpdateServiceJob, serviceController.updateService);

// Deleting service job restricted to admin and staff
router.delete('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), serviceController.deleteService);

module.exports = router;
