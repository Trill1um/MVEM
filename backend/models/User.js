import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 50,
      minlength: 2,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 255,
      minlength: 10,
      required: function() {
        return this.role === 'farmer';
      }
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values while maintaining uniqueness for non-null values
      trim: true,
      maxlength: 100,
      minlength: 5,
      match: /.+\@.+\..+/,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      maxlength: 20,
      minlength: 10,
      match: /^[\+]?[1-9][\d]{0,15}$/,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
      maxlength: 1024,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: ["farmer", "buyer", "admin"],
      default: "buyer",
    },
    code: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

// At least one contact method is needed
userSchema.pre('validate', function(next) {
  if (!this.email && !this.phoneNumber) {
    const error = new Error('Either email or phone number is required');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.password.startsWith("$2b$")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  const hashed = await bcrypt.compare(password, this.password);
  return hashed;
};

const User = mongoose.model("user", userSchema);
const tempUser=mongoose.model("tempUser", userSchema);

tempUser.collection.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 60 * 20 } ); // 20 minutes

export { User, tempUser};