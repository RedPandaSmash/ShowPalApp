import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ListManager from "../multiuse/ListManager";
import { popularShowsSection } from "./homeStyles";
import { interactiveButton } from "../multiuse/interactiveStyles";

export default function Lists() {
  const { isSignedIn, userId } = useAuth();

  const [recentLists, setRecentLists] = useState([]);
  const [followedLists, setFollowedLists] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingFollowed, setLoadingFollowed] = useState(false);
  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [showsMeta, setShowsMeta] = useState({});
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(new Set());

  const refreshFailedShows = () => {
    // Clear cached null values and refetch
    const failedIds = Object.keys(showsMeta).filter(
      (id) => showsMeta[id] === null
    );
    if (failedIds.length > 0) {
      console.log(`Refreshing ${failedIds.length} failed shows`);
      const updatedMeta = { ...showsMeta };
      failedIds.forEach((id) => delete updatedMeta[id]);
      setShowsMeta(updatedMeta);
      fetchShowsMeta(failedIds, 0, true); // Force refresh
    }
  };

  const fetchShowsMeta = async (
    ids = [],
    retryCount = 0,
    forceRefresh = false
  ) => {
    if (!ids || ids.length === 0) return;
    const toFetch = forceRefresh ? ids : ids.filter((id) => !showsMeta[id]);
    if (!forceRefresh && toFetch.length === 0) return;

    // Create a request key to prevent duplicate requests
    const requestKey = toFetch.sort().join(",");
    const isRequestPending = pendingRequests.has(requestKey);

    if (isRequestPending && !forceRefresh) {
      console.log(`Request already pending for shows: ${toFetch.join(", ")}`);
      return;
    }

    console.log(
      `Fetching metadata for ${toFetch.length} shows (attempt ${
        retryCount + 1
      })`
    );

    // Add to pending requests
    setPendingRequests((prev) => new Set([...prev, requestKey]));

    try {
      const res = await fetch(`/api/shows?action=batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: toFetch }),
      });
      if (!res.ok) throw new Error(`batch failed with status ${res.status}`);
      const data = await res.json();

      // Use functional state update to avoid race conditions
      setShowsMeta((prevMeta) => {
        const next = { ...prevMeta };
        let successCount = 0;
        let nullCount = 0;

        if (data && data.results) {
          for (const id of toFetch) {
            const result = data.results[id];
            if (result) {
              next[id] = result;
              successCount++;
            } else {
              next[id] = null;
              nullCount++;
            }
          }
        }

        console.log(
          `Batch result: ${successCount} successful, ${nullCount} failed for ${toFetch.length} shows`
        );
        console.log("Show IDs processed:", toFetch);

        return next;
      });

      // If we have failed fetches and haven't retried too many times, retry after a delay
      if (data && data.results) {
        const failedIds = toFetch.filter((id) => !data.results[id]);
        if (failedIds.length > 0 && retryCount < 2) {
          console.log(
            `Retrying ${failedIds.length} failed shows in 2 seconds...`
          );
          setTimeout(() => {
            fetchShowsMeta(failedIds, retryCount + 1);
          }, 2000);
        }
      }
    } catch (e) {
      console.error("fetchShowsMeta error:", e);
      // If network error and we haven't retried too many times, retry
      if (retryCount < 2) {
        console.log(`Network error, retrying in 3 seconds...`);
        setTimeout(() => {
          fetchShowsMeta(ids, retryCount + 1);
        }, 3000);
      }
    } finally {
      // Remove from pending requests
      setPendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestKey);
        return newSet;
      });
    }
  };

  useEffect(() => {
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const res = await fetch(`/api/lists`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setRecentLists(lists);

        // Fetch show metadata for recent lists
        const ids = Array.from(
          new Set(lists.flatMap((l) => (Array.isArray(l.shows) ? l.shows : [])))
        );
        if (ids.length > 0) {
          console.log("Recent lists show IDs:", ids);
          fetchShowsMeta(ids);
        }
      } catch (e) {
        console.error("fetch recent lists", e);
        setRecentLists([]);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  useEffect(() => {
    const fetchFollowed = async () => {
      if (!isSignedIn || !userId) return;
      setLoadingFollowed(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/lists/followed`, {
          headers: { Authorization: token },
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setFollowedLists(lists);

        // Fetch show metadata for followed lists
        const ids = Array.from(
          new Set(lists.flatMap((l) => (Array.isArray(l.shows) ? l.shows : [])))
        );
        if (ids.length > 0) {
          console.log("Followed lists show IDs:", ids);
          fetchShowsMeta(ids);
        }
      } catch (e) {
        console.error("fetch followed lists", e);
        setFollowedLists([]);
      } finally {
        setLoadingFollowed(false);
      }
    };
    fetchFollowed();
  }, [isSignedIn, userId]);

  return (
    <div>
      {/* My Lists Section */}
      <ListManager
        userId={userId}
        isOwnProfile={true}
        title="My Lists"
        showEditButtons={true}
        showCreator={false}
      />

      {/* Lists by People I Follow Section */}
      <section
        style={{
          ...popularShowsSection,
          padding: window.innerWidth <= 480 ? "16px 12px" : 24,
          margin: window.innerWidth <= 480 ? "24px 0" : "24px auto",
          paddingBottom: window.innerWidth <= 480 ? 24 : 48,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 8,
            position: "relative",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>
            Lists by People I Follow
          </h2>
          <div
            style={{
              position: "absolute",
              right: 0,
              display: "flex",
              gap: "8px",
            }}
          >
            {Object.values(showsMeta).some((meta) => meta === null) && (
              <button
                onClick={refreshFailedShows}
                style={{
                  ...interactiveButton,
                  padding: "4px 8px",
                  fontSize: "0.8em",
                  background: "#ff6b6b",
                  color: "#fff",
                }}
                title="Refresh failed show metadata"
              >
                ↻ Refresh Failed
              </button>
            )}
          </div>
        </div>
        {!isSignedIn ? (
          <div style={{ color: "#666" }}>
            Sign in to see lists from people you follow.
          </div>
        ) : loadingFollowed ? (
          <div>Loading followed lists...</div>
        ) : followedLists.length === 0 ? (
          <div style={{ color: "#666" }}>
            Follow users to see their lists here.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth <= 480
                    ? "repeat(1, 1fr)"
                    : window.innerWidth <= 768
                    ? "repeat(2, 1fr)"
                    : "repeat(3, 1fr)",
                gap: window.innerWidth <= 480 ? 12 : 16,
                justifyItems: "center",
              }}
            >
              {(showAllFollowed
                ? followedLists
                : followedLists.slice(0, 9)
              ).map((list) => (
                <div
                  key={list._id}
                  style={{
                    width: "100%",
                    maxWidth: window.innerWidth <= 480 ? 280 : 320,
                    background: "#fff",
                    color: "#000",
                    padding: window.innerWidth <= 480 ? 8 : 12,
                    borderRadius: 8,
                    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: window.innerWidth <= 480 ? 6 : 8,
                    maxHeight: window.innerWidth <= 480 ? 300 : 360,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{list.name}</strong>
                      <div
                        style={{
                          fontSize: "0.8em",
                          color: "#666",
                          marginTop: 2,
                        }}
                      >
                        by{" "}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/user/${list.userID._id}`;
                          }}
                          style={{
                            color: "#6c2eb6",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {list.userID.username}
                        </span>
                      </div>
                    </div>
                    <small style={{ color: "#666" }}>
                      {list.shows ? list.shows.length : 0} shows
                    </small>
                  </div>
                  <div
                    style={{
                      overflowY: "auto",
                      maxHeight: 240,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {Array.isArray(list.shows) && list.shows.length > 0 ? (
                      list.shows.slice(0, 3).map((sid) => {
                        const meta = showsMeta[sid];
                        const title = meta
                          ? meta.name || meta.title || sid
                          : sid;
                        const poster =
                          meta &&
                          meta.poster_path &&
                          meta.poster_path.trim() !== ""
                            ? `https://image.tmdb.org/t/p/w200${
                                meta.poster_path.startsWith("/") ? "" : "/"
                              }${meta.poster_path}`
                            : `data:image/svg+xml;utf8,${encodeURIComponent(
                                `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
                              )}`;

                        return (
                          <div
                            key={sid}
                            style={{
                              display: "flex",
                              gap: window.innerWidth <= 480 ? 6 : 8,
                              alignItems: "center",
                            }}
                            onClick={() =>
                              (window.location.href = `/shows/${sid}`)
                            }
                          >
                            <img
                              src={poster}
                              alt={title}
                              style={{
                                width: window.innerWidth <= 480 ? 48 : 64,
                                height: window.innerWidth <= 480 ? 68 : 90,
                                objectFit: "cover",
                                borderRadius: 6,
                                cursor: "pointer",
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                background: "#ffd700",
                                padding: 6,
                                borderRadius: 4,
                              }}
                            >
                              <div
                                style={{ cursor: "pointer", color: "#6c2eb6" }}
                              >
                                {title}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: "#666" }}>
                        No shows in this list yet.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {followedLists.length > 9 && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <button
                  onClick={() => setShowAllFollowed((v) => !v)}
                  style={{
                    ...interactiveButton,
                    background: "#6c2eb6",
                    color: "#ffd700",
                  }}
                >
                  {showAllFollowed ? "Show Less" : "See All"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Recent Lists Section */}
      <section
        style={{
          ...popularShowsSection,
          padding: window.innerWidth <= 480 ? "16px 12px" : 24,
          margin: window.innerWidth <= 480 ? "24px 0" : "24px auto",
          paddingBottom: window.innerWidth <= 480 ? 24 : 48,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Recent Lists</h2>
        {loadingRecent ? (
          <div>Loading recent lists...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                window.innerWidth <= 480
                  ? "repeat(1, 1fr)"
                  : window.innerWidth <= 768
                  ? "repeat(2, 1fr)"
                  : "repeat(3, 1fr)",
              gap: window.innerWidth <= 480 ? 12 : 16,
              justifyItems: "center",
            }}
          >
            {recentLists.slice(0, 12).map((list) => (
              <div
                key={list._id}
                style={{
                  width: "100%",
                  maxWidth: window.innerWidth <= 480 ? 280 : 320,
                  background: "#fff",
                  color: "#000",
                  padding: window.innerWidth <= 480 ? 8 : 12,
                  borderRadius: 8,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: window.innerWidth <= 480 ? 6 : 8,
                  maxHeight: window.innerWidth <= 480 ? 300 : 360,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{list.name}</strong>
                    <div
                      style={{ fontSize: "0.8em", color: "#666", marginTop: 2 }}
                    >
                      by{" "}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/user/${list.userID._id}`;
                        }}
                        style={{
                          color: "#6c2eb6",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {list.userID.username}
                      </span>
                    </div>
                  </div>
                  <small style={{ color: "#666" }}>
                    {list.shows ? list.shows.length : 0} shows
                  </small>
                </div>
                <div
                  style={{
                    overflowY: "auto",
                    maxHeight: 240,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {Array.isArray(list.shows) && list.shows.length > 0 ? (
                    list.shows.slice(0, 3).map((sid) => {
                      const meta = showsMeta[sid];
                      const title = meta ? meta.name || meta.title || sid : sid;
                      const poster =
                        meta &&
                        meta.poster_path &&
                        meta.poster_path.trim() !== ""
                          ? `https://image.tmdb.org/t/p/w200${
                              meta.poster_path.startsWith("/") ? "" : "/"
                            }${meta.poster_path}`
                          : `data:image/svg+xml;utf8,${encodeURIComponent(
                              `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
                            )}`;
                      return (
                        <div
                          key={sid}
                          style={{
                            display: "flex",
                            gap: window.innerWidth <= 480 ? 6 : 8,
                            alignItems: "center",
                          }}
                          onClick={() =>
                            (window.location.href = `/shows/${sid}`)
                          }
                        >
                          <img
                            src={poster}
                            alt={title}
                            style={{
                              width: window.innerWidth <= 480 ? 48 : 64,
                              height: window.innerWidth <= 480 ? 68 : 90,
                              objectFit: "cover",
                              borderRadius: 6,
                              cursor: "pointer",
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              background: "#ffd700",
                              padding: 6,
                              borderRadius: 4,
                            }}
                          >
                            <div
                              style={{ cursor: "pointer", color: "#6c2eb6" }}
                            >
                              {title}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: "#666" }}>
                      No shows in this list yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
