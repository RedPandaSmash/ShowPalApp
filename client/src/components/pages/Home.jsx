import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  heroSection,
  mainBlurb,
  popularShowsSection,
  reviewsSection,
  faqSection,
} from "./homeStyles";

export default function Home() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    const fetchShows = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "http://localhost:8080/api/shows/popular?page=1"
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data.results)
          ? data.results.slice(0, 10)
          : [];
        setShows(items);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load shows");
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, []);

  const carouselStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  };

  const arrowStyle = {
    fontSize: "24px",
    cursor: "pointer",
    color: "#6c2eb6",
    padding: "8px",
    borderRadius: "50%",
    background: "#ffd700",
    border: "none",
  };

  const disabledArrowStyle = {
    ...arrowStyle,
    color: "#ccc",
    cursor: "default",
  };

  const showCardStyle = {
    background: "#fff",
    color: "#000",
    padding: "12px",
    borderRadius: 8,
    minHeight: 200,
    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "200px",
  };

  const posterStyle = {
    width: "100%",
    height: 120,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 8,
    cursor: "pointer",
  };

  const titleStyle = {
    margin: "0 0 8px 0",
    fontSize: "16px",
    cursor: "pointer",
    transition: "color 0.15s",
  };

  return (
    <div style={{ background: "#0a174e", minHeight: "100vh", width: "100vw" }}>
      <section style={heroSection}>
        <div style={mainBlurb}>
          Welcome to ShowPal! Discover, track, and review your favorite TV
          shows.
        </div>
        <div style={popularShowsSection}>
          <h2>Recent Popular Shows</h2>
          {loading ? (
            <div>Loading popular shows...</div>
          ) : error ? (
            <div>Error: {error}</div>
          ) : (
            <div style={carouselStyle}>
              <button
                onClick={() => setStartIndex(Math.max(0, startIndex - 1))}
                disabled={startIndex === 0}
                style={startIndex === 0 ? disabledArrowStyle : arrowStyle}
              >
                ‹
              </button>
              {shows.slice(startIndex, startIndex + 3).map((show) => (
                <div key={show.id} style={showCardStyle}>
                  {show.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                      alt={show.original_name || show.name}
                      style={posterStyle}
                      onClick={() => navigate(`/shows/${show.id}`)}
                    />
                  )}
                  <h3
                    style={titleStyle}
                    onClick={() => navigate(`/shows/${show.id}`)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#6c2eb6")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                  >
                    {show.original_name || show.name}
                  </h3>
                </div>
              ))}
              <button
                onClick={() =>
                  setStartIndex(Math.min(shows.length - 3, startIndex + 1))
                }
                disabled={startIndex >= shows.length - 3}
                style={
                  startIndex >= shows.length - 3
                    ? disabledArrowStyle
                    : arrowStyle
                }
              >
                ›
              </button>
            </div>
          )}
        </div>
      </section>
      <section style={reviewsSection}>
        <h2>Recent Reviews</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>"Loved the suspense in Mystery Nights!" - User123</li>
          <li>"Comedy Central had me laughing all night." - TVFan</li>
        </ul>
      </section>
      <section style={faqSection}>
        <h2>Frequently Asked Questions</h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            textAlign: "left",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <li>
            <strong>How do I add shows to my lists?</strong>
            <br />
            Find the page for the show you want to add. There are three dots
            that will bring up a menu to add and remove that show from any of
            your lists!{" "}
          </li>
          <li>
            <strong>Can I write reviews?</strong>
            <br />
            Yes! Visit any show page and leave your thoughts, along with a
            rating.
          </li>
          <li>
            <strong>Is ShowPal free?</strong>
            <br />
            Absolutely. Enjoy tracking and reviewing shows at no cost.
          </li>
        </ul>
      </section>
    </div>
  );
}
