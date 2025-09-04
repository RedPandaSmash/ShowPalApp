import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { popularShowsSection } from "./homeStyles";
import { interactiveButton } from "../multiuse/interactiveStyles";

const cardStyle = {
  background: "#fff",
  color: "#000",
  padding: 12,
  borderRadius: 8,
  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
};

export default function Lists() {
  const navigate = useNavigate();
  const { isSignedIn, userId } = useAuth();

  const [myLists, setMyLists] = useState([]);
  const [recentLists, setRecentLists] = useState([]);
  const [showsMeta, setShowsMeta] = useState({});
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showAllMy, setShowAllMy] = useState(false);
  const [editingList, setEditingList] = useState(null); // { _id, name, shows: [] }
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    const fetchMy = async () => {
      if (!isSignedIn || !userId) return;
      setLoadingMy(true);
      try {
        // GET by userID so server doesn't need req.user on this public route
        const res = await fetch(
          `http://localhost:8080/api/lists?userID=${userId}`
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setMyLists(lists);
        // gather unique show ids and fetch metadata
        const ids = Array.from(
          new Set(lists.flatMap((l) => (Array.isArray(l.shows) ? l.shows : [])))
        );
        fetchShowsMeta(ids);
      } catch (e) {
        console.error("fetch my lists", e);
        setMyLists([]);
      } finally {
        setLoadingMy(false);
      }
    };
    fetchMy();
  }, [isSignedIn, userId]);

  useEffect(() => {
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const res = await fetch(`http://localhost:8080/api/lists`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const lists = Array.isArray(data.lists) ? data.lists : [];
        setRecentLists(lists);
        const ids = Array.from(
          new Set(lists.flatMap((l) => (Array.isArray(l.shows) ? l.shows : [])))
        );
        fetchShowsMeta(ids);
      } catch (e) {
        console.error("fetch recent lists", e);
        setRecentLists([]);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  // fetch metadata for show ids (batch) and cache in showsMeta
  const fetchShowsMeta = async (ids = []) => {
    if (!ids || ids.length === 0) return;
    const toFetch = ids.filter((id) => !showsMeta[id]);
    if (toFetch.length === 0) return;
    try {
      const res = await fetch(`http://localhost:8080/api/shows/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: toFetch }),
      });
      if (!res.ok) throw new Error("batch failed");
      const data = await res.json();
      const next = { ...showsMeta };
      if (data && data.results) {
        for (const id of toFetch) {
          next[id] = data.results[id] || null;
        }
      }
      setShowsMeta(next);
    } catch (e) {
      console.error("fetchShowsMeta", e);
    }
  };

  const gridWrap = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    justifyItems: "center",
  };

  const listCard = {
    width: "100%",
    maxWidth: 320,
    ...cardStyle,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 360,
  };

  const showItem = {
    display: "flex",
    gap: 8,
    alignItems: "center",
  };

  const posterStyle = {
    width: 64,
    height: 90,
    objectFit: "cover",
    borderRadius: 6,
    cursor: "pointer",
  };

  const placeholderDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
  )}`;

  const renderListCard = (list) => {
    const n = list.shows ? list.shows.length : 0;
    return (
      <div key={list._id} style={listCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>{list.name}</strong>
          <small style={{ color: "#666" }}>
            {n === 1 ? "1 show" : `${n} shows`}
          </small>
          {isSignedIn && String(list.userID) === String(userId) && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  setEditingList({
                    _id: list._id,
                    name: list.name,
                    shows: Array.isArray(list.shows) ? [...list.shows] : [],
                  })
                }
                style={{
                  ...interactiveButton,
                  padding: "6px 8px",
                  background: "#ffd700",
                  color: "#6c2eb6",
                  border: "1px solid #eee",
                }}
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (
                    !window.confirm("Delete this list? This cannot be undone.")
                  )
                    return;
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(
                      `http://localhost:8080/api/lists/${list._id}`,
                      { method: "DELETE", headers: { Authorization: token } }
                    );
                    if (!res.ok && res.status !== 204)
                      throw new Error("delete failed");
                    const refreshed = await fetch(
                      `http://localhost:8080/api/lists?userID=${userId}`
                    );
                    const d = await refreshed.json();
                    setMyLists(Array.isArray(d.lists) ? d.lists : []);
                  } catch (e) {
                    console.error("delete list", e);
                    alert("Failed to delete list");
                  }
                }}
                style={{
                  ...interactiveButton,
                  padding: "6px 8px",
                  background: "#c00",
                  color: "#fff",
                }}
              >
                Delete
              </button>
            </div>
          )}
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
            list.shows.map((sid) => {
              const meta = showsMeta[sid];
              const title = meta ? meta.name || meta.title || sid : sid;
              const poster =
                meta && meta.poster_path
                  ? `https://image.tmdb.org/t/p/w200${meta.poster_path}`
                  : null;
              return (
                <div
                  key={sid}
                  style={showItem}
                  onClick={() => navigate(`/shows/${sid}`)}
                >
                  <img
                    src={poster || placeholderDataUri}
                    alt={title}
                    style={posterStyle}
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
                      {title}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: "#666" }}>No shows in this list yet.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Edit list modal */}
      {editingList && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setEditingList(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 680,
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#fff",
              padding: 18,
              borderRadius: 8,
            }}
          >
            <h3>Edit List</h3>
            <div style={{ marginBottom: 12 }}>
              <label>
                Name:{" "}
                <input
                  value={editingList.name}
                  onChange={(e) =>
                    setEditingList({ ...editingList, name: e.target.value })
                  }
                />
              </label>
            </div>
            <div>
              <strong>Shows</strong>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <DragDropContext
                  onDragEnd={(result) => {
                    if (!result.destination) return;
                    const from = result.source.index;
                    const to = result.destination.index;
                    if (from === to) return;
                    const arr = Array.from(editingList.shows);
                    const [moved] = arr.splice(from, 1);
                    arr.splice(to, 0, moved);
                    setEditingList({ ...editingList, shows: arr });
                  }}
                >
                  <Droppable droppableId={`editing-${editingList._id}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {editingList.shows.map((sid, idx) => {
                          const meta = showsMeta[sid];
                          const title = meta
                            ? meta.name || meta.title || sid
                            : sid;
                          const poster =
                            meta && meta.poster_path
                              ? `https://image.tmdb.org/t/p/w200${meta.poster_path}`
                              : null;
                          return (
                            <Draggable
                              key={sid}
                              draggableId={String(sid)}
                              index={idx}
                            >
                              {(draggableProvided, snapshot) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  {...draggableProvided.dragHandleProps}
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: 8,
                                    border: "1px solid #eee",
                                    borderRadius: 6,
                                    background: snapshot.isDragging
                                      ? "#fafafa"
                                      : "#fff",
                                    ...draggableProvided.draggableProps.style,
                                  }}
                                >
                                  <img
                                    src={poster || placeholderDataUri}
                                    alt={title}
                                    style={{
                                      width: 48,
                                      height: 68,
                                      objectFit: "cover",
                                      borderRadius: 6,
                                      cursor: "grab",
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>{title}</div>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => {
                                        const arr = editingList.shows.filter(
                                          (s) => String(s) !== String(sid)
                                        );
                                        setEditingList({
                                          ...editingList,
                                          shows: arr,
                                        });
                                      }}
                                      style={{
                                        ...interactiveButton,
                                        padding: "6px 8px",
                                        background: "#c00",
                                        color: "#fff",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const res = await fetch(
                      `http://localhost:8080/api/lists/${editingList._id}`,
                      {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: token,
                        },
                        body: JSON.stringify({
                          name: editingList.name,
                          shows: editingList.shows,
                        }),
                      }
                    );
                    if (!res.ok) throw new Error("save failed");
                    // refresh my lists
                    const refreshed = await fetch(
                      `http://localhost:8080/api/lists?userID=${userId}`
                    );
                    const d = await refreshed.json();
                    setMyLists(Array.isArray(d.lists) ? d.lists : []);
                    setEditingList(null);
                  } catch (e) {
                    console.error("save list edits", e);
                    alert("Failed to save list");
                  }
                }}
                style={{ ...interactiveButton }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingList(null)}
                style={{
                  ...interactiveButton,
                  background: "#fff",
                  color: "#000",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <h2 style={{ marginTop: 0 }}>My Lists</h2>
        {!isSignedIn ? (
          <div style={{ color: "#666" }}>Please sign in to see your lists.</div>
        ) : loadingMy ? (
          <div>Loading your lists...</div>
        ) : (
          <>
            <div style={gridWrap}>
              {(showAllMy ? myLists : myLists.slice(0, 9)).map((l) =>
                renderListCard(l)
              )}
            </div>
            {myLists.length > 9 && (
              <div style={{ marginTop: 12, textAlign: "center" }}>
                <button
                  onClick={() => setShowAllMy((v) => !v)}
                  style={{
                    ...interactiveButton,
                    background: "#6c2eb6",
                    color: "#ffd700",
                  }}
                >
                  {showAllMy ? "Show Less" : "See All"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Lists by People I Follow</h2>
        {isSignedIn ? (
          <div style={{ color: "#666" }}>
            Placeholder — follow users to see their lists here.
          </div>
        ) : (
          <div style={{ color: "#666" }}>
            Sign in to see lists from people you follow.
          </div>
        )}
      </section>

      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Recent Lists</h2>
        {loadingRecent ? (
          <div>Loading recent lists...</div>
        ) : (
          <div style={gridWrap}>
            {recentLists.slice(0, 12).map((l) => renderListCard(l))}
          </div>
        )}
      </section>
    </div>
  );
}
