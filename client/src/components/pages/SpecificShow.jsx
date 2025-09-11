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

// Dropdown UI for managing lists for the current show
function ListDropdown({ showID }) {
  const { isSignedIn, userId: currentUserId } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [lists, setLists] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(null); // list id pending deletion
  const [hovering, setHovering] = React.useState(false);
  const [hoverDeleteId, setHoverDeleteId] = React.useState(null);
  const [creatingName, setCreatingName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const modalRef = React.useRef(null);

  const fetchLists = async () => {
    setLoading(true);
    try {
      // Fetch user's regular lists
      const userListsRes = await fetch(
        `http://localhost:8080/api/lists?userID=${currentUserId}`
      );
      if (!userListsRes.ok) throw new Error("failed to fetch user lists");
      const userListsData = await userListsRes.json();
      const userLists = Array.isArray(userListsData.lists)
        ? userListsData.lists
        : [];

      // Fetch user's default lists (Watching, Finished, Dropped, Favorites)
      const defaultListsRes = await fetch(
        `http://localhost:8080/api/default-lists/${currentUserId}`
      );
      if (!defaultListsRes.ok) throw new Error("failed to fetch default lists");
      const defaultListsData = await defaultListsRes.json();
      const defaultLists = Array.isArray(defaultListsData)
        ? defaultListsData
        : [];

      // Combine both lists
      setLists([...userLists, ...defaultLists]);
    } catch (e) {
      console.error("fetch lists", e);
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && isSignedIn) fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isSignedIn]);

  // lock page scroll when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // close modal when clicking outside the modal content
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const createList = async (e) => {
    e && e.preventDefault();
    const name = creatingName && creatingName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      // revert: send raw token in Authorization header (previous working behavior)
      const res = await fetch("http://localhost:8080/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ name, shows: [String(showID)] }),
      });
      if (!res.ok) throw new Error("failed create");
      setCreatingName("");
      await fetchLists();
    } catch (e) {
      console.error("create list", e);
      alert("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const toggleShowInList = async (listId) => {
    try {
      const token = localStorage.getItem("token");
      const list = lists.find((l) => l._id === listId);

      if (!list) {
        throw new Error("List not found");
      }

      // Check if this is a default list (has listType property)
      if (list.listType) {
        // Handle default list
        const res = await fetch(
          `http://localhost:8080/api/default-lists/${list.listType}/toggle-show`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({ showID: String(showID) }),
          }
        );

        if (!res.ok) throw new Error("failed to toggle show in default list");
      } else {
        // Handle regular list
        const res = await fetch(
          `http://localhost:8080/api/lists/${listId}/toggle-show`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({ showID: String(showID) }),
          }
        );

        if (!res.ok) throw new Error("failed toggle");
      }

      await fetchLists();
    } catch (e) {
      console.error("toggle show", e);
      alert("Failed to toggle show in list");
    }
  };

  const deleteList = async (listId) => {
    try {
      const token = localStorage.getItem("token");
      // revert: send raw token in Authorization header
      const res = await fetch(`http://localhost:8080/api/lists/${listId}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => "");
        console.error("deleteList failed", res.status, txt);
        throw new Error(`failed delete: ${res.status} ${txt}`);
      }
      setConfirmDelete(null);
      await fetchLists();
    } catch (e) {
      console.error("delete list", e);
      alert("Failed to delete list. Check console for server error details.");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{ position: "relative", display: "inline-block" }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "#6c2eb6",
            color: "#ffd500",
            border: "none",
            padding: 8,
            borderRadius: 6,
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Lists"
        >
          <span
            style={{ display: "inline-block", transform: "translateY(2px)" }}
          >
            ⋮
          </span>
        </button>
        {hovering && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 6,
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "6px 8px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            Add/Remove show to/from a list
          </div>
        )}
      </div>

      {open && (
        // overlay inside parent bounds; clicking outside modal (the overlay) closes
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 200,
            background: "transparent",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pointerEvents: "auto",
            padding: window.innerWidth <= 480 ? "16px" : "32px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            style={{
              marginTop: window.innerWidth <= 480 ? 16 : 32,
              width:
                window.innerWidth <= 480
                  ? "calc(100vw - 32px)"
                  : "min(420px, calc(100vw - 64px))",
              maxWidth: 420,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={modalRef}
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: 8,
                padding: window.innerWidth <= 480 ? 12 : 16,
                color: "#000",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                position: "relative",
                maxHeight:
                  window.innerWidth <= 480 ? "calc(100vh - 100px)" : "80vh",
                overflowY: "auto",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  cursor: "pointer",
                }}
                title="Close"
              >
                ✕
              </button>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: "#6c2eb6",
                }}
              >
                Add/Remove this show to your lists!
              </div>

              {/* create form inline */}
              <form
                onSubmit={createList}
                style={{ display: "flex", gap: 8, marginBottom: 12 }}
              >
                <input
                  value={creatingName}
                  onChange={(e) => setCreatingName(e.target.value)}
                  placeholder="New list to put this show in"
                  style={{
                    flex: 1,
                    padding: 8,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                  }}
                />
                <button
                  type="submit"
                  disabled={creating}
                  style={{ ...interactiveButton }}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </form>
              {confirmDelete && (
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    Are you sure you want to delete this list? Deleted lists
                    cannot be recovered.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => deleteList(confirmDelete)}
                      style={{
                        ...interactiveButton,
                        background: "#c00",
                        color: "#fff",
                      }}
                    >
                      Yeah, Delete It
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{ padding: "6px 10px" }}
                    >
                      No! Don't Delete It!
                    </button>
                  </div>
                </div>
              )}

              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {loading ? (
                  <div>Loading lists...</div>
                ) : lists.length === 0 ? (
                  <div style={{ color: "#666" }}>You have no lists yet.</div>
                ) : (
                  lists.map((l) => (
                    <div
                      key={l._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 4px",
                        borderBottom: "1px solid #f1f1f1",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          id={`list-checkbox-${l._id}`}
                          type="checkbox"
                          checked={
                            Array.isArray(l.shows) &&
                            l.shows.some((s) => String(s) === String(showID))
                          }
                          readOnly
                          onClick={() => toggleShowInList(l._id)}
                          style={{ cursor: "pointer", accentColor: "#6c2eb6" }}
                        />
                        <span
                          onClick={() => toggleShowInList(l._id)}
                          style={{ cursor: "pointer" }}
                        >
                          {l.listType || l.name}
                        </span>
                      </div>
                      <div>
                        {/* Only show delete button for regular lists, not default lists */}
                        {!l.listType && (
                          <button
                            onClick={() => setConfirmDelete(l._id)}
                            onMouseEnter={() => setHoverDeleteId(l._id)}
                            onMouseLeave={() => setHoverDeleteId(null)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color:
                                hoverDeleteId === l._id ? "#6c2eb6" : "#666",
                              cursor: "pointer",
                              padding: 4,
                            }}
                          >
                            {/* SVG trash so color can be styled */}
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{
                                display: "block",
                                color:
                                  hoverDeleteId === l._id ? "#6c2eb6" : "#666",
                              }}
                            >
                              <path
                                d="M3 6h18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 11v6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14 11v6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M9 4h6l1 2H8l1-2z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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

  // Check if URL hash points to a review
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#review-")) {
      const targetReviewId = hash.substring(8); // Remove '#review-'

      // Function to attempt scrolling to the review
      const attemptScroll = (attempt = 1) => {
        const reviewElement = document.getElementById(
          `review-${targetReviewId}`
        );
        if (reviewElement) {
          // Wait for DOM to be fully updated, then scroll to the review
          setTimeout(() => {
            reviewElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            // Add a highlight effect
            const originalBoxShadow = reviewElement.style.boxShadow;
            reviewElement.style.boxShadow = "0 0 0 3px rgba(108,46,182,0.6)";
            setTimeout(() => {
              reviewElement.style.boxShadow = originalBoxShadow;
            }, 2000);
          }, 500); // Longer delay to ensure reviews are rendered
        } else if (attempt < 10) {
          // Element not found yet, try again with longer delay
          setTimeout(() => attemptScroll(attempt + 1), 200);
        }
      };

      // Start attempting to scroll after a delay
      setTimeout(() => attemptScroll(), 300);
    }
  }, [reviews]); // Re-run when reviews change

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
    <section
      style={{
        padding: window.innerWidth <= 480 ? "16px 0" : "24px",
        color: "#fff",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: 12,
            padding: window.innerWidth <= 480 ? "8px 12px" : "10px 16px",
            fontSize: window.innerWidth <= 480 ? "14px" : "16px",
          }}
        >
          ← Back
        </button>
        <div
          style={{
            display: "flex",
            flexDirection: window.innerWidth <= 768 ? "column" : "row",
            gap: window.innerWidth <= 480 ? 12 : 16,
            alignItems: window.innerWidth <= 768 ? "center" : "flex-start",
            color: "#000",
            width: "100%",
            background: "#ffd700",
            padding: window.innerWidth <= 480 ? "16px 12px" : "24px",
            boxSizing: "border-box",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          }}
        >
          {poster ? (
            <img
              src={poster}
              alt={show.name || show.original_name}
              style={{
                width:
                  window.innerWidth <= 480
                    ? 200
                    : window.innerWidth <= 768
                    ? 250
                    : 300,
                borderRadius: 8,
                marginBottom: window.innerWidth <= 768 ? 16 : 0,
              }}
            />
          ) : null}
          <div
            style={{
              textAlign: "left",
              flex: 1,
              position: "relative",
              width: window.innerWidth <= 768 ? "100%" : "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ marginTop: 0 }}>
                {show.name || show.original_name}
              </h1>

              <div
                style={{ fontSize: "1rem", fontWeight: "700", color: "#000" }}
              >
                {reviews && reviews.length ? (
                  <span>
                    Average Rating:{" "}
                    {(
                      reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
                      reviews.length
                    ).toFixed(2)}{" "}
                    (
                    <a
                      href="#reviews-section"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById("reviews-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        color: "#000",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {reviews.length}{" "}
                      {reviews.length === 1 ? "review" : "reviews"}
                    </a>
                    )
                  </span>
                ) : (
                  <span style={{ color: "#000" }}>
                    (This show does not have any reviews yet.)
                  </span>
                )}
              </div>
              {/* Lists modal trigger placed to the right of the rating */}
              <div style={{ marginLeft: 12 }}>
                <ListDropdown showID={showID} />
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
                          seasonData.name ||
                          `Season ${seasonData.season_number}`
                        }
                        style={{
                          width: window.innerWidth <= 480 ? 120 : 180,
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
        <div
          style={{
            marginTop: 20,
            color: "#000",
            width: "100%",
            background: "#ffd700",
            padding: window.innerWidth <= 480 ? "16px 12px" : "24px",
            boxSizing: "border-box",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Episodes - Season {selectedSeason}</h3>
          {seasonLoading && <div>Loading episodes...</div>}
          {seasonError && <div>Error: {seasonError}</div>}
          {seasonData && Array.isArray(seasonData.episodes) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(1, 1fr)",
                gap: window.innerWidth <= 480 ? 8 : 12,
              }}
            >
              {seasonData.episodes.map((ep) => (
                <div
                  key={ep.id}
                  style={{
                    border: "1px solid #000",
                    display: window.innerWidth <= 768 ? "block" : "grid",
                    gridTemplateColumns:
                      window.innerWidth <= 768
                        ? "none"
                        : "60px 240px 1fr 140px",
                  }}
                >
                  {window.innerWidth <= 768 ? (
                    // Mobile layout: stacked vertically
                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <strong style={{ fontSize: "18px" }}>
                          #{ep.episode_number}
                        </strong>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: "16px" }}>
                            {ep.name}
                          </strong>
                        </div>
                        <div style={{ color: "#666", fontSize: "14px" }}>
                          {ep.air_date || "N/A"}
                        </div>
                      </div>
                      <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                        {ep.overview || "No description available."}
                      </div>
                    </div>
                  ) : (
                    // Desktop layout: grid
                    <>
                      <div
                        style={{ borderRight: "1px solid #000", padding: 8 }}
                      >
                        <strong>#{ep.episode_number}</strong>
                      </div>
                      <div
                        style={{ borderRight: "1px solid #000", padding: 8 }}
                      >
                        <strong>{ep.name}</strong>
                      </div>
                      <div
                        style={{ borderRight: "1px solid #000", padding: 8 }}
                      >
                        {ep.overview}
                      </div>
                      <div style={{ padding: 8 }}>{ep.air_date || "N/A"}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews section */}
        <div
          style={{
            marginTop: 20,
            color: "#000",
            background: "#fff4b5",
            width: "100%",
            boxSizing: "border-box",
            padding: window.innerWidth <= 480 ? "16px 12px" : "24px",
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
  const Star = ({ fill = 0, color = "#e5b800" }) => {
    const pct = Math.max(0, Math.min(1, fill)) * 100;
    return (
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 22,
          height: 22,
          margin: "0 2px",
        }}
      >
        <span
          style={{
            ...starBase,
            color: "#ccc",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          ★
        </span>
        <span
          style={{
            ...starBase,
            color,
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pct}%`,
            overflow: "hidden",
            WebkitTextStroke: "0",
          }}
        >
          ★
        </span>
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
          const color = hoverValue != null ? interactiveHover.color : "#e5b800";
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
            if (e.key === "ArrowLeft") {
              setRating((r) => Math.max(1, Math.round((r - 0.5) * 2) / 2));
            } else if (e.key === "ArrowRight") {
              setRating((r) => Math.min(5, Math.round((r + 0.5) * 2) / 2));
            } else if (e.key === "Home") {
              setRating(1);
            } else if (e.key === "End") {
              setRating(5);
            } else if (e.key === "Enter" || e.key === " ") {
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
              style={{ cursor: "pointer", display: "inline-block" }}
            >
              {/* use SVG star for crisp visuals */}
              <SVGStar
                fill={fill}
                color={color}
                id={`r-${i}-${String(Math.random()).slice(2, 8)}`}
              />
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
  const [openReplyFor, setOpenReplyFor] = React.useState(null);
  const { isSignedIn } = useAuth();
  const [repliesOpenMap, setRepliesOpenMap] = React.useState({});

  React.useEffect(() => setLocalReviews(reviews || []), [reviews]);

  React.useEffect(() => {
    let mounted = true;
    const fetchNames = async () => {
      const ids = Array.from(
        new Set(
          (reviews || [])
            .map((r) => {
              // Handle both string and object userID formats
              if (typeof r.userID === "string") {
                return r.userID;
              } else if (r.userID && r.userID._id) {
                return r.userID._id;
              }
              return null;
            })
            .filter(Boolean)
        )
      );
      const toFetch = ids.filter(
        (id) => id && !usernameCacheRef.current.has(id)
      );
      await Promise.all(
        toFetch.map(async (id) => {
          try {
            const res = await fetch(
              `http://localhost:8080/api/users/${id}/username`
            );
            if (!res.ok) return;
            const data = await res.json();
            usernameCacheRef.current.set(id, data.username);
          } catch (e) {
            console.error("failed to fetch username", id, e);
          }
        })
      );
      if (!mounted) return;
      const mapObj = {};
      usernameCacheRef.current.forEach((v, k) => (mapObj[k] = v));
      setUsernames(mapObj);
    };
    fetchNames();
    return () => {
      mounted = false;
    };
  }, [reviews]);

  const toggleLike = async (reviewId) => {
    try {
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
        { method: "POST", headers: { Authorization: token } }
      );
      if (!res.ok) throw new Error("failed to toggle like");
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
        const idStr =
          typeof r.userID === "string" ? r.userID : r.userID && r.userID._id;
        const username =
          usernames[String(idStr)] ||
          (r.userID && typeof r.userID === "object" && r.userID.username) ||
          "Unknown";
        return (
          <div
            id={`review-${r._id}`}
            key={r._id}
            style={{
              border: "1px solid #ccc",
              padding: 8,
              background: "#fff",
              textAlign: "left",
              position: "relative",
              paddingBottom: 56,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <a
                  href={`/user/${idStr}`}
                  style={{
                    color: "#6c2eb6",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {username}
                </a>
                <div style={{ fontWeight: 700 }}>Rating:</div>
                <div>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const raw = r.rating - i;
                    const fill = Math.max(0, Math.min(1, raw));
                    return (
                      <span key={i} style={{ display: "inline-block" }}>
                        <SVGStar
                          fill={fill}
                          size={16}
                          color={"#e5b800"}
                          id={`rev-${r._id}-${i}`}
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ color: "#666" }}>
                  {r.created_at || r.createdAt
                    ? new Date(r.created_at || r.createdAt).toLocaleString()
                    : ""}
                </div>
                <div>
                  <button
                    onClick={() => toggleLike(r._id)}
                    style={{
                      marginRight: 8,
                      ...interactiveButton,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 68,
                      padding: "0 6px",
                    }}
                  >
                    <span style={{ marginRight: 6 }}>{liked ? "♥" : "♡"}</span>
                    <span>{r.likes || 0}</span>
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 6, textAlign: "left" }}>{r.comment}</div>
            {/* absolute bottom-right reply button (always present) */}
            <div style={{ position: "absolute", right: 8, bottom: 8 }}>
              {isSignedIn && !repliesOpenMap[String(r._id)] && (
                <button
                  onClick={() => setOpenReplyFor(String(r._id))}
                  style={{ ...interactiveButton }}
                >
                  Reply
                </button>
              )}
            </div>

            {/* inline reply form inside the review card when requested (stretches across parent box) */}
            {openReplyFor === String(r._id) && (
              <div style={{ marginTop: 12 }}>
                <InlineReplyForm
                  parentID={r._id}
                  parentModel={"Review"}
                  onPosted={() => {
                    setOpenReplyFor(null);
                    if (onRefresh) onRefresh();
                  }}
                  onClose={() => setOpenReplyFor(null)}
                  indentLevel={0}
                />
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <ReviewReplies
                reviewId={r._id}
                onOpenReply={(id) => setOpenReplyFor(String(id))}
                onOpenChange={(isOpen) =>
                  setRepliesOpenMap((prev) => ({
                    ...prev,
                    [String(r._id)]: !!isOpen,
                  }))
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewReplies({ reviewId, onOpenReply, onOpenChange }) {
  const [open, setOpen] = React.useState(false);
  const [replies, setReplies] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { isSignedIn, userId: currentUserId } = useAuth();
  const [replyFormOpen, setReplyFormOpen] = React.useState(false);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/replies?parentID=${encodeURIComponent(
          reviewId
        )}`
      );
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setReplies(Array.isArray(data.replies) ? data.replies : []);
    } catch (e) {
      console.error("fetch replies", e);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) fetchReplies();
    const next = !open;
    setOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  // preload reply list/count so the toggle can be shown on page load
  // NOTE: keep hooks (useEffect) in the same order on every render
  React.useEffect(() => {
    fetchReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  // Check if URL hash points to a reply
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#reply-")) {
      const targetReplyId = hash.substring(7); // Remove '#reply-'

      // Function to recursively check if this replies section contains the target reply
      const containsTargetReply = (replyList) => {
        return replyList.some((reply) => {
          if (String(reply._id) === String(targetReplyId)) {
            return true;
          }
          // Check nested replies recursively
          if (reply.replies && reply.replies.length > 0) {
            return containsTargetReply(reply.replies);
          }
          return false;
        });
      };

      // Function to find the root review ID by tracing parent chain
      const findRootReviewId = async (replyId) => {
        try {
          // Ensure replyId is a string, not an object
          const id =
            typeof replyId === "object" ? replyId._id || replyId : replyId;
          const res = await fetch(`http://localhost:8080/api/replies/${id}`);
          if (!res.ok) {
            if (res.status === 404) {
              console.warn(`Reply ${id} not found, cannot trace parent chain`);
              return null;
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          const reply = await res.json();

          if (reply.parentModel === "Review") {
            // Ensure parentID is a string
            return typeof reply.parentID === "object"
              ? reply.parentID._id || reply.parentID
              : reply.parentID;
          } else if (reply.parentModel === "Reply") {
            // Recursively find the root review
            const parentId =
              typeof reply.parentID === "object"
                ? reply.parentID._id || reply.parentID
                : reply.parentID;
            return await findRootReviewId(parentId);
          }
        } catch (e) {
          console.error("Error finding root review:", e);
          return null;
        }
        return null;
      };

      // Function to get the full path from root review to target reply
      const getReplyPath = async (targetId, currentPath = []) => {
        try {
          // Ensure targetId is a string
          const id =
            typeof targetId === "object" ? targetId._id || targetId : targetId;
          const res = await fetch(`http://localhost:8080/api/replies/${id}`);
          if (!res.ok) return currentPath;
          const reply = await res.json();

          const newPath = [reply._id, ...currentPath];

          if (reply.parentModel === "Review") {
            // Ensure parentID is a string
            const parentId =
              typeof reply.parentID === "object"
                ? reply.parentID._id || reply.parentID
                : reply.parentID;
            return [parentId, ...newPath]; // [rootReviewId, ...replyIds]
          } else if (reply.parentModel === "Reply") {
            // Ensure parentID is a string
            const parentId =
              typeof reply.parentID === "object"
                ? reply.parentID._id || reply.parentID
                : reply.parentID;
            return await getReplyPath(parentId, newPath);
          }
        } catch (e) {
          console.error("Error getting reply path:", e);
        }
        return currentPath;
      };

      // Main logic for handling reply hash
      const handleReplyHash = async () => {
        // First check if target is directly in current replies
        if (containsTargetReply(replies) && !open) {
          if (replies.length === 0) {
            await fetchReplies();
          }
          setOpen(true);
          if (onOpenChange) onOpenChange(true);
          return;
        }

        // If not found directly, check if this review contains the target in its hierarchy
        const rootReviewId = await findRootReviewId(targetReplyId);
        if (String(rootReviewId) === String(reviewId)) {
          // This is the correct review, expand its replies
          if (!open) {
            if (replies.length === 0) {
              await fetchReplies();
            }
            setOpen(true);
            if (onOpenChange) onOpenChange(true);
          }
        }
      };

      handleReplyHash();
    }
  }, [replies, reviewId]); // Re-run when replies or reviewId change

  // Handle scrolling and highlighting after replies are expanded
  React.useEffect(() => {
    if (open && replies.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#reply-")) {
        const targetReplyId = hash.substring(7);

        // Use multiple attempts to find and scroll to the reply
        const attemptScroll = (attempt = 1) => {
          const replyElement = document.getElementById(
            `reply-${targetReplyId}`
          );
          if (replyElement) {
            // Wait a bit more for DOM to be fully updated
            setTimeout(() => {
              // Scroll to the reply
              replyElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });

              // Add a highlight effect
              const originalBoxShadow = replyElement.style.boxShadow;
              replyElement.style.boxShadow = "0 0 0 3px rgba(108,46,182,0.6)";
              setTimeout(() => {
                replyElement.style.boxShadow = originalBoxShadow;
              }, 2000);
            }, 200);
          } else if (attempt < 15) {
            // Element not found yet, try again with longer delay
            setTimeout(() => attemptScroll(attempt + 1), 400);
          }
        };

        // Start attempting to scroll after a delay
        setTimeout(() => attemptScroll(), 300);
      }
    }
  }, [open, replies]);

  // we always render a Reply control; if there are zero replies we still show a compact Reply button

  return (
    <div>
      {/* Toggle text only is clickable; surrounding container not */}
      <div>
        {replies.length > 0 ? (
          <span
            style={{
              cursor: "pointer",
              color: "#6c2eb6",
              textDecoration: "underline",
            }}
            onClick={toggle}
          >
            {!open ? (
              <span>{`View ${replies.length} ${
                replies.length === 1 ? "Reply" : "Replies"
              }`}</span>
            ) : (
              <span>Hide Replies</span>
            )}
          </span>
        ) : null}
      </div>

      {/* when closed, the review card itself renders the compact bottom-right Reply button; do not duplicate it here */}

      {/* when open, show Reply button above the replies */}
      {open && (
        <div style={{ marginTop: 8 }}>
          {/* Reply button above replies; clicking opens the inline form only when pressed */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 8,
            }}
          >
            {isSignedIn && !replyFormOpen && (
              <button
                onClick={() => setReplyFormOpen(true)}
                style={{ ...interactiveButton, padding: "6px 10px" }}
              >
                Reply
              </button>
            )}
          </div>

          {replyFormOpen && (
            <div style={{ marginBottom: 8 }}>
              <InlineReplyForm
                parentID={reviewId}
                parentModel={"Review"}
                indentLevel={0}
                onPosted={() => {
                  fetchReplies();
                  setReplyFormOpen(false);
                }}
                onClose={() => setReplyFormOpen(false)}
              />
            </div>
          )}

          {loading ? (
            <div>Loading replies...</div>
          ) : (
            <RepliesList
              replies={replies}
              parentReviewId={reviewId}
              onPosted={fetchReplies}
              currentUserId={currentUserId}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Recursive replies renderer
function RepliesList({ replies, parentReviewId, level = 0, onPosted }) {
  const [openReplyFor, setOpenReplyFor] = React.useState(null);
  const [childrenState, setChildrenState] = React.useState({}); // id -> { open, loading, replies }

  const fetchChildren = async (parentId, { preloadOnly = false } = {}) => {
    setChildrenState((s) => ({
      ...s,
      [parentId]: { ...(s[parentId] || {}), loading: true },
    }));
    try {
      const res = await fetch(
        `http://localhost:8080/api/replies?parentID=${encodeURIComponent(
          parentId
        )}`
      );
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const list = Array.isArray(data.replies) ? data.replies : [];
      setChildrenState((s) => ({
        ...s,
        [parentId]: {
          ...(s[parentId] || {}),
          loading: false,
          replies: list,
          open: preloadOnly ? false : list.length > 0,
        },
      }));
    } catch (e) {
      console.error("fetch child replies", e);
      setChildrenState((s) => ({
        ...s,
        [parentId]: {
          ...(s[parentId] || {}),
          loading: false,
          replies: [],
          open: false,
        },
      }));
    }
  };

  const toggleChildren = (parentId) => {
    const st = childrenState[parentId];
    if (!st) return fetchChildren(parentId);
    if (st.open) {
      setChildrenState((s) => ({ ...s, [parentId]: { ...st, open: false } }));
    } else {
      // already have replies loaded (from preload), just open
      setChildrenState((s) => ({ ...s, [parentId]: { ...st, open: true } }));
    }
  };

  // Check if URL hash points to a reply in this nested replies section
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#reply-")) {
      const targetReplyId = hash.substring(7);

      // Function to get the full path from root review to target reply
      const getReplyPath = async (targetId, currentPath = []) => {
        try {
          // Ensure targetId is a string
          const id =
            typeof targetId === "object" ? targetId._id || targetId : targetId;
          const res = await fetch(`http://localhost:8080/api/replies/${id}`);
          if (!res.ok) return currentPath;
          const reply = await res.json();

          const newPath = [reply._id, ...currentPath];

          if (reply.parentModel === "Review") {
            // Ensure parentID is a string
            const parentId =
              typeof reply.parentID === "object"
                ? reply.parentID._id || reply.parentID
                : reply.parentID;
            return [parentId, ...newPath]; // [rootReviewId, ...replyIds]
          } else if (reply.parentModel === "Reply") {
            // Ensure parentID is a string
            const parentId =
              typeof reply.parentID === "object"
                ? reply.parentID._id || reply.parentID
                : reply.parentID;
            return await getReplyPath(parentId, newPath);
          }
        } catch (e) {
          console.error("Error getting reply path:", e);
        }
        return currentPath;
      };

      // Function to expand all replies along the path
      const expandPath = async (path) => {
        // path format: [rootReviewId, replyId1, replyId2, ..., targetReplyId]
        const replyIds = path.slice(1); // Skip root review ID

        // Expand each level sequentially
        for (let i = 0; i < replyIds.length - 1; i++) {
          const currentReplyId = replyIds[i];
          const nextReplyId = replyIds[i + 1];

          // Make sure current reply's children are loaded and expanded
          if (!childrenState[currentReplyId]?.open) {
            // Fetch children if not loaded
            if (!childrenState[currentReplyId]?.replies) {
              await fetchChildren(currentReplyId, { preloadOnly: false });
            }

            // Expand the current reply's children
            setChildrenState((prev) => ({
              ...prev,
              [currentReplyId]: {
                ...prev[currentReplyId],
                open: true,
              },
            }));

            // Wait a bit for state to update
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      };

      // Main logic for handling nested reply hash
      const handleNestedReplyHash = async () => {
        const path = await getReplyPath(targetReplyId);

        if (path.length > 1) {
          // Check if the target reply is in this replies section
          const replyIds = path.slice(1);
          const isInThisSection = replies.some((reply) =>
            replyIds.includes(String(reply._id))
          );

          if (isInThisSection) {
            await expandPath(path);
          }
        }
      };

      handleNestedReplyHash();
    }
  }, [replies, childrenState]);

  // preload child replies count for each reply so we can show "View N Replies" toggles immediately
  React.useEffect(() => {
    if (!Array.isArray(replies) || replies.length === 0) return;
    replies.forEach((rep) => {
      if (!childrenState[rep._id]) {
        // preload but do not open
        fetchChildren(rep._id, { preloadOnly: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replies]);

  return (
    <div>
      {replies.map((rep) => (
        <div
          key={rep._id}
          style={{ marginLeft: 24 * (level + 1), marginTop: 8 }}
        >
          <div
            id={`reply-${rep._id}`}
            style={{ border: "1px solid #ccc", padding: 8, background: "#fff" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <a
                  href={`/user/${
                    (rep.userID && (rep.userID._id || rep.userID)) || ""
                  }`}
                  style={{
                    color: "#6c2eb6",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {(rep.userID &&
                    typeof rep.userID === "object" &&
                    rep.userID.username) ||
                    (rep.userID &&
                      typeof rep.userID === "string" &&
                      rep.userID) ||
                    "Unknown"}
                </a>
                <div style={{ color: "#444" }}>
                  responded to{" "}
                  {rep.parentID &&
                  rep.parentID.userID &&
                  (rep.parentID.userID.username ||
                    String(rep.parentID.userID)) ? (
                    <a
                      href={`#${
                        rep.parentID && rep.parentID._id
                          ? `${
                              rep.parentModel === "Review"
                                ? `review-${rep.parentID._id}`
                                : `reply-${rep.parentID._id}`
                            }`
                          : parentReviewId
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        const targetId =
                          rep.parentID && rep.parentID._id
                            ? rep.parentModel === "Review"
                              ? `review-${rep.parentID._id}`
                              : `reply-${rep.parentID._id}`
                            : `review-${parentReviewId}`;
                        const el = document.getElementById(targetId);
                        if (el) {
                          const orig = el.style.transition || "";
                          el.style.transition = "box-shadow 0.2s ease";
                          el.style.boxShadow = "0 0 0 3px rgba(108,46,182,0.6)";
                          setTimeout(() => {
                            el.style.boxShadow = "";
                            el.style.transition = orig;
                          }, 1000);
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }
                      }}
                      style={{ color: "#6c2eb6" }}
                    >
                      {rep.parentID.userID.username ||
                        String(rep.parentID.userID)}
                      's post
                    </a>
                  ) : (
                    <span>original post</span>
                  )}
                </div>
              </div>
              <div style={{ color: "#666" }}>
                {new Date(rep.created_at || rep.createdAt).toLocaleString()}
              </div>
            </div>
            <div style={{ marginTop: 6 }}>{rep.comment}</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <div />
              <div>
                <ReplyLikeAndButton
                  reply={rep}
                  onPosted={onPosted}
                  indentLevel={level + 1}
                  onOpenReply={(id) => setOpenReplyFor(String(id))}
                />
              </div>
            </div>
          </div>

          {/* inline reply form for replying to this reply */}
          {openReplyFor === String(rep._id) && (
            <div style={{ marginTop: 8 }}>
              <InlineReplyForm
                parentID={rep._id}
                parentModel={"Reply"}
                onPosted={() => {
                  setOpenReplyFor(null);
                  if (onPosted) onPosted();
                }}
                onClose={() => setOpenReplyFor(null)}
                indentLevel={level + 1}
              />
            </div>
          )}

          {/* View/hide replies to this reply (fetch on demand). Don't show anything if there are 0 child replies. */}
          <div style={{ marginLeft: 8, marginTop: 6 }}>
            {childrenState[rep._id] && childrenState[rep._id].loading && (
              <div>Loading replies...</div>
            )}

            {childrenState[rep._id] &&
              !childrenState[rep._id].loading &&
              childrenState[rep._id].replies &&
              childrenState[rep._id].replies.length > 0 && (
                <div>
                  <div
                    style={{
                      cursor: "pointer",
                      color: "#6c2eb6",
                      textDecoration: "underline",
                    }}
                    onClick={() => toggleChildren(rep._id)}
                  >
                    {!childrenState[rep._id].open
                      ? `View ${childrenState[rep._id].replies.length} ${
                          childrenState[rep._id].replies.length === 1
                            ? "Reply"
                            : "Replies"
                        }`
                      : "Hide Replies"}
                  </div>
                  {childrenState[rep._id].open && (
                    <div style={{ marginTop: 8 }}>
                      <RepliesList
                        replies={childrenState[rep._id].replies}
                        parentReviewId={parentReviewId}
                        level={level + 1}
                        onPosted={onPosted}
                      />
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Bottom-right reply button + toggled form (styled similar to ReviewForm but only comment)
function BottomRightReply({
  parentID,
  parentModel,
  onPosted,
  indentLevel = 0,
  compact = false,
}) {
  const [open, setOpen] = React.useState(false);
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return null;

  // compact variant: show a small Reply button which opens the inline form
  if (compact) {
    return (
      <div>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            style={{ ...interactiveButton, padding: "4px 8px", fontSize: 12 }}
          >
            Reply
          </button>
        ) : (
          <div style={{ marginTop: 8 }}>
            <InlineReplyForm
              parentID={parentID}
              parentModel={parentModel}
              indentLevel={indentLevel}
              onPosted={() => {
                setOpen(false);
                if (onPosted) onPosted();
              }}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: 0 }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{ ...interactiveButton, padding: "6px 10px" }}
        >
          Reply
        </button>
      ) : (
        <div style={{ marginTop: 8 }}>
          <InlineReplyForm
            parentID={parentID}
            parentModel={parentModel}
            indentLevel={indentLevel}
            onPosted={() => {
              setOpen(false);
              if (onPosted) onPosted();
            }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// Combines a like button for replies and the Reply button/form
function ReplyLikeAndButton({ reply, onPosted, indentLevel = 0, onOpenReply }) {
  const { isSignedIn, userId: currentUserId } = useAuth();
  const [local, setLocal] = React.useState(reply);
  React.useEffect(() => setLocal(reply), [reply]);

  const liked =
    Array.isArray(local.likedBy) && currentUserId
      ? local.likedBy.some((id) => String(id) === String(currentUserId))
      : false;

  const toggleLike = async (replyId) => {
    // optimistic
    setLocal((cur) => {
      const has =
        Array.isArray(cur.likedBy) && currentUserId
          ? cur.likedBy.some((id) => String(id) === String(currentUserId))
          : false;
      const newLikedBy = has
        ? cur.likedBy.filter((id) => String(id) !== String(currentUserId))
        : [...(cur.likedBy || []), currentUserId];
      const newLikes = has
        ? Math.max(0, (cur.likes || 0) - 1)
        : (cur.likes || 0) + 1;
      return { ...cur, likedBy: newLikedBy, likes: newLikes };
    });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8080/api/replies/${replyId}/like`,
        { method: "POST", headers: { Authorization: token } }
      );
      if (!res.ok) throw new Error("failed");
      const updated = await res.json();
      setLocal(updated);
    } catch (e) {
      console.error("reply like failed", e);
      // rollback by re-fetching parent list
      if (onPosted) onPosted();
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => toggleLike(reply._id)}
        style={{
          ...interactiveButton,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 68,
          padding: "0 6px",
        }}
      >
        <span style={{ marginRight: 6 }}>{liked ? "♥" : "♡"}</span>
        <span>{local.likes || 0}</span>
      </button>
      {isSignedIn && (
        <button
          onClick={() => onOpenReply && onOpenReply(reply._id)}
          style={{ ...interactiveButton, padding: "6px 10px" }}
        >
          Reply
        </button>
      )}
    </div>
  );
}

function ReplyForm({ parentID, parentModel, onPosted }) {
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const { isSignedIn } = useAuth();

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ parentID, parentModel, comment: text }),
      });
      if (res.status === 401) {
        alert("Please sign in.");
        return;
      }
      if (!res.ok) {
        alert("Failed to post reply");
        return;
      }
      setText("");
      if (onPosted) onPosted();
    } catch (e) {
      console.error("post reply", e);
      alert("Failed to post reply");
    } finally {
      setPosting(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply..."
        style={{ minWidth: 240 }}
      />
      <button
        onClick={submit}
        disabled={posting}
        style={{ ...interactiveButton }}
      >
        {posting ? "Posting..." : "Reply"}
      </button>
    </div>
  );
}

// Inline reply form that stretches across the parent post box and matches ReviewForm styling
function InlineReplyForm({
  parentID,
  parentModel,
  onPosted,
  onClose,
  indentLevel = 0,
}) {
  const [text, setText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const { isSignedIn } = useAuth();

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ parentID, parentModel, comment: text }),
      });
      if (res.status === 401) {
        alert("Please sign in.");
        return;
      }
      if (!res.ok) {
        alert("Failed to post reply");
        return;
      }
      setText("");
      if (onPosted) onPosted();
    } catch (e) {
      console.error("post reply", e);
      alert("Failed to post reply");
    } finally {
      setPosting(false);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 12,
        background: "#fff",
        marginLeft: indentLevel * 24,
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Reply</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ boxSizing: "border-box", width: "100%", minHeight: 100 }}
      />
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          onClick={() => {
            if (onClose) onClose();
            setText("");
          }}
          style={{ padding: "6px 10px" }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={posting}
          style={{ ...interactiveButton }}
        >
          {posting ? "Posting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
