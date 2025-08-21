import { Router } from "express";

const router = Router();

// GET /api/shows/popular?page=1&language=en-US
router.get("/popular", async (req, res) => {
  const { page = 1, language } = req.query;

  try {
    const url = new URL("https://api.themoviedb.org/3/tv/popular");
    url.searchParams.set("page", String(page));
    if (language) url.searchParams.set("language", language);

    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY;

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
      return res
        .status(resp.status)
        .json({ error: "TMDB error", details: text });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error("Error fetching TMDB popular shows:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

//placeholder

export default router;
// https://api.themoviedb.org/3/tv/popular
// https://developer.themoviedb.org/reference/tv-series-popular-list
