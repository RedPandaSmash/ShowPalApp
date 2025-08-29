import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { popularShowsSection } from "./homeStyles";
import { useAuth } from "../../context/AuthContext";
import {
  interactiveHover,
  interactiveButton,
  starBase,
} from "../multiuse/interactiveStyles";

// SVG Star component with clipPath for partial fills
function SVGStar({ fill = 1, size = 18, color = '#e5b800', id }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  const clipId = `clip-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}
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

export default function SpecificShow() {
  const { showID } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonError, setSeasonError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const { isSignedIn, userId, refresh } = useAuth();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  // fetch reviews for this show
  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/reviews?showID=${encodeURIComponent(showID)}`
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("fetchReviews failed", res.status, text);
        setReviews([]);
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        console.error(
          "fetchReviews unexpected content-type",
          contentType,
          text
        );
        setReviews([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.reviews) ? data.reviews : [];
      setReviews(list);
    } catch (err) {
      console.error(err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [showID]);

  useEffect(() => {
    let mounted = true;
    const fetchShow = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/api/shows/${showID}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setShow(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load show");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchShow();
    return () => {
      mounted = false;
    };
  }, [showID]);

  // Fetch season details whenever show is present and selectedSeason changes
  useEffect(() => {
    let mounted = true;
    const fetchSeason = async (seasonNum) => {
      setSeasonLoading(true);
      setSeasonError(null);
      try {
        const res = await fetch(
          `http://localhost:8080/api/shows/${showID}/season/${seasonNum}`
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setSeasonData(data);
      } catch (err) {
        console.error(err);
        setSeasonError(err.message || "Failed to load season");
        setSeasonData(null);
      } finally {
        if (mounted) setSeasonLoading(false);
      }
    };

    if (show && typeof selectedSeason === "number") {
      fetchSeason(selectedSeason);
    } else {
      // clear season data if show not loaded
      setSeasonData(null);
    }

    return () => {
      mounted = false;
    };
  }, [show, selectedSeason, showID]);

  if (loading) return <div style={{ padding: 24 }}>Loading show...</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
  if (!show) return <div style={{ padding: 24 }}>No show found.</div>;

  const poster = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : null;

  const genres = Array.isArray(show.genres)
    ? show.genres.map((g) => g.name).filter(Boolean)
    : [];
  const languages = Array.isArray(show.spoken_languages)
    ? show.spoken_languages.map((l) => l.english_name || l.name).filter(Boolean)
    : [];

  return (
    <section style={{ padding: 24, color: "#fff" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div
        style={{
          ...popularShowsSection,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          color: "#000",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={show.name || show.original_name}
            style={{ width: 300, borderRadius: 8 }}
          />
        ) : null}
        <div style={{ textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ marginTop: 0 }}>{show.name || show.original_name}</h1>
            <div style={{ fontSize: "1rem", fontWeight: "700", color: "#000" }}>
              {reviews && reviews.length ? (
                <span>
                  Average Rating: {(
                    reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
                    reviews.length
                  ).toFixed(2)}{" "}
                  (<a
                    href="#reviews-section"
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById('reviews-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ color: '#000', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                  </a>)
                </span>
              ) : (
                <span style={{ color: "#000" }}>
                  (This show does not have any reviews yet.)
                </span>
              )}
            </div>
          </div>

          <p>{show.overview || "No description available."}</p>

          {genres.length > 0 && (
            <p>
              <strong>Genres:</strong> {genres.join(", ")}
            </p>
          )}

          {languages.length > 0 && (
            <p>
              <strong>Languages:</strong> {languages.join(", ")}
            </p>
          )}

          {show.homepage && (
            <p>
              <strong>Official site:</strong>{" "}
              <a href={show.homepage} target="_blank" rel="noreferrer">
                {show.homepage}
              </a>
            </p>
          )}
          <p>
            <strong>First air date:</strong> {show.first_air_date || "N/A"}
          </p>
          <p>
            <strong>Seasons:</strong> {show.number_of_seasons ?? "N/A"}
          </p>
          <p>
            <strong>Episodes:</strong> {show.number_of_episodes ?? "N/A"}
          </p>
          {/* Season selector and details */}
          {Array.isArray(show.seasons) && show.seasons.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <label>
                <strong>Season:</strong>{" "}
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                >
                  {show.seasons.map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`}
                    </option>
                  ))}
                </select>
              </label>

              {seasonLoading && <div>Loading season...</div>}
              {seasonError && <div>Error: {seasonError}</div>}
              {seasonData && (
                <div style={{ marginTop: 12 }}>
                  {seasonData.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${seasonData.poster_path}`}
                      alt={
                        seasonData.name || `Season ${seasonData.season_number}`
                      }
                      style={{
                        width: 180,
                        borderRadius: 6,
                        display: "block",
                        marginBottom: 8,
                      }}
                    />
                  )}
                  {seasonData.name && (
                    <div>
                      <strong>{seasonData.name}</strong>
                    </div>
                  )}
                  {typeof seasonData.episode_count === "number" && (
                    <div>Episodes: {seasonData.episode_count}</div>
                  )}
                  {seasonData.overview && <p>{seasonData.overview}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Episodes section for selected season */}
      <div style={{ ...popularShowsSection, marginTop: 20, color: "#000" }}>
        <h3 style={{ marginTop: 0 }}>Episodes - Season {selectedSeason}</h3>
        {seasonLoading && <div>Loading episodes...</div>}
        {seasonError && <div>Error: {seasonError}</div>}
        {seasonData && Array.isArray(seasonData.episodes) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(1, 1fr)",
              gap: 12,
            }}
          >
            {seasonData.episodes.map((ep) => (
              <div
                key={ep.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 240px 1fr 140px",
                  border: "1px solid #000",
                }}
              >
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  <strong>#{ep.episode_number}</strong>
                </div>
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  <strong>{ep.name}</strong>
                </div>
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  {ep.overview}
                </div>
                <div style={{ padding: 8 }}>{ep.air_date || "N/A"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews section */}
      <div
        style={{
          ...popularShowsSection,
          marginTop: 20,
          color: "#000",
          background: "#fff4b5",
        }}
        id="reviews-section"
      >
        <h3 style={{ marginTop: 0 }}>Reviews</h3>
        <div style={{ padding: 12 }}>
          {isSignedIn ? (
            <ReviewForm
              showID={showID}
              onNewReview={() => fetchReviews()}
              refreshAuth={refresh}
            />
          ) : (
            <div style={{ marginBottom: 12 }}>
              <em>Please sign in to leave a review.</em>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {reviewsLoading ? (
              <div>Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div>No one's left a review yet. You could be the first!</div>
            ) : (
              <ReviewList
                reviews={reviews}
                currentUserId={currentUserId}
                onRefresh={() => fetchReviews()}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ showID, onNewReview, refreshAuth }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // 5-star UI with half-star detection
  const [hoverValue, setHoverValue] = React.useState(null);
  const starRef = React.useRef(null);

  // helper to render a star with partial fill (0..1)
  const Star = ({ fill = 0, color = '#e5b800' }) => {
    const pct = Math.max(0, Math.min(1, fill)) * 100;
    return (
      <span style={{ position: 'relative', display: 'inline-block', width: 22, height: 22, margin: '0 2px' }}>
        <span style={{ ...starBase, color: '#ccc', position: 'absolute', left: 0, top: 0 }}>★</span>
        <span style={{ ...starBase, color, position: 'absolute', left: 0, top: 0, width: `${pct}%`, overflow: 'hidden', WebkitTextStroke: '0' }}>★</span>
      </span>
    );
  };

  const handleStarMouseMove = (e, index) => {
    // index is 0..4
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2 ? 0.5 : 1;
    const value = index + half;
    setHoverValue(value);
  };

  const handleStarClick = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = x < rect.width / 2 ? 0.5 : 1;
    const value = index + half;
    // enforce min rating of 1
    const final = Math.max(1, value);
    setRating(final);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ showID, rating, comment }),
      });
      if (res.status === 401) {
        alert(
          "You may have been timed out. Please, copy the text for your review so it is not lost, reload this page, making sure you're logged in, and try again."
        );
        if (refreshAuth) refreshAuth();
        return;
      }
      if (!res.ok) {
        // Generic failure: show requested timeout instruction to minimize data loss
        alert(
          "You may have been timed out. Please, copy the text for your review so it is not lost, reload this page, making sure you're logged in, and try again."
        );
        return;
      }
      setComment("");
      setRating(5);
      if (onNewReview) onNewReview();
    } catch (err) {
      console.error(err);
      alert(
        "Failed to post review. If you believe you're signed in, try copying your text, reloading the page and submitting again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div>
        <strong>Be a Pal 'n' leave your opinion on the show!</strong>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {/* render 5 stars with partial fill; use hoverValue for preview when present */}
        {Array.from({ length: 5 }).map((_, i) => {
          const valueToUse = hoverValue != null ? hoverValue : rating;
          const raw = valueToUse - i; // 1.. >1 etc
          const fill = Math.max(0, Math.min(1, raw));
          const color = hoverValue != null ? interactiveHover.color : '#e5b800';
          // disallow first star hover preview of 0.5 (show full on left-half)
          const handleMove = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            let half = x < rect.width / 2 ? 0.5 : 1;
            if (i === 0 && half === 0.5) half = 1; // prevent 0.5 preview on first star
            const value = i + half;
            setHoverValue(value);
          };
          const handleKey = (e) => {
            if (e.key === 'ArrowLeft') {
              setRating((r) => Math.max(1, Math.round((r - 0.5) * 2) / 2));
            } else if (e.key === 'ArrowRight') {
              setRating((r) => Math.min(5, Math.round((r + 0.5) * 2) / 2));
            } else if (e.key === 'Home') {
              setRating(1);
            } else if (e.key === 'End') {
              setRating(5);
            } else if (e.key === 'Enter' || e.key === ' ') {
              // toggle to this star full/half depending on hover
              const rect = e.currentTarget.getBoundingClientRect();
              const half = 1;
              const value = i + half;
              setRating(Math.max(1, value));
            }
          };
          return (
            <span
              key={i}
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverValue(null)}
              onClick={(e) => handleStarClick(e, i)}
              onKeyDown={handleKey}
              role="slider"
              tabIndex={0}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={rating}
              aria-label={`Rate ${i + 1} stars or half`}
              style={{ cursor: 'pointer', display: 'inline-block' }}
            >
              {/* use SVG star for crisp visuals */}
              <SVGStar fill={fill} color={color} id={`r-${i}-${String(Math.random()).slice(2,8)}`} />
            </span>
          );
        })}
      </div>

      <label style={{ display: "flex", flexDirection: "column" }}>
        Comment (max 500 chars):
        <textarea
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ width: "100%", minHeight: 80, marginTop: 6 }}
        />
      </label>

      <div>
        <button
          type="submit"
          disabled={submitting}
          style={{ ...interactiveButton, cursor: "pointer" }}
        >
          {submitting ? "Posting..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

function ReviewList({ reviews, currentUserId, onRefresh }) {
  const [loading, setLoading] = React.useState(false);
  const [localReviews, setLocalReviews] = React.useState(reviews || []);
  const [usernames, setUsernames] = React.useState({});
  const usernameCacheRef = React.useRef(new Map());

  React.useEffect(() => setLocalReviews(reviews || []), [reviews]);

  // fetch usernames for reviews, simple in-memory cache for this component
  React.useEffect(() => {
    let mounted = true;
    const fetchNames = async () => {
      const ids = Array.from(new Set((reviews || []).map(r => String(r.userID))));
      const toFetch = ids.filter(id => id && !usernameCacheRef.current.has(id));
      await Promise.all(toFetch.map(async (id) => {
        try {
          const res = await fetch(`http://localhost:8080/api/users/${id}/username`);
          if (!res.ok) return;
          const data = await res.json();
          usernameCacheRef.current.set(id, data.username);
        } catch (e) {
          console.error('failed to fetch username', id, e);
        }
      }));
      if (!mounted) return;
      const mapObj = {};
      usernameCacheRef.current.forEach((v, k) => (mapObj[k] = v));
      setUsernames(mapObj);
    };
    fetchNames();
    return () => { mounted = false; };
  }, [reviews]);

  const toggleLike = async (reviewId) => {
    try {
      // optimistic update
      setLocalReviews((cur) =>
        cur.map((r) => {
          if (String(r._id) !== String(reviewId)) return r;
          const userHasLiked =
            Array.isArray(r.likedBy) &&
            currentUserId &&
            r.likedBy.some((id) => String(id) === String(currentUserId));
          const newLikedBy = userHasLiked
            ? r.likedBy.filter((id) => String(id) !== String(currentUserId))
            : [...(r.likedBy || []), currentUserId];
          const newLikes = userHasLiked
            ? Math.max(0, (r.likes || 0) - 1)
            : (r.likes || 0) + 1;
          return { ...r, likedBy: newLikedBy, likes: newLikes };
        })
      );

      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8080/api/reviews/${reviewId}/like`,
        {
          method: "POST",
          headers: { Authorization: token },
        }
      );
      if (!res.ok) throw new Error("failed to toggle like");
      // update from server response
      const updated = await res.json();
      setLocalReviews((cur) =>
        cur.map((r) => (String(r._id) === String(updated._id) ? updated : r))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to like/unlike review. Make sure you are logged in.");
      if (onRefresh) onRefresh();
    }
  };

  if (!localReviews || localReviews.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {localReviews.map((r) => {
        const liked =
          Array.isArray(r.likedBy) && currentUserId
            ? r.likedBy.some((id) => String(id) === String(currentUserId))
            : false;
        return (
          <div
            key={r._id}
            style={{ border: "1px solid #ccc", padding: 8, background: "#fff", textAlign: 'left' }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div>
                    {/* username */}
                    <a href={`/user/${r.userID}`} style={{ color: '#6c2eb6', fontWeight: 700, textDecoration: 'none' }}>
                      {usernames[String(r.userID)] || 'Unknown'}
                    </a>
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>Rating:</div>
                <div>
                  {/* render stars for the review rating (no hover) */}
                  {Array.from({ length: 5 }).map((_, i) => {
                    const raw = r.rating - i;
                    const fill = Math.max(0, Math.min(1, raw));
                    return (
                      <span key={i} style={{ display: 'inline-block' }}>
                        <SVGStar fill={fill} size={16} color={'#e5b800'} id={`rev-${r._id}-${i}`} />
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <button
                  onClick={() => toggleLike(r._id)}
                  style={{ marginRight: 8, ...interactiveButton, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 68, padding: '0 6px' }}
                >
                  <span style={{ marginRight: 6 }}>{liked ? "♥" : "♡"}</span>
                  <span>{r.likes || 0}</span>
                </button>
              </div>
            </div>
            <div style={{ marginTop: 6, textAlign: 'left' }}>{r.comment}</div>
          </div>
        );
      })}
    </div>
  );
}
