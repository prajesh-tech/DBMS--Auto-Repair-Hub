const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { 
    validateIdParam, 
    validateCreateCar, 
    validateUpdateCar 
} = require('../middleware/validationMiddleware');

// View access for admin, staff, and mechanic
router.get('/', verifyToken, requireRole(['admin', 'staff', 'mechanic']), carController.getCars);
router.get('/:id', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateIdParam('id'), carController.getCarById);

// Modification access restricted to admin and staff
router.post('/', verifyToken, requireRole(['admin', 'staff']), validateCreateCar, carController.createCar);
router.put('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), validateUpdateCar, carController.updateCar);
router.delete('/:id', verifyToken, requireRole(['admin', 'staff']), validateIdParam('id'), carController.deleteCar);

module.exports = router;
