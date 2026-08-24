const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, partController.getParts);
router.get('/:id', verifyToken, partController.getPartById);
router.post('/', verifyToken, partController.createPart);
router.put('/:id', verifyToken, partController.updatePart);
router.delete('/:id', verifyToken, partController.deletePart);

module.exports = router;
