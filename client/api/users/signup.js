import connectDB from "../../lib/mongodb.js";
import User from "../../lib/models/user.model.js";
import Profile from "../../lib/models/profile.model.js";
import DefaultList from "../../lib/models/defaultList.model.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { email, password, username } = req.body;
    const takenUser = await User.findOne({ username });
    const takenEmail = await User.findOne({ email });

    if (takenUser) {
      console.log("That username is already.");
      return res.json({
        message: "That username is already taken.",
      });
    }
    if (takenEmail) {
      console.log("That email is already being used.");
      return res.json({
        message: "That email is already being used.",
      });
    }

    const newUser = new User({
      email,
      password: await bcryptjs.hash(password, 10),
      username,
    });

    const savedUser = await newUser.save();

    // Create profile for the new user
    const newProfile = new Profile({
      userID: savedUser._id,
      bio: "",
    });
    await newProfile.save();

    // Create default lists for the new user
    await DefaultList.createDefaultListsForUser(savedUser._id);

    const token = jwt.sign(
      {
        id: savedUser._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );
    res.json({
      message: "User made successfully",
      savedUser,
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}