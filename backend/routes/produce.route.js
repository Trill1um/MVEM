import express from 'express';
import { farmerRoute, buyerRoute, protectRoute, adminRoute } from '../middleware/auth.middleware.js';
import {
  getAllProduce, 
  getProduce,
  createProduce,
  updateProduce,
  deleteProduce
} from '../controllers/produce.controller.js';

const router = express.Router();

// ========== ADMIN ROUTES (Produce Management) ==========
router.post('/admin/create', protectRoute, adminRoute, createProduce);
router.put('/admin/:id', protectRoute, adminRoute, updateProduce); 
router.delete('/admin/:id', protectRoute, adminRoute, deleteProduce);

// ========== PUBLIC PRODUCE ROUTES ==========
router.get('/', getAllProduce); // Get all produce types
router.get('/:id', getProduce); // Get specific produce (must be last!)

export default router; 