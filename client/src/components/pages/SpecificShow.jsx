import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { popularShowsSection } from "./homeStyles";

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
          <h1 style={{ marginTop: 0 }}>{show.name || show.original_name}</h1>
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
                  gridTemplateColumns: "60px 1fr 200px 140px",
                  border: "1px solid #000",
                }}
              >
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  <strong>#{ep.episode_number}</strong>
                </div>
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  <strong>{ep.name}</strong>
                  <div>{ep.overview}</div>
                </div>
                <div style={{ borderRight: "1px solid #000", padding: 8 }}>
                  {/* placeholder for any extra field */}
                </div>
                <div style={{ padding: 8 }}>{ep.air_date || "N/A"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews section */}
      <div style={{ ...popularShowsSection, marginTop: 20, color: "#000" }}>
        <h3 style={{ marginTop: 0 }}>Reviews</h3>
        <ReviewForm showID={showID} onNewReview={() => fetchReviews()} />
        <div style={{ marginTop: 12 }}>
          <h4>Existing reviews</h4>
          <ReviewList showID={showID} />
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ showID, onNewReview }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ showID, rating, comment }),
      });
      if (!res.ok) throw new Error("Failed to post review");
      setComment("");
      setRating(5);
      if (onNewReview) onNewReview();
    } catch (err) {
      console.error(err);
      alert("Failed to post review (are you logged in?)");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", gap: 8, alignItems: "center" }}
    >
      <label>
        Rating:
        <input
          type="number"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          style={{ width: 60, marginLeft: 8 }}
        />
      </label>
      <label style={{ flex: 1 }}>
        Comment:
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ width: "100%", marginLeft: 8 }}
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        style={{ padding: "8px 12px" }}
      >
        {submitting ? "Posting..." : "Submit"}
      </button>
    </form>
  );
}

function ReviewList({ showID }) {
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      // server currently returns all reviews; filter client-side by showID
      const list = Array.isArray(data.reviews)
        ? data.reviews.filter((r) => String(r.showID) === String(showID))
        : [];
      setReviews(list);
    } catch (err) {
      console.error(err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetch();
  }, [showID]);

  if (loading) return <div>Loading reviews...</div>;
  if (!reviews.length) return <div>No reviews yet.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {reviews.map((r) => (
        <div key={r._id} style={{ border: "1px solid #ccc", padding: 8 }}>
          <div>
            <strong>Rating:</strong> {r.rating}
          </div>
          <div>{r.comment}</div>
        </div>
      ))}
    </div>
  );
}
