import connectDB from "../lib/mongodb.js";
import User from "../lib/models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validateSession from "../lib/middleware/validatesession.js";

// Helper function to run middleware
async function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  try {
    await connectDB();
    
    const { action, id } = req.query;

    if (req.method === 'POST') {
      if (action === 'login') {
        // Login user
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.json({
          message: "Login successful",
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
          },
        });
      }

      if (action === 'signup') {
        // Register new user
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
          return res.status(400).json({ error: "All fields are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [{ email }, { username }],
        });

        if (existingUser) {
          return res.status(400).json({
            error: existingUser.email === email
                ? "Email already registered"
                : "Username already taken",
          });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
          username,
          email,
          password: hashedPassword,
        });

        await newUser.save();

        // Create JWT token
        const token = jwt.sign(
          { userId: newUser._id, email: newUser.email },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.status(201).json({
          message: "User created successfully",
          token,
          user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
          },
        });
      }

      if (action === 'verify') {
        // Verify token
        await runMiddleware(req, res, validateSession);
        
        return res.json({
          valid: true,
          user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
          },
        });
      }
    }

    if (req.method === 'GET') {
      if (action === 'username' && id) {
        // Get username by ID
        const user = await User.findById(id).select("username");
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        return res.json({ username: user.username });
      }
    }

    return res.status(400).json({ error: "Invalid operation" });
  } catch (error) {
    console.error("Error in users endpoint:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
