export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  const { id, seasonNum } = req.query;
  const { language } = req.query;

  try {
    // If seasonNum is provided, fetch season data instead of show data
    const endpoint = seasonNum ? `tv/${id}/season/${seasonNum}` : `tv/${id}`;
    const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
    
    //Translates the description to the language set
    if (language) url.searchParams.set("language", language);

    const headers = {
      "Content-Type": "application/json",
    };

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