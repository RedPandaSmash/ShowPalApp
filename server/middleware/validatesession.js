import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id);

    if (!user) throw new Error("User not found");

    req.user = user;

    return next();
  } catch (error) {
    console.error("validateSession error", error && error.message);
    return res.status(401).json({ error: "Unauthorized access" });
  }
};
export default validateSession;
