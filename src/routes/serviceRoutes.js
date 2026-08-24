const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, serviceController.getServices);
router.get('/:id', verifyToken, serviceController.getServiceById);
router.get('/:id/invoice', verifyToken, serviceController.downloadInvoicePDF);
router.post('/', verifyToken, serviceController.createService);
router.post('/:id/parts', verifyToken, serviceController.addPartToServiceJob);
router.delete('/:id/parts/:jobPartId', verifyToken, serviceController.removePartFromServiceJob);
router.put('/:id', verifyToken, serviceController.updateService);
router.delete('/:id', verifyToken, serviceController.deleteService);

module.exports = router;
