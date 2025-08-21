import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.id);

    if (!user) throw new Error("User not found");

    req.user = user;

    return next();
  } catch (error) {
    res.json({
      error: "Unathorized access",
    });
  }
};
export default validateSession;
