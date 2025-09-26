import connectDB from "../../../../lib/mongodb.js";
import DefaultList from "../../../../lib/models/defaultList.model.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { userID, listType } = req.query;
    
    const list = await DefaultList.findOne({
      userID,
      listType,
    });

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    res.json(list);
  } catch (error) {
    console.error("Error fetching default list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}