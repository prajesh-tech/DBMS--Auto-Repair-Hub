const { validateList } = require('../middleware/validationMiddleware');
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
    validateIdParam,
    validateCreateEmployee,
    validateUpdateEmployee
} = require('../middleware/validationMiddleware');

// All employee directory operations strictly restricted to admin
router.get('/', verifyToken, requireRole(['admin']), validateList, employeeController.getEmployees);
router.get('/:id', verifyToken, requireRole(['admin']), validateIdParam('id'), employeeController.getEmployeeById);
router.post('/', verifyToken, requireRole(['admin']), validateCreateEmployee, employeeController.createEmployee);
router.put('/:id', verifyToken, requireRole(['admin']), validateIdParam('id'), validateUpdateEmployee, employeeController.updateEmployee);
router.delete('/:id', verifyToken, requireRole(['admin']), validateIdParam('id'), employeeController.deleteEmployee);

module.exports = router;
