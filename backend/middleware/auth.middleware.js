import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No Access Token Provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user; // Attach user to request object for further use
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Unauthorized - Access Token Expired" });
      }
      throw error; // Re-throw other errors to be caught by the outer catch block
    }
  } catch (error) {
    res.status(401).json({ message: "Unauthorized - Invalid Access Token" });
  }
};

export const farmerRoute = async (req, res, next) => {
  try {
    // console.log("Farmer route accessed by user:", req.user);
    if (req.user.role !== "farmer") {
      return res.status(403).json({ message: "Forbidden - Farmers Only" });
    }
    next();
  } catch (error) {
    console.error("Error in farmerRoute middleware:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const buyerRoute = async (req, res, next) => {
  try {
    // console.log("Buyer route accessed by user:", req.user?.colonyName);
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Forbidden - Buyers Only" });
    }
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error);
    req.user = null;
    next();
  }
};

export const adminRoute = async (req, res, next) => {
  try {
    // console.log("Admin route accessed by user:", req.user?.name);
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden - Admins Only" });
    }
    next();
  } catch (error) {
    console.error("Error in adminRoute middleware:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
