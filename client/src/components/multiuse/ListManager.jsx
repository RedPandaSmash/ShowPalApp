import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { popularShowsSection } from "../pages/homeStyles";
import { interactiveButton } from "./interactiveStyles";

const cardStyle = {
  background: "#fff",
  color: "#000",
  padding: 12,
  borderRadius: 8,
  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
};

export default function ListManager({
  userId,
  isOwnProfile = false,
  title = "Lists",
  showEditButtons = true,
  showCreator = true,
  onListUpdate = () => {},
}) {
  const navigate = useNavigate();
  const { isSignedIn, userId: currentUserId } = useAuth();

  const [userLists, setUserLists] = useState([]);
  const [defaultLists, setDefaultLists] = useState([]);
  const [showsMeta, setShowsMeta] = useState({});
  const [editingList, setEditingList] = useState(null);
  const [editingStatusLists, setEditingStatusLists] = useState(null);

  useEffect(() => {
    fetchLists();
  }, [userId]);

  const fetchLists = async () => {
    // Don't fetch if userId is null or undefined
    if (!userId) {
      return;
    }

    try {
      // Fetch user's regular lists
      const userListsRes = await fetch(
        `http://localhost:8080/api/lists?userID=${userId}`
      );
      const userListsData = await userListsRes.json();
      const userLists = Array.isArray(userListsData.lists)
        ? userListsData.lists
        : [];
      setUserLists(userLists);

      // Fetch user's default lists
      const defaultListsRes = await fetch(
        `http://localhost:8080/api/default-lists/${userId}`
      );
      const defaultListsData = await defaultListsRes.json();
      const defaultLists = Array.isArray(defaultListsData)
        ? defaultListsData
        : [];

      // Sort default lists in specific order: Watching, Finished, Dropped, Favorites
      const order = ["Watching", "Finished", "Dropped", "Favorites"];
      const sortedDefaultLists = defaultLists.sort((a, b) => {
        return order.indexOf(a.listType) - order.indexOf(b.listType);
      });

      setDefaultLists(sortedDefaultLists);

      // Gather unique show ids and fetch metadata
      const allLists = [...userLists, ...sortedDefaultLists];
      const ids = Array.from(
        new Set(
          allLists.flatMap((l) => (Array.isArray(l.shows) ? l.shows : []))
        )
      );
      fetchShowsMeta(ids);
    } catch (err) {
      console.error("Error fetching lists:", err);
    }
  };

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
    gridTemplateColumns:
      window.innerWidth <= 480
        ? "repeat(1, 1fr)"
        : window.innerWidth <= 768
        ? "repeat(2, 1fr)"
        : "repeat(3, 1fr)",
    gap: window.innerWidth <= 480 ? 12 : 16,
    justifyItems: "center",
  };

  const listCard = {
    width: "100%",
    maxWidth: window.innerWidth <= 480 ? 280 : 320,
    ...cardStyle,
    display: "flex",
    flexDirection: "column",
    gap: window.innerWidth <= 480 ? 6 : 8,
    maxHeight: window.innerWidth <= 480 ? 300 : 360,
    padding: window.innerWidth <= 480 ? 8 : 12,
  };

  const showItem = {
    display: "flex",
    gap: window.innerWidth <= 480 ? 6 : 8,
    alignItems: "center",
  };

  const posterStyle = {
    width: window.innerWidth <= 480 ? 48 : 64,
    height: window.innerWidth <= 480 ? 68 : 90,
    objectFit: "cover",
    borderRadius: 6,
    cursor: "pointer",
  };

  const placeholderDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
  )}`;

  const renderListCard = (list, isDefault = false) => {
    const n = list.shows ? list.shows.length : 0;
    const listName = list.listType || list.name;
    const isOwnList = list.userID && list.userID._id === currentUserId;

    return (
      <div key={list._id} style={listCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>{listName}</strong>
            {list.userID && showCreator && (
              <div style={{ fontSize: "0.8em", color: "#666", marginTop: 2 }}>
                by{" "}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${list.userID._id}`);
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
            )}
          </div>
          <small style={{ color: "#666" }}>
            {n === 1 ? "1 show" : `${n} shows`}
          </small>
          {isSignedIn && showEditButtons && isOwnProfile && (
            <div style={{ display: "flex", gap: 8 }}>
              {list.listType === "Favorites" && (
                <button
                  onClick={() =>
                    setEditingList({
                      _id: list._id,
                      name: listName,
                      listType: list.listType,
                      shows: Array.isArray(list.shows) ? [...list.shows] : [],
                      isDefault: true,
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
              )}
              {["Watching", "Finished", "Dropped"].includes(list.listType) && (
                <button
                  onClick={() => {
                    const watching = defaultLists.find(
                      (l) => l.listType === "Watching"
                    );
                    const finished = defaultLists.find(
                      (l) => l.listType === "Finished"
                    );
                    const dropped = defaultLists.find(
                      (l) => l.listType === "Dropped"
                    );
                    setEditingStatusLists({
                      watching: watching
                        ? { ...watching, shows: [...watching.shows] }
                        : null,
                      finished: finished
                        ? { ...finished, shows: [...finished.shows] }
                        : null,
                      dropped: dropped
                        ? { ...dropped, shows: [...dropped.shows] }
                        : null,
                    });
                  }}
                  style={{
                    ...interactiveButton,
                    padding: "6px 8px",
                    background: "#ffd700",
                    color: "#6c2eb6",
                    border: "1px solid #eee",
                  }}
                >
                  Edit Status
                </button>
              )}
              {!list.listType && (
                <>
                  <button
                    onClick={() =>
                      setEditingList({
                        _id: list._id,
                        name: listName,
                        shows: Array.isArray(list.shows) ? [...list.shows] : [],
                        isDefault: false,
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
                        !window.confirm(
                          "Delete this list? This cannot be undone."
                        )
                      )
                        return;
                      try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(
                          `http://localhost:8080/api/lists/${list._id}`,
                          {
                            method: "DELETE",
                            headers: { Authorization: token },
                          }
                        );
                        if (!res.ok && res.status !== 204)
                          throw new Error("delete failed");
                        fetchLists();
                        onListUpdate();
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
                </>
              )}
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

  // Disable body scrolling when modals are open
  React.useEffect(() => {
    const hasModal = editingList || editingStatusLists;
    if (hasModal) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [editingList, editingStatusLists]);

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
            data-modal-content="editing-list"
            style={{
              width: window.innerWidth <= 480 ? "calc(100vw - 32px)" : 680,
              maxWidth: 680,
              maxHeight:
                window.innerWidth <= 480 ? "calc(100vh - 100px)" : "80vh",
              overflowY: "auto",
              overflowX: "hidden",
              background: "#fff",
              padding: window.innerWidth <= 480 ? 12 : 18,
              borderRadius: 8,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <h3>Edit List</h3>
            {!editingList.isDefault && (
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
            )}
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
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: window.innerWidth <= 480 ? 12 : 8,
                                    border: snapshot.isDragging
                                      ? "2px solid #6c2eb6"
                                      : "1px solid #eee",
                                    borderRadius: 6,
                                    background: snapshot.isDragging
                                      ? "#f0f8ff"
                                      : "#fff",
                                    boxShadow: snapshot.isDragging
                                      ? "0 4px 12px rgba(0,0,0,0.15)"
                                      : "none",
                                    transform: snapshot.isDragging
                                      ? "rotate(2deg)"
                                      : "none",
                                    transition: snapshot.isDragging
                                      ? "none"
                                      : "all 0.2s ease",
                                    ...draggableProvided.draggableProps.style,
                                  }}
                                >
                                  <div
                                    {...draggableProvided.dragHandleProps}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: window.innerWidth <= 480 ? 40 : 32,
                                      height:
                                        window.innerWidth <= 480 ? 40 : 32,
                                      background: "#f5f5f5",
                                      border: "1px solid #ddd",
                                      borderRadius: 4,
                                      cursor:
                                        window.innerWidth <= 480
                                          ? "grab"
                                          : "grab",
                                      flexShrink: 0,
                                      userSelect: "none",
                                      WebkitUserSelect: "none",
                                      MozUserSelect: "none",
                                      msUserSelect: "none",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize:
                                          window.innerWidth <= 480 ? 16 : 14,
                                        color: "#666",
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                        MozUserSelect: "none",
                                        msUserSelect: "none",
                                      }}
                                    >
                                      ⋮⋮
                                    </span>
                                  </div>

                                  <img
                                    src={poster || placeholderDataUri}
                                    alt={title}
                                    style={{
                                      width: window.innerWidth <= 480 ? 56 : 48,
                                      height:
                                        window.innerWidth <= 480 ? 78 : 68,
                                      objectFit: "cover",
                                      borderRadius: 6,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div
                                    style={{
                                      flex: 1,
                                      fontSize:
                                        window.innerWidth <= 480
                                          ? "16px"
                                          : "14px",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {title}
                                  </div>
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
                                        padding:
                                          window.innerWidth <= 480
                                            ? "8px 12px"
                                            : "6px 8px",
                                        background: "#c00",
                                        color: "#fff",
                                        fontSize:
                                          window.innerWidth <= 480
                                            ? "14px"
                                            : "12px",
                                        minWidth:
                                          window.innerWidth <= 480 ? 60 : 50,
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

                    const isDefaultList = editingList.isDefault;
                    const endpoint = isDefaultList
                      ? `http://localhost:8080/api/default-lists/${editingList.listType}/update`
                      : `http://localhost:8080/api/lists/${editingList._id}`;

                    const body = isDefaultList
                      ? { shows: editingList.shows }
                      : { name: editingList.name, shows: editingList.shows };

                    const res = await fetch(endpoint, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: token,
                      },
                      body: JSON.stringify(body),
                    });

                    if (!res.ok) throw new Error("save failed");

                    fetchLists();
                    onListUpdate();
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

      {/* Edit status lists modal */}
      {editingStatusLists && (
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
          onClick={() => setEditingStatusLists(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            data-modal-content="editing-status-lists"
            style={{
              width:
                window.innerWidth <= 480
                  ? "calc(100vw - 32px)"
                  : window.innerWidth <= 768
                  ? "calc(100vw - 64px)"
                  : 1200,
              maxWidth: 1200,
              maxHeight:
                window.innerWidth <= 480 ? "calc(100vh - 100px)" : "90vh",
              overflowY: "auto",
              overflowX: "hidden",
              background: "#fff",
              padding: window.innerWidth <= 480 ? 8 : 18,
              borderRadius: 8,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <h3>Edit Status Lists</h3>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                const { source, destination } = result;

                // If dropping in the same list
                if (source.droppableId === destination.droppableId) {
                  const list = editingStatusLists[source.droppableId];
                  if (!list) return;

                  const newShows = Array.from(list.shows);
                  const [moved] = newShows.splice(source.index, 1);
                  newShows.splice(destination.index, 0, moved);

                  setEditingStatusLists({
                    ...editingStatusLists,
                    [source.droppableId]: {
                      ...list,
                      shows: newShows,
                    },
                  });
                } else {
                  // Moving between lists
                  const sourceList = editingStatusLists[source.droppableId];
                  const destList = editingStatusLists[destination.droppableId];

                  if (!sourceList || !destList) return;

                  const sourceShows = Array.from(sourceList.shows);
                  const destShows = Array.from(destList.shows);
                  const [moved] = sourceShows.splice(source.index, 1);
                  destShows.splice(destination.index, 0, moved);

                  setEditingStatusLists({
                    ...editingStatusLists,
                    [source.droppableId]: {
                      ...sourceList,
                      shows: sourceShows,
                    },
                    [destination.droppableId]: {
                      ...destList,
                      shows: destShows,
                    },
                  });
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: window.innerWidth <= 768 ? "column" : "row",
                  gap: window.innerWidth <= 480 ? 12 : 16,
                }}
              >
                {["watching", "finished", "dropped"].map((status) => (
                  <div
                    key={status}
                    style={{
                      flex: window.innerWidth <= 768 ? "none" : 1,
                      width: window.innerWidth <= 768 ? "100%" : "auto",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: window.innerWidth <= 480 ? "18px" : "16px",
                        marginBottom: window.innerWidth <= 480 ? 8 : 4,
                      }}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </h4>
                    <div
                      style={{
                        minHeight: window.innerWidth <= 480 ? 200 : 400,
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: window.innerWidth <= 480 ? 6 : 8,
                      }}
                    >
                      <Droppable droppableId={status}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: window.innerWidth <= 480 ? 6 : 8,
                              minHeight: window.innerWidth <= 480 ? 200 : 350,
                              background: snapshot.isDraggingOver
                                ? "#f0f0f0"
                                : "transparent",
                              borderRadius: 4,
                              padding: window.innerWidth <= 480 ? 2 : 4,
                            }}
                          >
                            {editingStatusLists[status]?.shows?.map(
                              (sid, idx) => {
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
                                        style={{
                                          display: "flex",
                                          gap: 8,
                                          alignItems: "center",
                                          padding:
                                            window.innerWidth <= 480 ? 12 : 8,
                                          border: snapshot.isDragging
                                            ? "2px solid #6c2eb6"
                                            : "1px solid #eee",
                                          borderRadius: 6,
                                          background: snapshot.isDragging
                                            ? "#f0f8ff"
                                            : "#fff",
                                          boxShadow: snapshot.isDragging
                                            ? "0 4px 12px rgba(0,0,0,0.15)"
                                            : "none",
                                          transform: snapshot.isDragging
                                            ? "rotate(2deg)"
                                            : "none",
                                          transition: snapshot.isDragging
                                            ? "none"
                                            : "all 0.2s ease",
                                          ...draggableProvided.draggableProps
                                            .style,
                                        }}
                                      >
                                        <div
                                          {...draggableProvided.dragHandleProps}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width:
                                              window.innerWidth <= 480
                                                ? 40
                                                : 32,
                                            height:
                                              window.innerWidth <= 480
                                                ? 40
                                                : 32,
                                            background: "#f5f5f5",
                                            border: "1px solid #ddd",
                                            borderRadius: 4,
                                            cursor:
                                              window.innerWidth <= 480
                                                ? "grab"
                                                : "grab",
                                            flexShrink: 0,
                                            userSelect: "none",
                                            WebkitUserSelect: "none",
                                            MozUserSelect: "none",
                                            msUserSelect: "none",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize:
                                                window.innerWidth <= 480
                                                  ? 16
                                                  : 14,
                                              color: "#666",
                                              userSelect: "none",
                                              WebkitUserSelect: "none",
                                              MozUserSelect: "none",
                                              msUserSelect: "none",
                                            }}
                                          >
                                            ⋮⋮
                                          </span>
                                        </div>

                                        <img
                                          src={
                                            poster ||
                                            `data:image/svg+xml;utf8,${encodeURIComponent(
                                              `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='68'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='8' fill='%23666'>No Image</text></svg>`
                                            )}`
                                          }
                                          alt={title}
                                          style={{
                                            width:
                                              window.innerWidth <= 480
                                                ? 56
                                                : 48,
                                            height:
                                              window.innerWidth <= 480
                                                ? 78
                                                : 68,
                                            objectFit: "cover",
                                            borderRadius: 6,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <div
                                          style={{
                                            flex: 1,
                                            fontSize:
                                              window.innerWidth <= 480
                                                ? "16px"
                                                : "14px",
                                            lineHeight: "1.4",
                                          }}
                                        >
                                          {title}
                                        </div>
                                        <div
                                          style={{ display: "flex", gap: 8 }}
                                        >
                                          <button
                                            onClick={() => {
                                              const newLists = {
                                                ...editingStatusLists,
                                              };
                                              newLists[status].shows = newLists[
                                                status
                                              ].shows.filter(
                                                (s) => String(s) !== String(sid)
                                              );
                                              setEditingStatusLists(newLists);
                                            }}
                                            style={{
                                              ...interactiveButton,
                                              padding:
                                                window.innerWidth <= 480
                                                  ? "8px 12px"
                                                  : "6px 8px",
                                              background: "#c00",
                                              color: "#fff",
                                              fontSize:
                                                window.innerWidth <= 480
                                                  ? "14px"
                                                  : "12px",
                                              minWidth:
                                                window.innerWidth <= 480
                                                  ? 60
                                                  : 50,
                                            }}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              }
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                ))}
              </div>
            </DragDropContext>

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
                    const promises = [];
                    const token = localStorage.getItem("token");
                    if (editingStatusLists.watching) {
                      promises.push(
                        fetch(
                          `http://localhost:8080/api/default-lists/Watching/update`,
                          {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: token,
                            },
                            body: JSON.stringify({
                              shows: editingStatusLists.watching.shows,
                            }),
                          }
                        )
                      );
                    }
                    if (editingStatusLists.finished) {
                      promises.push(
                        fetch(
                          `http://localhost:8080/api/default-lists/Finished/update`,
                          {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: token,
                            },
                            body: JSON.stringify({
                              shows: editingStatusLists.finished.shows,
                            }),
                          }
                        )
                      );
                    }
                    if (editingStatusLists.dropped) {
                      promises.push(
                        fetch(
                          `http://localhost:8080/api/default-lists/Dropped/update`,
                          {
                            method: "PUT",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: token,
                            },
                            body: JSON.stringify({
                              shows: editingStatusLists.dropped.shows,
                            }),
                          }
                        )
                      );
                    }

                    await Promise.all(promises);
                    fetchLists();
                    onListUpdate();
                    setEditingStatusLists(null);
                  } catch (e) {
                    console.error("save status lists", e);
                    alert("Failed to save status lists");
                  }
                }}
                style={{ ...interactiveButton }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingStatusLists(null)}
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
          padding: window.innerWidth <= 480 ? "16px 12px" : 24,
          margin: window.innerWidth <= 480 ? "24px 0" : "24px auto",
          paddingBottom: window.innerWidth <= 480 ? 24 : 48,
        }}
      >
        <h2 style={{ marginTop: 0, color: "#000" }}>{title}</h2>
        <div style={gridWrap}>
          {/* Default Lists */}
          {defaultLists.map((list) => renderListCard(list, true))}
          {/* User Lists */}
          {userLists.map((list) => renderListCard(list, false))}
        </div>
      </section>
    </div>
  );
}
