import Wishlist from '../models/Wishlist.js';

// Get buyer's wishlist
export const getMyWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.getBuyerWishlist(req.user.id);
    res.status(200).json({ 
      wishlist: wishlist || { lookingFor: [] }, 
      message: "Wishlist fetched successfully" 
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add to wishlist
export const addToWishlist = async (req, res) => {
  try {
    const { produceName } = req.body;
    
    if (!produceName) {
      return res.status(400).json({ message: "Produce name is required" });
    }

    let wishlist = await Wishlist.getBuyerWishlist(req.user.id);
    
    if (!wishlist) {
      // Create new wishlist
      wishlist = await Wishlist.create({
        buyer: req.user.id,
        lookingFor: [produceName.toLowerCase()]
      });
    } else {
      // Add to existing wishlist
      await wishlist.addToWishlist(produceName);
    }

    res.status(200).json({ 
      wishlist, 
      message: "Added to wishlist successfully" 
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove from wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const { produceName } = req.body;
    
    if (!produceName) {
      return res.status(400).json({ message: "Produce name is required" });
    }

    const wishlist = await Wishlist.getBuyerWishlist(req.user.id);
    
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    await wishlist.removeFromWishlist(produceName);

    res.status(200).json({ 
      wishlist, 
      message: "Removed from wishlist successfully" 
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};