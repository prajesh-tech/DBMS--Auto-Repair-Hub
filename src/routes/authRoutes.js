const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin, requireRole } = require('../middleware/authMiddleware');
const {
    validateEmployeeLink,
    validateLogin,
    validateRegister,
    validateChangePassword
} = require('../middleware/validationMiddleware');

router.put('/users/:id/employee', verifyToken, requireAdmin, validateEmployeeLink, authController.linkEmployee);
router.post('/login', validateLogin, authController.login);
router.post('/register', verifyToken, requireAdmin, validateRegister, authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/change-password', verifyToken, requireRole(['admin', 'staff', 'mechanic']), validateChangePassword, authController.changePassword);
router.get('/me', verifyToken, requireRole(['admin', 'staff', 'mechanic']), authController.getMe);

module.exports = router;
