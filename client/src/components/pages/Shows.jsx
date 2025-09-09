import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { popularShowsSection } from "./homeStyles";

export default function Shows() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  // Initialize state from URL parameters
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) || 1 : 1;
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get("q") || "";
  });

  const [isSearching, setIsSearching] = useState(() => {
    return !!searchParams.get("q");
  });

  const [inputValue, setInputValue] = useState(() => page.toString());

  // Search function (only triggers on submit)
  const performSearch = async (query, searchPage = 1) => {
    if (!query.trim()) {
      setIsSearching(false);
      setPage(1);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/shows/search?query=${encodeURIComponent(
          query
        )}&page=${searchPage}`
      );
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const data = await res.json();
      if (typeof data.total_pages === "number") setTotalPages(data.total_pages);
      const items = Array.isArray(data.results) ? data.results : [];
      setShows(items);
      setError(null);
    } catch (err) {
      console.error("Search error:", err);
      setError(`Search failed: ${err.message}`);
      setIsSearching(false);
    } finally {
      setLoading(false);
    }
  };

  // Only search on submit (Enter or Search button)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setPage(1);
      performSearch(searchQuery, 1);
    } else if (searchQuery.trim().length === 0) {
      setIsSearching(false);
      setPage(1);
    }
  };

  // Clear search and return to popular shows
  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setPage(1);
  };

  // Update URL parameters when page or search state changes
  useEffect(() => {
    const newParams = new URLSearchParams();

    if (page > 1) {
      newParams.set("page", page.toString());
    }

    if (isSearching && searchQuery.trim()) {
      newParams.set("q", searchQuery.trim());
    }

    // Only update if there are changes to avoid infinite loops
    const currentParams = searchParams.toString();
    const newParamsString = newParams.toString();

    if (currentParams !== newParamsString) {
      setSearchParams(newParams, { replace: true });
    }
  }, [page, searchQuery, isSearching, searchParams, setSearchParams]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      // Only fetch popular shows if not searching
      if (isSearching && searchQuery.trim()) return;
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:8080/api/shows/popular?page=${page}`
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (typeof data.total_pages === "number")
          setTotalPages(data.total_pages);
        if (typeof data.total_pages === "number" && page > data.total_pages) {
          setPage(data.total_pages);
          return;
        }
        const items = Array.isArray(data.results) ? data.results : [];
        setShows(items);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load shows");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [page, isSearching]);

  // Sync inputValue with page changes
  useEffect(() => {
    setInputValue(page.toString());
  }, [page]);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    width: "100%",
  };

  const cardStyle = {
    background: "#fff",
    color: "#000",
    padding: "12px",
    borderRadius: 8,
    minHeight: 120,
    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  const posterStyle = {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 8,
  };

  const interactiveTitle = {
    cursor: "pointer",
    transition: "color 0.15s",
  };

  const posterInteractive = { cursor: "pointer" };

  const sectionStyle = {
    ...popularShowsSection,
    padding: 24,
    margin: "24px auto",
    paddingBottom: 48,
  };

  if (loading)
    return (
      <div style={{ padding: 24, color: "#000" }}>Loading popular shows...</div>
    );
  if (error)
    return <div style={{ padding: 24, color: "#000" }}>Error: {error}</div>;

  const onFirst = () => {
    setPage(1);
    if (isSearching && searchQuery.trim()) {
      performSearch(searchQuery, 1);
    }
  };

  const onLast = () => {
    setPage(totalPages);
    if (isSearching && searchQuery.trim()) {
      performSearch(searchQuery, totalPages);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    // First
    buttons.push(
      <button
        key="first"
        onClick={onFirst}
        disabled={page === 1}
        style={{
          padding: "6px 10px",
          cursor: page === 1 ? "default" : "pointer",
          background: "#ffd700",
          color: "#6c2eb6",
          borderRadius: 6,
          border: "none",
        }}
      >
        1
      </button>
    );

    if (start > 2) buttons.push(<span key="left-ell">…</span>);

    for (let p = start; p <= end; p++) {
      if (p === 1 || p === totalPages) continue; // already handled
      buttons.push(
        <button
          key={p}
          onClick={() => {
            setPage(p);
            if (isSearching && searchQuery.trim()) {
              performSearch(searchQuery, p);
            }
          }}
          style={{
            padding: "6px 10px",
            fontWeight: p === page ? "bold" : "normal",
            cursor: p === page ? "default" : "pointer",
            background: p === page ? "#6c2eb6" : "#ffd700",
            color: p === page ? "#ffd700" : "#6c2eb6",
            borderRadius: 6,
            border: "none",
          }}
        >
          {p}
        </button>
      );
    }

    if (end < totalPages - 1) buttons.push(<span key="right-ell">…</span>);

    // Last
    if (totalPages > 1)
      buttons.push(
        <button
          key="last"
          onClick={onLast}
          disabled={page === totalPages}
          style={{
            padding: "6px 10px",
            cursor: page === totalPages ? "default" : "pointer",
            background: "#ffd700",
            color: "#6c2eb6",
            borderRadius: 6,
            border: "none",
          }}
        >
          {totalPages}
        </button>
      );

    return buttons;
  };

  return (
    <section style={sectionStyle}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>
          {isSearching
            ? `Search Results for "${searchQuery}"`
            : "Most Popular Shows"}
        </h2>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
            margin: 0,
            padding: 0,
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: 400,
              margin: 0,
              padding: 0,
            }}
          >
            <input
              type="text"
              placeholder="Search for TV shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 44px 12px 16px", // Increased padding to accommodate both buttons
                borderRadius: "8px 0 0 8px", // Rounded left corners only
                border: "2px solid #ddd",
                borderRight: "none", // Remove right border
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6c2eb6")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />

            {/* Clear button - positioned inside the input area */}
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: "absolute",
                  right: 44,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  fontSize: 18,
                  padding: 0,
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 3,
                  zIndex: 2,
                }}
                title="Clear search"
              >
                ×
              </button>
            )}

            {/* Search submit button with magnifying glass - seamless with input */}
            <button
              type="submit"
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                background: "#6c2eb6",
                border: "2px solid #ddd",
                borderLeft: "none",
                borderRadius: "0 8px 8px 0", // Rounded right corners only
                cursor: "pointer",
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s, border-color 0.2s",
                width: 44,
                margin: 0,
                zIndex: 1,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#4a1d7a";
                e.target.style.borderColor = "#6c2eb6";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#6c2eb6";
                e.target.style.borderColor = "#ddd";
              }}
              title="Search"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="#ffd700"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  d="M21 21L16.5 16.5"
                  stroke="#ffd700"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Only show the clear button inside the input, not a second button below */}
        </form>
      </div>
      <div style={gridStyle}>
        {shows.map((s) => (
          <div key={s.id} style={cardStyle}>
            <div>
              {s.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${s.poster_path}`}
                  alt={s.original_name || s.name}
                  style={{ ...posterStyle, ...posterInteractive }}
                  onClick={() => navigate(`/shows/${s.id}`)}
                />
              ) : null}
              <h3
                style={{ margin: "0 0 8px 0", ...interactiveTitle }}
                onClick={() => navigate(`/shows/${s.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6c2eb6")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                title={s.original_name || s.name}
              >
                {s.original_name || s.name}
              </h3>
              <p style={{ margin: 0, fontSize: 14 }}>
                {s.overview || "No description available."}
              </p>
            </div>
            <small style={{ marginTop: 12, color: "#333" }}>
              First aired: {s.first_air_date || "N/A"}
            </small>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {renderPageButtons()}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label>Jump to page:</label>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = Number(inputValue);
                if (!isNaN(v) && v >= 1 && v <= totalPages) {
                  const clampedPage = Math.min(Math.max(1, v), totalPages);
                  if (clampedPage !== page) {
                    setPage(clampedPage);
                    if (isSearching && searchQuery.trim()) {
                      performSearch(searchQuery, clampedPage);
                    }
                  }
                }
              }
            }}
            style={{
              width: 80,
              padding: "6px 8px",
              MozAppearance: "textfield",
            }}
          />
          <style>
            {`
              input[type="number"]::-webkit-outer-spin-button,
              input[type="number"]::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
            `}
          </style>
        </div>
      </div>
    </section>
  );
}
