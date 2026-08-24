const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, carController.getCars);
router.get('/:id', verifyToken, carController.getCarById);
router.post('/', verifyToken, carController.createCar);
router.put('/:id', verifyToken, carController.updateCar);
router.delete('/:id', verifyToken, carController.deleteCar);

module.exports = router;
