import { Router } from "express";

const router = Router();
const token = process.env.TMDB_READ_ACCESS_TOKEN;
const apiKey = process.env.TMDB_API_KEY;
// Simple in-memory cache for TMDB show metadata (keyed by show id)
// Value: { data: <object|null>, expiresAt: <timestamp> }
const SHOW_CACHE_TTL_MS =
  Number(process.env.SHOW_CACHE_TTL_MS) || 6 * 60 * 60 * 1000; // default 6 hours
const showCache = new Map();

// GET /api/shows/popular?page=1&language=en-US
router.get("/popular", async (req, res) => {
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
});

// GET /api/shows/genre?genre=18&page=1&language=en-US
router.get("/genre", async (req, res) => {
  const { genre } = req.query;
  let { page = 1, language } = req.query;
  const parsedPage = Number(page) || 1;
  const MAX_PAGE = 500;
  const safePage = Math.min(Math.max(1, Math.floor(parsedPage)), MAX_PAGE);
  page = safePage;

  if (!genre) {
    return res
      .status(400)
      .json({ error: "Missing required 'genre' parameter" });
  }

  try {
    const url = new URL("https://api.themoviedb.org/3/discover/tv");
    url.searchParams.set("with_genres", genre);
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort_by", "popularity.desc");
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("include_null_first_air_dates", "false");
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
      // If TMDB returns an error (page out of range), try a fallback to discover total_pages
      try {
        const fallback = new URL("https://api.themoviedb.org/3/discover/tv");
        fallback.searchParams.set("with_genres", genre);
        fallback.searchParams.set("page", "1");
        fallback.searchParams.set("sort_by", "popularity.desc");
        fallback.searchParams.set("include_adult", "false");
        fallback.searchParams.set("include_null_first_air_dates", "false");
        if (language) fallback.searchParams.set("language", language);
        if (!token && apiKey) fallback.searchParams.set("api_key", apiKey);
        const fbResp = await fetch(fallback.toString(), { headers });
        if (fbResp.ok) {
          const fbData = await fbResp.json();
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
    if (typeof data.total_pages === "number")
      data.total_pages = Math.min(data.total_pages, MAX_PAGE);
    return res.json(data);
  } catch (err) {
    console.error("Error fetching TMDB shows by genre:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// GET /api/shows/search?query=showname&page=1&language=en-US
router.get("/search", async (req, res) => {
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
});

//get show by ID /api/shows/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { language } = req.query;

  try {
    const url = new URL(`https://api.themoviedb.org/3/tv/${id}`);
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
    console.error("Error fetching TMDB show by ID:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// POST /api/shows/clear-cache
router.post("/clear-cache", (req, res) => {
  const cacheSize = showCache.size;
  showCache.clear();
  console.log(`Cleared ${cacheSize} items from show cache`);
  return res.json({ message: `Cleared ${cacheSize} items from cache` });
});

// POST /api/shows/batch  { ids: [id1,id2,...] }
router.post("/batch", async (req, res) => {
  const { ids = [] } = req.body || {};
  if (!Array.isArray(ids))
    return res.status(400).json({ error: "ids must be an array" });
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (apiKey) {
      // we'll append api_key per-request below
    } else {
      return res.status(500).json({ error: "TMDB credentials not configured" });
    }

    // Prepare results map and dedupe requested ids while preserving order for the response
    const results = {};
    const now = Date.now();
    const uniqueIds = Array.from(new Set(ids));

    // First, populate from cache where possible and collect ids we need to fetch
    const toFetch = [];
    for (const id of uniqueIds) {
      const cached = showCache.get(String(id));
      if (cached && cached.expiresAt > now && cached.data !== null) {
        // Only use cached data if it's not null (don't cache failures)
        results[id] = cached.data;
      } else {
        toFetch.push(id);
      }
    }

    console.log(
      `Batch fetch: ${toFetch.length} shows to fetch from ${ids.length} requested`
    );

    // Fetch missing ids with controlled concurrency to balance speed and rate limiting
    const CONCURRENCY_LIMIT = 5; // Allow up to 5 concurrent requests
    const fetchPromises = [];

    for (let i = 0; i < toFetch.length; i += CONCURRENCY_LIMIT) {
      const batch = toFetch.slice(i, i + CONCURRENCY_LIMIT);
      const batchPromises = batch.map(async (id) => {
        // Add small delay between batches to be more respectful to TMDB
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 100));

        let retries = 2; // Retry failed requests up to 2 times
        while (retries >= 0) {
          try {
            const url = new URL(`https://api.themoviedb.org/3/tv/${id}`);
            if (!token && apiKey) url.searchParams.set("api_key", apiKey);
            const resp = await fetch(url.toString(), { headers });

            if (!resp.ok) {
              const errorText = await resp.text();
              if (resp.status === 404) {
                // Show doesn't exist, don't cache this as it might be a temporary issue
                console.log(`Show ${id} not found (404): ${errorText}`);
                results[id] = null;
                // Don't cache 404s as they might be temporary
                return;
              } else if (resp.status === 429) {
                // Rate limited, wait and retry
                console.log(`Rate limited for show ${id}, retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                retries--;
                continue;
              } else {
                // Other error, don't cache after retries to allow future attempts
                console.log(
                  `Error fetching show ${id}: ${resp.status} - ${errorText}`
                );
                if (retries === 0) {
                  results[id] = null;
                  // Don't cache other errors to allow future retries
                }
                retries--;
                continue;
              }
            }

            const data = await resp.json();
            results[id] = data;
            // Cache successful fetches (this will overwrite any previous null cache entries)
            showCache.set(String(id), {
              data,
              expiresAt: now + SHOW_CACHE_TTL_MS,
            });
            console.log(
              `Successfully cached show ${id} with poster: ${data.poster_path}`
            );
            return;
          } catch (err) {
            console.error(`Network error fetching show ${id}:`, err.message);
            if (retries === 0) {
              results[id] = null;
              // Don't cache network errors to allow future retries
            }
            retries--;
            if (retries >= 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }
      });

      fetchPromises.push(...batchPromises);
    }

    // Wait for all fetches to complete
    await Promise.all(fetchPromises);

    // Log the results for debugging
    const failedIds = Object.keys(results).filter((id) => results[id] === null);
    if (failedIds.length > 0) {
      console.log(`Failed to fetch ${failedIds.length} shows:`, failedIds);
    }

    // Ensure response includes entries for every requested id (preserve original order and duplicates)
    const finalResults = {};
    for (const id of ids) {
      finalResults[id] = results[id] !== undefined ? results[id] : null;
    }

    console.log(
      `Batch fetch complete: ${
        Object.keys(finalResults).length
      } results returned`
    );
    return res.json({ results: finalResults });
  } catch (err) {
    console.error("Error in batch show fetch", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// GET /api/shows/:id/season/:seasonNumber
router.get("/:id/season/:seasonNumber", async (req, res) => {
  const { id, seasonNumber } = req.params;
  if (!id || !seasonNumber)
    return res.status(400).json({ error: "Missing id or season number" });

  try {
    const url = new URL(
      `https://api.themoviedb.org/3/tv/${encodeURIComponent(
        id
      )}/season/${encodeURIComponent(seasonNumber)}`
    );
    const headers = { "Content-Type": "application/json" };

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
    console.error("Error fetching TMDB season details:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
// https://api.themoviedb.org/3/tv/popular
// https://developer.themoviedb.org/reference/tv-series-popular-list
