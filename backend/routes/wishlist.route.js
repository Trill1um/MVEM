import express from 'express';
import { buyerRoute, protectRoute } from '../middleware/auth.middleware.js';
import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/wishlist.controller.js';

const router = express.Router();

//Buyer Access - Wishlist management
router.get('/wishlist/my', protectRoute, buyerRoute, getMyWishlist);
router.post('/wishlist/add', protectRoute, buyerRoute, addToWishlist);
router.delete('/wishlist/remove', protectRoute, buyerRoute, removeFromWishlist);

export default router;