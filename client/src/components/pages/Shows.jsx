import React from "react";
import { useEffect, useState } from "react";
import { popularShowsSection } from "./homeStyles";

export default function Shows() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchPopular = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "http://localhost:8080/api/shows/popular?page=1"
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        // TMDB returns results array
        const items = Array.isArray(data.results)
          ? data.results.slice(0, 16)
          : [];
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
  }, []);

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

  if (loading)
    return (
      <div style={{ padding: 24, color: "#000" }}>Loading popular shows...</div>
    );
  if (error)
    return <div style={{ padding: 24, color: "#000" }}>Error: {error}</div>;

  return (
    <section style={{ ...popularShowsSection, padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Most Popular Shows</h2>
      <div style={gridStyle}>
        {shows.map((s) => (
          <div key={s.id} style={cardStyle}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>
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
    </section>
  );
}
