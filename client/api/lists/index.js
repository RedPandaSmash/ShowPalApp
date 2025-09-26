import connectDB from "../../lib/mongodb.js";
import List from "../../lib/models/list.model.js";
import validateSession from "../../lib/middleware/validatesession.js";

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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get user's custom lists
      const { userID } = req.query;
      
      if (!userID) {
        return res.status(400).json({ error: "userID is required" });
      }

      const lists = await List.find({ userID }).sort({ created_at: -1 });
      return res.json({ lists });
    }

    if (req.method === 'POST') {
      // Create new custom list (requires authentication)
      await runMiddleware(req, res, validateSession);

      const { name } = req.body;
      const userID = req.user._id;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "List name is required" });
      }

      const newList = new List({
        userID,
        name: name.trim(),
        shows: [],
      });

      const savedList = await newList.save();
      return res.status(201).json({ list: savedList });
    }
  } catch (error) {
    console.error("Error in lists endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}