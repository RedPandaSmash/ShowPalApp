import connectDB from "../../../lib/mongodb.js";
import List from "../../../lib/models/list.model.js";
import validateSession from "../../../lib/middleware/validatesession.js";

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
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { listId } = req.query;
    const { action } = req.query;

    if (req.method === 'GET') {
      // Get specific list
      const list = await List.findById(listId).populate("userID", "username");
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }
      return res.json({ list });
    }

    // All other methods require authentication
    await runMiddleware(req, res, validateSession);
    const userID = req.user._id;

    if (req.method === 'POST' && action === 'toggle-show') {
      // Toggle show in list
      const { showData } = req.body;

      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      // Check if user owns the list
      if (list.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to modify this list" });
      }

      // Check if show already exists in list
      const existingShowIndex = list.shows.findIndex(
        show => show.tmdbID === showData.tmdbID
      );

      if (existingShowIndex > -1) {
        // Remove show from list
        list.shows.splice(existingShowIndex, 1);
      } else {
        // Add show to list
        list.shows.push(showData);
      }

      const updatedList = await list.save();
      
      return res.json({ 
        list: updatedList,
        added: existingShowIndex === -1
      });
    }

    if (req.method === 'PUT') {
      // Update list
      const { name, description, isPublic, shows } = req.body;

      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      if (list.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to edit this list" });
      }

      if (name !== undefined) {
        if (name.trim().length === 0) {
          return res.status(400).json({ error: "List name cannot be empty" });
        }
        list.name = name.trim();
      }

      if (description !== undefined) list.description = description;
      if (isPublic !== undefined) list.isPublic = isPublic;
      if (shows !== undefined) list.shows = shows;

      const updatedList = await list.save();
      await updatedList.populate("userID", "username");
      return res.json({ list: updatedList });
    }

    if (req.method === 'DELETE') {
      // Delete list
      const list = await List.findById(listId);
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      if (list.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to delete this list" });
      }

      await List.findByIdAndDelete(listId);
      return res.json({ message: "List deleted successfully" });
    }
  } catch (error) {
    console.error("Error in list management endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}