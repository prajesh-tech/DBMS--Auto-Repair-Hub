const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateLogin, validateRegister } = require('../middleware/validationMiddleware');

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
