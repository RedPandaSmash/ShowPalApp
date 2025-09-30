import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const validateSession = async (req, res, next) => {
  try {
    const { token } = req.body;
    const authHeader = req.headers.authorization;
    
    let tokenToVerify = token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenToVerify = authHeader.substring(7);
    }

    if (!tokenToVerify) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(tokenToVerify, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default validateSession;