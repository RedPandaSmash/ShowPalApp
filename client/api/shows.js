export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY;
    
    // Handle batch POST requests
    if (req.method === 'POST' && req.query.action === 'batch') {
      const { showIds } = req.body;
      
      if (!showIds || !Array.isArray(showIds)) {
        return res.status(400).json({ error: "showIds array is required" });
      }

      const shows = [];
      
      for (const tmdbID of showIds) {
        try {
          const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbID}`);
          
          const headers = { "Content-Type": "application/json" };
          
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          } else if (apiKey) {
            url.searchParams.set("api_key", apiKey);
          }

          const response = await fetch(url.toString(), { headers });
          
          if (response.ok) {
            const showData = await response.json();
            shows.push(showData);
          }
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching show ${tmdbID}:`, error);
        }
      }

      return res.json({ shows });
    }
    
    const { action, id, query, page, seasonNum, language } = req.query;

    const headers = {
      "Content-Type": "application/json",
    };

    let url;

    if (action === 'search') {
      // Search shows
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      url = new URL("https://api.themoviedb.org/3/search/tv");
      url.searchParams.set("query", query);
      if (page) url.searchParams.set("page", page);
    } else if (action === 'popular') {
      // Get popular shows
      url = new URL("https://api.themoviedb.org/3/tv/popular");
      if (page) url.searchParams.set("page", page);
    } else if (id) {
      // Get specific show or season
      const endpoint = seasonNum ? `tv/${id}/season/${seasonNum}` : `tv/${id}`;
      url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
      
      if (language) url.searchParams.set("language", language);
    } else {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Set up authentication
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    } else {
      return res.status(500).json({ error: "TMDB credentials not configured" });
    }

    const resp = await fetch(url.toString(), { headers });

    if (!resp.ok) {
      const text = await resp.text();
      return res
        .status(resp.status)
        .json({ error: "TMDB error", details: text });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error("Error fetching TMDB data:", err);
    return res.status(500).json({ error: "internal server error" });
  }
}