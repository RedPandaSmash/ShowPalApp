export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  let { page = 1, language } = req.query;
  // TMDB caps pages at 500; guard against absurd page numbers from client
  const parsedPage = Number(page) || 1;
  const MAX_PAGE = 500;
  const safePage = Math.min(Math.max(1, Math.floor(parsedPage)), MAX_PAGE);
  page = safePage;

  try {
    const url = new URL("https://api.themoviedb.org/3/tv/popular");
    url.searchParams.set("page", String(page));
    //Translates the description to the language set
    if (language) url.searchParams.set("language", language);

    const headers = {
      "Content-Type": "application/json",
    };

    // Prefer Bearer token if available; otherwise fall back to api_key query param
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
      // If TMDB returns an error for this page (e.g., page out of range), try a safe fallback
      try {
        const fallback = new URL("https://api.themoviedb.org/3/tv/popular");
        fallback.searchParams.set("page", "1");
        if (language) fallback.searchParams.set("language", language);
        if (!token && apiKey) fallback.searchParams.set("api_key", apiKey);
        const fbResp = await fetch(fallback.toString(), { headers });
        if (fbResp.ok) {
          const fbData = await fbResp.json();
          // return an empty results array and the true total_pages so client can clamp
          return res.json({
            results: [],
            total_pages: Math.min(fbData.total_pages || 1, MAX_PAGE),
            note: "requested page out of range",
          });
        }
      } catch (e) {
        console.error("Fallback fetch failed:", e);
      }
      return res
        .status(resp.status)
        .json({ error: "TMDB error", details: text });
    }

    const data = await resp.json();
    // enforce maximum total_pages to TMDB limit so client can't see >500
    if (typeof data.total_pages === "number")
      data.total_pages = Math.min(data.total_pages, MAX_PAGE);
    return res.json(data);
  } catch (err) {
    console.error("Error fetching TMDB popular shows:", err);
    return res.status(500).json({ error: "internal server error" });
  }
}