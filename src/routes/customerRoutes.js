const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { 
    validateIdParam, 
    validateCreateCustomer, 
    validateUpdateCustomer 
} = require('../middleware/validationMiddleware');

// View access for admin, staff, and mechanic
router.get('/', verifyToken, requireRole(['admin', 'staff', 'mechanic']), customerController.getCustomers);
router.get('/:id', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), customerController.getCustomerById);

// Modification access restricted to admin and staff
router.post('/', verifyToken, requireRole(['admin', 'staff']), validateCreateCustomer, customerController.createCustomer);
router.put('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), validateUpdateCustomer, customerController.updateCustomer);
router.delete('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), customerController.deleteCustomer);

module.exports = router;
