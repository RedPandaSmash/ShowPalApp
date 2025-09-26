import connectDB from "../../lib/mongodb.js";
import User from "../../lib/models/user.model.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "No id provided" });
    
    const user = await User.findById(id).select("username").exec();
    if (!user) return res.status(404).json({ error: "User not found" });
    
    return res.status(200).json({ username: user.username });
  } catch (err) {
    console.error("username lookup error", err);
    return res.status(500).json({ error: "Server error" });
  }
}