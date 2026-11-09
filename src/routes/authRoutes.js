const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const {
    validateLogin,
    validateRegister,
    validateChangePassword
} = require('../middleware/validationMiddleware');

router.post('/login', validateLogin, authController.login);
router.post('/register', verifyToken, requireAdmin, validateRegister, authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/change-password', verifyToken, validateChangePassword, authController.changePassword);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
