import express from 'express';
import { farmerRoute, buyerRoute, protectRoute, adminRoute } from '../middleware/auth.middleware.js';
import {
  getAllProduce, 
  getProduce,
  createProduce,
  updateProduce,
  deleteProduce,
} from '../controllers/produce.controller.js';

const router = express.Router();

//Public Access - Browse produce and listings
router.get('/', getAllProduce); // Get all produce types
router.get('/:id', getProduce); // Get specific produce

//Admin Access
router.get('/admin/produce/:id', protectRoute, adminRoute, getProduce); 
router.post('/admin/produce/create', protectRoute, adminRoute, createProduce);
router.put('/admin/produce/update/:id', protectRoute, adminRoute, updateProduce); 
router.delete('/admin/produce/delete/:id', protectRoute, adminRoute, deleteProduce);

export default router;