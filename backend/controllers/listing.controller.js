import Listing from '../models/Listing.js';
import Produce from '../models/Produce.js';
import Wishlist from '../models/Wishlist.js';
import cloudinary from '../lib/cloudinary.js';
import mongoose from 'mongoose';

// ========== LISTING MANAGEMENT ==========

// Get all listings (public)
export const getAllListings = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, location } = req.query;
    let query = { status: 'available' };

    // Build filter query
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const listings = await Listing.find(query)
      .populate('produceId', 'name description category unit')
      .populate('farmerId', 'name address email phoneNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({ listings, message: "Listings fetched successfully" });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get specific listing by ID
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('produceId', 'name description category unit images')
      .populate('farmerId', 'name address email phoneNumber');
      
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json({ listing, message: "Listing fetched successfully" });
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all listings for a specific produce type
export const getListingsByProduce = async (req, res) => {
  try {
    const { id: produceId } = req.params;
    
    // Verify produce exists
    const produce = await Produce.findById(produceId);
    if (!produce) {
      return res.status(404).json({ message: "Produce type not found" });
    }
    
    const listings = await Listing.find({ produceId })
      .populate('farmerId', 'name address email phoneNumber')
      .sort(sortOptions);
    
    res.status(200).json({ 
      listings, 
      count: listings.length,
      message: "Listings for produce fetched successfully" 
    });
  } catch (error) {
    console.error("Error fetching listings by produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all listings for a specific farmer
export const getListingsByFarmer = async (req, res) => {
  try {
    // Get farmer ID from query parameter
    const farmerId = req.query.id;
    console.log("Fetching listings for farmer ID:", farmerId);
    
    if (!farmerId) {
      return res.status(400).json({ message: "Farmer ID is required as query parameter" });
    }
    
    let listings = await Listing.find({ farmerId })
      .populate('produceId', 'name description category unit images')
      .populate('farmerId', 'name address email phoneNumber')
      ;
    
    // Group listings by produce type for better organization
    const groupedByProduce = listings.reduce((acc, listing) => {
      if (listing.produceId) {
        const produceKey = listing.produceId._id.toString();
        if (!acc[produceKey]) {
          acc[produceKey] = {
            produce: {
              _id: listing.produceId._id,
              name: listing.produceId.name,
              description: listing.produceId.description,
              category: listing.produceId.category,
              unit: listing.produceId.unit,
              images: listing.produceId.images
            },
            listings: []
          };
        }
        acc[produceKey].listings.push({
          _id: listing._id,
          price: listing.price,
          stock: listing.stock,
          harvestDate: listing.harvestDate,
          status: listing.status,
          images: listing.images,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt
        });
      }
      return acc;
    }, {});
    
    res.status(200).json({ 
      groupedByProduce: Object.values(groupedByProduce),
      // totalListings: listings.length,
      message: "Farmer listings fetched successfully" 
    });
  } catch (error) {
    console.error("Error fetching listings by farmer:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Create listing
export const createListing = async (req, res) => {
  try {
    const {
      produceName,
      produceCategory,

      produceDescription,
      produceUnit,
      price,
      stock,
      harvestDate,
      images = [],
    } = req.body;

    // Validate input
    if (((!produceName || !produceCategory || !produceUnit)) || !price || stock === undefined || !harvestDate) {
      return res.status(400).json({ message: "All fields are required. Provide either produceId or produce details (name, category, unit)" });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }

    if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      return res.status(400).json({ message: "Stock must be a non-negative integer" });
    }

    // Validate and parse harvest date
    const parsedHarvestDate = new Date(harvestDate);
    if (isNaN(parsedHarvestDate.getTime())) {
      return res.status(400).json({ 
        message: "Invalid harvest date format. Please use ISO date format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)" 
      });
    }

    if (parsedHarvestDate > new Date()) {
      return res.status(400).json({ message: "Harvest date cannot be in the future" });
    }

    // Get generic Produce
    let produce = await Produce.findOne({
      name: produceName.toLowerCase().trim(),
      category: produceCategory.toLowerCase().trim()
    });
    
    if (!produce) {
        // Create new produce type
        produce = await Produce.create({
          name: produceName.toLowerCase().trim(),
          description: produceDescription || `Fresh ${produceName}`,
          category: produceCategory.toLowerCase().trim(),
          unit: produceUnit,
          images: [] // Generic produce images can be added later
        });
        console.log("Created new produce:", produce);
    }
    console.log("Used Existing Produce")

    // Check if current Farmer already has a listing for this produce type
    const existingListing = await Listing.findOne({
      farmerId: req.user.id,
      produceId: produce._id
    });

    if (existingListing) {
      return res.status(409).json({ message: "You already have a listing for this produce type" });
    }

    // Handle image upload
    let cloudinaryResponses = [];

    if (images.length > 0) {
      try {
        const uploadPromises = images.map((image) =>
          cloudinary.uploader.upload(image.base64, { folder: "listings" })
        );
        cloudinaryResponses = await Promise.all(uploadPromises);
      } catch (error) {
        console.error("Error uploading images:", error);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // Create listing
    const listing = await Listing.create({
      farmerId: req.user.id,
      produceId: produce._id,
      price: parseFloat(price),
      stock: parseInt(stock),
      harvestDate: parsedHarvestDate,
      images: cloudinaryResponses
        ?.filter((response) => response.secure_url)
        .map((response) => response.secure_url) || [],
    });
    
    // Notify interested buyers
    try {
      const interestedBuyers = await Wishlist.findInterestedBuyers(
        produce.name,
        produce.category,
        listing._id,
      );
      
      // TODO: Implement notification sending logic
      // await sendNotifications(interestedBuyers, listing, produce);
      
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the listing creation if notifications fail
    }

    const populatedListing = await Listing.findById(listing._id)
      .populate('produceId', 'name description category unit');

    res.status(201).json({ 
      listing: populatedListing, 
      message: "Listing created successfully" 
    });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update listing
export const updateListing = async (req, res) => {
  try {
    const {
      price,
      stock,
      harvestDate,
      status,
      images,
      imageChanged,
    } = req.body;

    // Validate input
    if (price !== undefined && (isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    if (stock !== undefined && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      return res.status(400).json({ message: "Stock must be a non-negative integer" });
    }
    
    // Validate harvest date if provided
    let parsedHarvestDate;
    if (harvestDate) {
      parsedHarvestDate = new Date(harvestDate);
      if (isNaN(parsedHarvestDate.getTime())) {
        return res.status(400).json({ 
          message: "Invalid harvest date format. Please use ISO date format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)" 
        });
      }
      if (parsedHarvestDate > new Date()) {
        return res.status(400).json({ message: "Harvest date cannot be in the future" });
      }
    }

    if (status && !['available', 'out of stock', 'expired'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    if (imageChanged && (!images || images.length === 0)) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check ownership
    if (listing.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to update this listing" });
    }

    // Handle image updates
    let updatedImages = listing.images || [];

    if (imageChanged && images && images.length > 0) {
      try {
        // Delete old images
        if (listing.images && listing.images.length > 0) {
          const deletePromises = listing.images.map(async (imageUrl) => {
            try {
              const publicId = imageUrl.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`listings/${publicId}`);
            } catch (deleteError) {
              console.warn(`Failed to delete image: ${imageUrl}`, deleteError);
            }
          });
          await Promise.all(deletePromises);
        }

        // Upload new images
        const uploadPromises = images.map((image) =>
          cloudinary.uploader.upload(
            typeof image === "object" ? image.base64 : image,
            { folder: "listings" }
          )
        );

        const cloudinaryResponses = await Promise.all(uploadPromises);
        updatedImages = cloudinaryResponses
          .filter((response) => response && response.secure_url)
          .map((response) => response.secure_url);
      } catch (error) {
        console.error("Error handling images:", error);
        return res.status(500).json({ message: "Image processing failed" });
      }
    }

    // Update listing
    if (price !== undefined) listing.price = parseFloat(price);
    if (stock !== undefined) listing.stock = parseInt(stock);
    if (harvestDate) listing.harvestDate = parsedHarvestDate;
    if (status) listing.status = status;
    listing.images = updatedImages;

    // Auto-update status based on stock
    if (listing.stock > 0) 
      listing.status = 'available';
    else
      listing.status = 'out of stock';

    await listing.save();

    res.status(200).json({ listing, message: "Listing updated successfully" });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Delete listing
export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check ownership
    if (listing.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to delete this listing" });
    }

    // Delete images from Cloudinary
    if (listing.images.length > 0) {
      try {
        const deletePromises = listing.images.map((imageUrl) => {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          return cloudinary.uploader.destroy(`listings/${publicId}`);
        });
        await Promise.all(deletePromises);
      } catch (error) {
        console.error("Error deleting images:", error);
      }
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};