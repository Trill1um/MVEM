import { client } from "../lib/redis.js";
import { User, tempUser } from "../models/User.js";
import jwt from "jsonwebtoken";
import {
  sendVerificationEmail,
  verifyCode,
} from "../services/verifyEmail.js";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

//Config: Production = secure-true, sameSite-none; Development = secure-false, sameSite-Strict
const cookieConfiguration = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Strict",
};

const genSetAccessToken = (res, userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  res.cookie("accessToken", accessToken, {
    ...cookieConfiguration,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  return accessToken;
};

const genSetRefreshToken = (res, userId) => {
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieConfiguration,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return refreshToken;
};

const storeRefreshToken = async (userId, refreshToken) => {
  try {
    await client.set(
      `refreshToken:${userId}`,
      refreshToken,
      "EX",
      60 * 60 * 24 * 7
    ); // 7 days
  } catch (error) {
    console.error("Error storing refresh token:", error);
  }
};

export const login = async (req, res) => {
  try {
    // console.log("Login route activated: ", req.body);
    const { contact, password } = req.body; // contact can be email or phone
    console.log(req.body)
    // Validate input
    if (!contact || !password) {
      return res
        .status(400)
        .json({ message: "Email/phone and password are required" });
    }

    // Determine if contact is email or phone
    const isEmail = contact.includes('@');
    const query = isEmail ? { email: contact } : { phoneNumber: contact };

    // Basic format validation
    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
    } else {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(contact)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }

    // Check credentials
    const user = await User.findOne(query);
    const isValidPassword = await user?.comparePassword(password);
    if (!user || !isValidPassword) {
      // console.log("Invalid login attempt for contact:", contact, isValidPassword);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = genSetAccessToken(res, user._id);
    const refreshToken = genSetRefreshToken(res, user._id);

    // Store refresh token
    await storeRefreshToken(user._id, refreshToken);

    // Clean up temp and cooldown tokens
    await client.del(`verify_cooldown:${contact}`);

    // console.log("User authenticated successfully:", user);
    return res.status(200).json({
      user,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signup = async (req, res) => {
  const { name, email, phoneNumber, password, address, confirmPassword, role } =
    req.body;
  try {
    // console.log("ChecK: ", req.body)
    // Validate input
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email && !phoneNumber) {
      return res.status(400).json({ message: "Either email or phone number is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    
    if (role === "farmer") {
      if (!address || address.trim() === "") {
        return res.status(400).json({
          message: "Farm address is required for farmers",
        });
      }
      if (address.length < 10) {
        return res.status(400).json({
          message: "Please provide a complete farm address",
        });
      }
    }

    // Check if user already exists
    const existingUser = email ? await User.findOne({ email }) : await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ message: "User already registered with this contact information" });
    }

    // Check if there's a pending verification
    const pendingVerification = email ? await tempUser.findOne({ email }) : await tempUser.findOne({ phoneNumber });
    if (pendingVerification) {
      return res.status(409).json({ message: "Pending verification already exists for this contact" });
    }

    const user = {
      name,
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
      password,
      role,
      address: role === "farmer" ? address : undefined,
    };
    // Create temp user data
    try {
      await tempUser.create(user);
    } catch (error) {
      console.error("Error creating temp user:", error);
      throw error;
    }

    await client.set(`verifying:${user.email}`, "true", "EX", 60 * 20); // 20 minutes
    // console.log("Finished creating temp user, proceed to send verification email");
    res.status(201).json({ message: "User created, please verify your email" });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      // Remove refresh token from Redis
      await client.del(`refreshToken:${decoded.userId}`);
    }

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyReceive = async (req, res) => {
  try {
    const { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({ message: "Code and email are required" });
    }

    // Verify token
    const isValid = await verifyCode(code, email);

    if (!isValid?.success) {
      return res
        .status(410)
        .json({ message: isValid.message || "Invalid or expired Verification URL" });
    }

    // Check if user already exists
    const check = await User.findOne({ email });
    if (check) {
      return res.status(404).json({ message: "User already exists found" });
    }

    // Check for Pending Verification
    const temp = await tempUser.findOne({ email });
    if (!temp) {
      return res.status(404).json({ message: "No pending verification found for this email." });
    }

    // Create Verified User
    const user = await User.create({
      name: temp.name,
      email: temp.email,
      phoneNumber: temp.phoneNumber,
      password: temp.password,
      role: temp.role,
      address: temp.address,
    });

    //Delete Temp User and verifying flag
    await tempUser.deleteOne({ email });
    await client.del(`verifying:${email}`);
    await client.del(`verify_cooldown:${email}`);

    // Generate tokens~
    const accessToken = genSetAccessToken(res, user._id);
    const refreshToken = genSetRefreshToken(res, user._id);

    // Store refresh token
    await storeRefreshToken(user._id, refreshToken);

    // Clean up temp and cooldown tokens

    // console.log("Finish verifying successful");
    return res.status(200).json({ message: "Email verification successful" });
  } catch (error) {
    return res.status(500).json({ message: error.response?.data.message || "Internal server error" });
  }
};


// TODO: Add SMS Verification for SMS Based Signups
export const verifySend = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ message: "Email is required" });
    }
    const response = await sendVerificationEmail(userEmail);
    if (!response.success) {
      console.error("Error sending verification email:", response.error);
      return res.status(400).json({ message: response.message || "Failed to send verification email" });
    }
    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error?.message || "Internal server error" });
  }
};

export const cancelVerification = async (req, res) => {
  try {
    // console.log("Cancelation started")
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Delete redis keys related to verification
    await client.del(`verifying:${email}`);
    await client.del(`verify_cooldown:${email}`);

    // Remove temp user document
    await tempUser.deleteOne({ email });

    return res.status(200).json({ message: "Verification cancelled" });
  } catch (error) {
    console.error("Error cancelling verification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.userId;

    // Check if the refresh token exists in Redis
    const storedToken = await client.get(`refreshToken:${userId}`);
    if (storedToken !== refreshToken) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token only
    genSetAccessToken(res, userId);

    res.status(200).json({ message: "Tokens refreshed successfully" });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    // console.log("getProfile route activated");
    res.json(req.user);
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};