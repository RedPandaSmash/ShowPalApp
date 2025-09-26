export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  let { query, page = 1, language } = req.query;
  if (!query) {
    return res
      .status(400)
      .json({ error: "Missing required 'query' parameter" });
  }
  const parsedPage = Number(page) || 1;
  const MAX_PAGE = 500;
  const safePage = Math.min(Math.max(1, Math.floor(parsedPage)), MAX_PAGE);
  page = safePage;
  
  try {
    const url = new URL("https://api.themoviedb.org/3/search/tv");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    if (language) url.searchParams.set("language", language);

    const headers = { "Content-Type": "application/json" };

    // For search endpoint, TMDB prefers API key as query parameter
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    } else if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      return res.status(500).json({ error: "TMDB credentials not configured" });
    }

    console.log("Search URL:", url.toString());
    console.log("Search headers:", JSON.stringify(headers));

    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("TMDB search response:", resp.status, text);
      return res
        .status(resp.status)
        .json({ error: "TMDB error", details: text });
    }
    const data = await resp.json();
    if (typeof data.total_pages === "number")
      data.total_pages = Math.min(data.total_pages, MAX_PAGE);
    return res.json(data);
  } catch (err) {
    console.error("Error searching TMDB shows by name:", err);
    return res.status(500).json({ error: "internal server error" });
  }
}