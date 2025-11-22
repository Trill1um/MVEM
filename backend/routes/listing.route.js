import express from 'express';
import { farmerRoute, protectRoute } from '../middleware/auth.middleware.js';
import {
  getAllListings,
  getListingById,
  getListingsByFarmer,
  createListing,
  updateListing,
  deleteListing,
} from '../controllers/listing.controller.js';

const router = express.Router();

// Farmer Access - Manage listings (specific routes FIRST)
router.get('/my', protectRoute, farmerRoute, getListingsByFarmer);
router.post('/create', protectRoute, farmerRoute, createListing);
router.put('/update/:id', protectRoute, farmerRoute, updateListing);
router.delete('/delete/:id', protectRoute, farmerRoute, deleteListing);

// Public Access - Browse listings (parameterized routes LAST)
router.get('/all', getAllListings);
router.get('/:id', getListingById);

export default router;