import express from 'express';
import { buyerRoute, protectRoute } from '../middleware/auth.middleware.js';
import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/wishlist.controller.js';

const router = express.Router();

//Buyer Access - Wishlist management
router.get('/my', protectRoute, buyerRoute, getMyWishlist);
router.post('/add', protectRoute, buyerRoute, addToWishlist);
router.delete('/remove', protectRoute, buyerRoute, removeFromWishlist);

export default router;