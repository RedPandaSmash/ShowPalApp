import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  heroSection,
  mainBlurb,
  popularShowsSection,
  reviewsSection,
  faqSection,
} from "./homeStyles";

// SVG Star component with clipPath for partial fills
function SVGStar({ fill = 1, size = 18, color = "#e5b800", id }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  const clipId = `clip-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        margin: "0 1px",
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={`${pct}%`} height="100%" />
        </clipPath>
      </defs>
      {/* empty star */}
      <path
        d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.595 0 9.748l8.332-1.73z"
        fill="#ccc"
      />
      {/* filled part clipped to pct */}
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 19.897 4.665 24 6 15.595 0 9.748l8.332-1.73z"
          fill={color}
        />
      </g>
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startIndex, setStartIndex] = useState(0);

  const [reviews, setReviews] = useState([]);
  const [showNames, setShowNames] = useState({});
  const [reviewStartIndex, setReviewStartIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const fetchShows = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/shows?action=popular&page=1");
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

  useEffect(() => {
    // Temporarily disabled - reviews API not yet implemented in serverless functions
    // const fetchReviews = async () => {
    //   try {
    //     const res = await fetch("/api/reviews");
    //     if (!res.ok) throw new Error("Failed to fetch reviews");
    //     const data = await res.json();
    //     const recentReviews = data.reviews.slice(0, 10);
    //     setReviews(recentReviews);

    //     // Fetch show names
    //     const showIDs = [...new Set(recentReviews.map((r) => r.showID))];
    //     if (showIDs.length > 0) {
    //       const showRes = await fetch("/api/shows/batch", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ ids: showIDs }),
    //       });
    //       if (showRes.ok) {
    //         const showData = await showRes.json();
    //         const names = {};
    //         for (const id in showData.results) {
    //           const show = showData.results[id];
    //           names[id] = show
    //             ? show.name || show.original_name || "Unknown Show"
    //             : "Unknown Show";
    //         }
    //         setShowNames(names);
    //       }
    //     }
    //   } catch (err) {
    //     console.error("Error fetching reviews:", err);
    //   }
    // };
    // fetchReviews();
  }, []);

  // Determine number of items to show based on screen size
  const getItemsPerPage = () => {
    if (windowWidth <= 480) return 1;
    if (windowWidth <= 768) return 2;
    return 3;
  };

  const itemsPerPage = getItemsPerPage();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const carouselStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap:
      windowWidth <= 480
        ? "2px"
        : windowWidth <= 640
        ? "4px"
        : windowWidth <= 768
        ? "8px"
        : "16px",
    flexWrap:
      windowWidth <= 480
        ? "nowrap"
        : windowWidth <= 640
        ? "nowrap"
        : windowWidth <= 768
        ? "wrap"
        : "nowrap",
    overflowX: windowWidth <= 480 ? "auto" : "visible",
    padding: windowWidth <= 480 ? "0 4px" : windowWidth <= 640 ? "0 8px" : "0",
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const arrowStyle = {
    fontSize: windowWidth <= 480 ? "18px" : "24px",
    cursor: "pointer",
    color: "#6c2eb6",
    padding: windowWidth <= 480 ? "4px" : "8px",
    borderRadius: "50%",
    background: "#ffd700",
    border: "none",
    flexShrink: 0,
    minWidth: windowWidth <= 480 ? "28px" : "auto",
    minHeight: windowWidth <= 480 ? "28px" : "auto",
  };

  const disabledArrowStyle = {
    ...arrowStyle,
    color: "#ccc",
    cursor: "default",
  };

  const showCardStyle = {
    background: "#fff",
    color: "#000",
    padding: windowWidth <= 480 ? "8px" : "12px",
    borderRadius: 8,
    minHeight: windowWidth <= 480 ? 160 : 200,
    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width:
      windowWidth <= 480 ? "140px" : windowWidth <= 768 ? "160px" : "200px",
    flexShrink: 0,
  };

  const posterStyle = {
    width: "100%",
    height: windowWidth <= 480 ? 100 : 120,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: windowWidth <= 480 ? 6 : 8,
    cursor: "pointer",
  };

  const titleStyle = {
    margin: "0 0 8px 0",
    fontSize: windowWidth <= 480 ? "14px" : "16px",
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
              {shows
                .slice(startIndex, startIndex + itemsPerPage)
                .map((show) => (
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
                  setStartIndex(
                    Math.min(shows.length - itemsPerPage, startIndex + 1)
                  )
                }
                disabled={startIndex >= shows.length - itemsPerPage}
                style={
                  startIndex >= shows.length - itemsPerPage
                    ? disabledArrowStyle
                    : arrowStyle
                }
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div style={reviewsSection}>
          <h2>Recent Reviews</h2>
          {reviews.length === 0 ? (
            <div>No reviews yet.</div>
          ) : (
            <div style={carouselStyle}>
              <button
                onClick={() =>
                  setReviewStartIndex(Math.max(0, reviewStartIndex - 1))
                }
                disabled={reviewStartIndex === 0}
                style={reviewStartIndex === 0 ? disabledArrowStyle : arrowStyle}
              >
                ‹
              </button>
              {reviews
                .slice(reviewStartIndex, reviewStartIndex + itemsPerPage)
                .map((review) => (
                  <div key={review._id} style={showCardStyle}>
                    <div>
                      <h3
                        style={titleStyle}
                        onClick={() => navigate(`/shows/${review.showID}`)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#6c2eb6")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                      >
                        {showNames[review.showID] || "Loading..."}
                      </h3>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>
                        By{" "}
                        <span
                          style={{
                            color: "#6c2eb6",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                          onClick={() => navigate(`/user/${review.userID._id}`)}
                        >
                          {review.userID?.username || "Unknown User"}
                        </span>
                      </p>
                      <div style={{ margin: "4px 0" }}>
                        {Array.from({ length: 5 }).map((_, i) => {
                          const raw = review.rating - i;
                          const fill = Math.max(0, Math.min(1, raw));
                          return (
                            <span key={i} style={{ display: "inline-block" }}>
                              <SVGStar
                                fill={fill}
                                size={18}
                                color={"#e5b800"}
                                id={`rev-${review._id}-${i}`}
                              />
                            </span>
                          );
                        })}
                      </div>
                      <p style={{ margin: 0, fontSize: 14 }}>
                        {review.comment || "No comment"}
                      </p>
                    </div>
                  </div>
                ))}
              <button
                onClick={() =>
                  setReviewStartIndex(
                    Math.min(
                      reviews.length - itemsPerPage,
                      reviewStartIndex + 1
                    )
                  )
                }
                disabled={reviewStartIndex >= reviews.length - itemsPerPage}
                style={
                  reviewStartIndex >= reviews.length - itemsPerPage
                    ? disabledArrowStyle
                    : arrowStyle
                }
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div style={faqSection}>
          <h2>Frequently Asked Questions</h2>
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto",
              textAlign: "left",
              padding: windowWidth <= 480 ? "0 16px" : "0",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <strong>How do I add shows to my lists?</strong>
              <br />
              Find the page for the show you want to add. There are three dots
              that will bring up a menu to add and remove that show from any of
              your lists!{" "}
            </div>
            <div style={{ marginBottom: "16px" }}>
              <strong>Can I write reviews?</strong>
              <br />
              Yes! Visit any show page and leave your thoughts, along with a
              rating.
            </div>
            <div style={{ marginBottom: "16px" }}>
              <strong>Is ShowPal free?</strong>
              <br />
              Absolutely. Enjoy tracking and reviewing shows at no cost.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
