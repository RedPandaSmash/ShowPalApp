import connectDB from "../../lib/mongodb.js";
import User from "../../lib/models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const email = req.body.email;
    const password = req.body.password;

    const foundUser = await User.findOne({ email });
    
    if (!foundUser) {
      return res.status(401).json({
        error: "invalid password or email",
      });
    }

    const verifyPwd = await bcrypt.compare(password, foundUser.password);

    if (!verifyPwd) {
      return res.status(401).json({
        error: "invalid password or email",
      });
    }

    const token = jwt.sign(
      {
        id: foundUser._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );

    res.status(200).json({
      user: foundUser,
      token: token,
      message: "User logged in successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}