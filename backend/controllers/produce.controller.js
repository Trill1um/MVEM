import Produce from "../models/Produce.js";
import Wishlist from "../models/Wishlist.js";
import cloudinary from "../lib/cloudinary.js";
import Listing from "../models/Listing.js";
import mongoose from "mongoose";

export const getAllProduce = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category) {
      query.category = category.toLowerCase().trim();
    }
    
    if (search) {
      query.name = { $regex: search.toLowerCase().trim(), $options: 'i' };
    }
    
    const produce = await Produce.find(query).sort({ name: 1 });
    res.status(200).json({ produce, message: "Produce catalog fetched successfully" });
  } catch (error) {
    console.error("Error fetching produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProduce = async (req, res) => {
  try {
    const produce = await Produce.findById(req.params.id);
    if (!produce) {
      return res.status(404).json({ message: "Produce not found" });
    }
    
    // Get available listings for this produce type
    const availableListings = await Listing.find({ 
      produceId: req.params.id, 
      status: 'available',
      stock: { $gt: 0 }
    })
    .populate('farmerId', 'name address email phoneNumber')
    .sort({ price: 1 }); // Sort by price ascending
    
    res.status(200).json({ 
      produce, 
      availableListings,
      message: "Produce details fetched successfully" 
    });
  } catch (error) {
    console.error("Error fetching produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createProduce = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      unit,
      images = [],
    } = req.body;

    // Validate input
    if (!name || !description || !category || !unit) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if produce already exists
    const existingProduce = await Produce.findOne({ 
      name: name.toLowerCase().trim(),
      category: category.toLowerCase().trim()
    });
    
    if (existingProduce) {
      return res.status(409).json({ message: "Produce type already exists" });
    }

    let cloudinaryResponses = [];

    if (images.length > 5) {
      return res.status(400).json({ message: "Maximum 5 images allowed" });
    }

    // Handle image upload
    if (images.length > 0) {
      try {
        const uploadPromises = images.map((image) =>
          cloudinary.uploader.upload(image.base64, { folder: "produce" })
        );
        cloudinaryResponses = await Promise.all(uploadPromises);
      } catch (error) {
        console.error("Error uploading images to Cloudinary:", error);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } 

    const produce = await Produce.create({
      name: name.toLowerCase().trim(),
      description,
      category: category.toLowerCase().trim(),
      unit,
      images: cloudinaryResponses
        ?.filter((response) => response.secure_url)
        .map((response) => response.secure_url) || [],
      images: [],
    });

    res.status(201).json({ produce, message: "Produce created successfully" });
  } catch (error) {
    console.error("Error creating produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProduce = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      unit,
      images,
      imageChanged,
    } = req.body;

    const produce = await Produce.findById(req.params.id);
    if (!produce) {
      return res.status(404).json({ message: "Produce not found" });
    }

    // Validate input
    if (name && !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (description && !description.trim()) {
      return res.status(400).json({ message: "Description cannot be empty" });
    }
    if (category && !category.trim()) {
      return res.status(400).json({ message: "Category cannot be empty" });
    }
    if (unit && !unit.trim()) {
      return res.status(400).json({ message: "Unit cannot be empty" });
    }

    // Check if updated name/category combination already exists (excluding current produce)
    if (name || category) {
      const nameToCheck = name ? name.toLowerCase().trim() : produce.name;
      const categoryToCheck = category ? category.toLowerCase().trim() : produce.category;
      
      const existingProduce = await Produce.findOne({ 
        name: nameToCheck,
        category: categoryToCheck,
        _id: { $ne: req.params.id }
      });
      
      if (existingProduce) {
        return res.status(409).json({ message: "Produce type with this name and category already exists" });
      }
    }

    // Handle image updates
    let updatedImages = produce.images || [];

    if (imageChanged && images) {
      try {
        // Delete old images from Cloudinary
        if (produce.images && produce.images.length > 0) {
          const deletePromises = produce.images.map(async (imageUrl) => {
            try {
              const publicId = imageUrl.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`produce/${publicId}`);
            } catch (deleteError) {
              console.warn(`Failed to delete image: ${imageUrl}`, deleteError);
            }
          });
          await Promise.allSettled(deletePromises);
        }

        // Upload new images if provided
        if (images.length > 0) {
          if (images.length > 5) {
            return res.status(400).json({ message: "Maximum 5 images allowed" });
          }

          const uploadPromises = images.map((image) =>
            cloudinary.uploader.upload(
              typeof image === "object" ? image.base64 : image,
              { folder: "produce" }
            )
          );

          const cloudinaryResponses = await Promise.all(uploadPromises);
          updatedImages = cloudinaryResponses
            .filter((response) => response && response.secure_url)
            .map((response) => response.secure_url);
        } else {
          updatedImages = [];
        }
      } catch (error) {
        console.error("Error handling images:", error);
        return res.status(500).json({ message: "Image processing failed" });
      }
    }

    // Update produce fields
    if (name) produce.name = name.toLowerCase().trim();
    if (description) produce.description = description;
    if (category) produce.category = category.toLowerCase().trim();
    if (unit) produce.unit = unit;
    if (imageChanged) produce.images = updatedImages;

    await produce.save();

    res.status(200).json({ produce, message: "Produce updated successfully" });
  } catch (error) {
    console.error("Error updating produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteProduce = async (req, res) => {
  try {

    const produce = await Produce.findById(req.params.id);
    if (!produce) {
      return res.status(404).json({ message: "Produce not found" });
    }

    // Delete images from Cloudinary
    if (produce.images.length > 0) {
      try {
        const deletePromises = produce.images.map((imageUrl) => {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          return cloudinary.uploader.destroy(`produce/${publicId}`);
        });
        await Promise.all(deletePromises);
      } catch (error) {
        console.error("Error deleting images:", error);
      }
    }

    // Check if there are active listings for this produce
    const activeListings = await Listing.find({ produceId: req.params.id, status: 'available' });
    if (activeListings.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete produce with active listings. Please remove listings first." 
      });
    }

    await Produce.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Produce deleted successfully" });
  } catch (error) {
    console.error("Error deleting produce:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



