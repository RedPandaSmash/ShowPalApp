import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { popularShowsSection } from "./homeStyles";

export default function Shows() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let mounted = true;
    const fetchPopular = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:8080/api/shows/popular?page=${page}`
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        // TMDB returns results array and total_pages
        const total =
          typeof data.total_pages === "number" ? data.total_pages : totalPages;
        if (typeof data.total_pages === "number")
          setTotalPages(data.total_pages);

        // If requested page exceeds TMDB's total, clamp and re-request by updating page state.
        if (typeof data.total_pages === "number" && page > data.total_pages) {
          // setPage will trigger a re-fetch with a valid page value
          setPage(data.total_pages);
          return;
        }

        // Use whatever results the API returned for this page so front-end pages map 1:1 with API pages
        const items = Array.isArray(data.results) ? data.results : [];
        setShows(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load shows");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPopular();
    return () => {
      mounted = false;
    };
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

  const onFirst = () => setPage(1);
  const onLast = () => setPage(totalPages);

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
        style={{ padding: "6px 10px" }}
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
          onClick={() => setPage(p)}
          style={{
            padding: "6px 10px",
            fontWeight: p === page ? "bold" : "normal",
            cursor: p === page ? "default" : "pointer",
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
          }}
        >
          {totalPages}
        </button>
      );

    return buttons;
  };

  return (
    <section style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>Most Popular Shows</h2>
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
            defaultValue={page}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = Number(e.currentTarget.value);
                if (!isNaN(v)) setPage(Math.min(Math.max(1, v), totalPages));
              }
            }}
            style={{ width: 80, padding: "6px 8px" }}
          />
        </div>
      </div>
    </section>
  );
}
