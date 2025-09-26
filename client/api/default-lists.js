import connectDB from "../../lib/mongodb.js";
import DefaultList from "../../lib/models/defaultList.model.js";
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
  try {
    await connectDB();
    
    const { userID, listType, action } = req.query;

    // Handle different operations based on method and action
    if (req.method === 'GET') {
      // Get default lists
      if (listType) {
        const list = await DefaultList.findOne({ userID, listType });
        if (!list) {
          return res.status(404).json({ error: "List not found" });
        }
        return res.json(list);
      }
      
      // Return all lists for user
      const lists = await DefaultList.find({ userID });
      return res.json(lists);
    }

    // All other operations require authentication
    await runMiddleware(req, res, validateSession);
    const authenticatedUserID = req.user._id;

    if (req.method === 'POST') {
      if (action === 'move') {
        // Move show between lists
        const { fromListType, toListType, showData } = req.body;
        
        // Validate list types
        const validListTypes = ["Watching", "Finished", "Dropped", "Planning"];
        if (!validListTypes.includes(fromListType) || !validListTypes.includes(toListType)) {
          return res.status(400).json({ error: "Invalid list type" });
        }

        // Get or create source list
        let fromList = await DefaultList.findOne({ userID: authenticatedUserID, listType: fromListType });
        if (fromList) {
          // Remove show from source list
          fromList.shows = fromList.shows.filter(show => show.tmdbID !== showData.tmdbID);
          await fromList.save();
        }

        // Get or create destination list
        let toList = await DefaultList.findOne({ userID: authenticatedUserID, listType: toListType });
        if (!toList) {
          toList = new DefaultList({
            userID: authenticatedUserID,
            listType: toListType,
            shows: []
          });
        }

        // Add show to destination list if not already there
        const existingShow = toList.shows.find(show => show.tmdbID === showData.tmdbID);
        if (!existingShow) {
          toList.shows.push(showData);
        }

        await toList.save();
        
        return res.json({ 
          success: true,
          fromList,
          toList
        });
      }

      if (action === 'toggle-show') {
        // Toggle show in specific list
        const { showData } = req.body;
        
        // Validate list type
        const validListTypes = ["Watching", "Finished", "Dropped", "Planning"];
        if (!validListTypes.includes(listType)) {
          return res.status(400).json({ error: "Invalid list type" });
        }

        let list = await DefaultList.findOne({ userID: authenticatedUserID, listType });
        if (!list) {
          list = new DefaultList({
            userID: authenticatedUserID,
            listType,
            shows: []
          });
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
    }

    if (req.method === 'PUT' && action === 'update') {
      // Update entire list
      const { shows } = req.body;
      
      // Validate list type
      const validListTypes = ["Watching", "Finished", "Dropped", "Planning"];
      if (!validListTypes.includes(listType)) {
        return res.status(400).json({ error: "Invalid list type" });
      }

      let list = await DefaultList.findOne({ userID: authenticatedUserID, listType });
      if (!list) {
        list = new DefaultList({
          userID: authenticatedUserID,
          listType,
          shows: []
        });
      }

      list.shows = shows || [];
      const updatedList = await list.save();
      
      return res.json({ list: updatedList });
    }

    return res.status(400).json({ error: "Invalid operation" });
  } catch (error) {
    console.error("Error in default lists endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}