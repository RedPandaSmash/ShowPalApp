import connectDB from "../../../lib/mongodb.js";
import DefaultList from "../../../lib/models/defaultList.model.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { userID } = req.query;
    const lists = await DefaultList.find({ userID });
    res.json(lists);
  } catch (error) {
    console.error("Error fetching default lists:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}