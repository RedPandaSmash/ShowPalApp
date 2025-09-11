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

  useEffect(() => {
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const res = await fetch(`http://localhost:8080/api/lists`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setRecentLists(lists);
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
        const res = await fetch(`http://localhost:8080/api/lists/followed`, {
          headers: { Authorization: token },
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setFollowedLists(lists);
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
        <h2 style={{ marginTop: 0 }}>Lists by People I Follow</h2>
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
                      list.shows.slice(0, 3).map((sid) => (
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
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(
                              `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
                            )}`}
                            alt="Show poster"
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
                              Show {sid}
                            </div>
                          </div>
                        </div>
                      ))
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
                    list.shows.slice(0, 3).map((sid) => (
                      <div
                        key={sid}
                        style={{
                          display: "flex",
                          gap: window.innerWidth <= 480 ? 6 : 8,
                          alignItems: "center",
                        }}
                        onClick={() => (window.location.href = `/shows/${sid}`)}
                      >
                        <img
                          src={`data:image/svg+xml;utf8,${encodeURIComponent(
                            `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
                          )}`}
                          alt="Show poster"
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
                          <div style={{ cursor: "pointer", color: "#6c2eb6" }}>
                            Show {sid}
                          </div>
                        </div>
                      </div>
                    ))
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
