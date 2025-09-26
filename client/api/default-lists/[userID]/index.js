import connectDB from "../../../lib/mongodb.js";
import DefaultList from "../../../lib/models/defaultList.model.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { userID, listType } = req.query;
    
    // If listType is specified, return specific list
    if (listType) {
      const list = await DefaultList.findOne({ userID, listType });
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }
      return res.json(list);
    }
    
    // Otherwise return all lists
    const lists = await DefaultList.find({ userID });
    res.json(lists);
  } catch (error) {
    console.error("Error fetching default lists:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}