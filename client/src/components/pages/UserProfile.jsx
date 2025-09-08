import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AuthContext from "../../context/AuthContext";
import { popularShowsSection } from "./homeStyles";
import { interactiveButton } from "../multiuse/interactiveStyles";

const cardStyle = {
  background: "#fff",
  color: "#000",
  padding: 12,
  borderRadius: 8,
  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
};

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const {
    userId: currentUserId,
    isSignedIn,
    refresh,
  } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [defaultLists, setDefaultLists] = useState([]);
  const [showsMeta, setShowsMeta] = useState({});
  const [editingList, setEditingList] = useState(null);
  const [editingStatusLists, setEditingStatusLists] = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [activityTab, setActivityTab] = useState("recent");
  const [activityData, setActivityData] = useState([]);
  const [followingActivityData, setFollowingActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [followingActivityLoading, setFollowingActivityLoading] =
    useState(false);

  useEffect(() => {
    fetchProfile();
    fetchLists();
  }, [userId]);

  useEffect(() => {
    if (currentUserId && profile) {
      setIsOwnProfile(currentUserId === userId);
      setIsFollowing(
        profile.followers?.some((follower) => follower === currentUserId)
      );
    }
  }, [currentUserId, profile, userId]);

  useEffect(() => {
    fetchActivity();
  }, [userId]);

  useEffect(() => {
    // Reset activity tab to "recent" when navigating to a new profile
    setActivityTab("recent");
  }, [userId]);

  useEffect(() => {
    if (activityTab === "following" && isSignedIn && isOwnProfile) {
      fetchFollowingActivity();
    }
  }, [activityTab, isSignedIn, isOwnProfile]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${userId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const profileData = await response.json();
      setProfile(profileData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
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

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${userId}/activity`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      const data = await response.json();
      setActivityData(data.activities || []);

      // Gather unique show IDs from activities for metadata fetching
      const showIds = data.activities
        .filter((activity) => activity.enrichedData?.showID)
        .map((activity) => activity.enrichedData.showID);
      if (showIds.length > 0) {
        fetchShowsMeta(showIds);
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchFollowingActivity = async () => {
    setFollowingActivityLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${userId}/following-activity`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch following activity");
      }
      const data = await response.json();
      setFollowingActivityData(data.activities || []);

      // Gather unique show IDs from activities for metadata fetching
      const showIds = data.activities
        .filter((activity) => activity.enrichedData?.showID)
        .map((activity) => activity.enrichedData.showID);
      if (showIds.length > 0) {
        fetchShowsMeta(showIds);
      }
    } catch (err) {
      console.error("Error fetching following activity:", err);
    } finally {
      setFollowingActivityLoading(false);
    }
  };

  const handleFollow = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${userId}/follow`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setIsFollowing(true);
        setProfile((prev) => ({
          ...prev,
          followers: [...prev.followers, currentUserId],
        }));
      }
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const handleUnfollow = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(
        `http://localhost:8080/api/profile/${userId}/follow`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setIsFollowing(false);
        setProfile((prev) => ({
          ...prev,
          followers: prev.followers.filter(
            (follower) => follower !== currentUserId
          ),
        }));
      }
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

  const renderListCard = (list, isDefault = false) => {
    const n = list.shows ? list.shows.length : 0;
    const listName = list.listType || list.name;

    return (
      <div
        key={list._id}
        style={{
          width: "100%",
          maxWidth: 320,
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 360,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>{listName}</strong>
          <small style={{ color: "#666" }}>
            {n === 1 ? "1 show" : `${n} shows`}
          </small>
          {isSignedIn && isOwnProfile && (
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
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                  onClick={() => navigate(`/shows/${sid}`)}
                >
                  <img
                    src={
                      poster ||
                      `data:image/svg+xml;utf8,${encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='90'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23666'>No Image</text></svg>`
                      )}`
                    }
                    alt={title}
                    style={{
                      width: 64,
                      height: 90,
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

  if (loading) {
    return (
      <section style={{ padding: 24 }}>
        <div>Loading profile...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section style={{ padding: 24 }}>
        <div>Error: {error}</div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section style={{ padding: 24 }}>
        <div>Profile not found</div>
      </section>
    );
  }

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
                                    src={
                                      poster ||
                                      `data:image/svg+xml;utf8,${encodeURIComponent(
                                        `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='68'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='8' fill='%23666'>No Image</text></svg>`
                                      )}`
                                    }
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

                    // Check if this is a default list
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
            style={{
              width: 1200,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              padding: 18,
              borderRadius: 8,
            }}
          >
            <h3>Edit Status Lists</h3>
            <DragDropContext
              onDragEnd={async (result) => {
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

                  const showID = sourceList.shows[source.index];
                  const fromListType =
                    source.droppableId.charAt(0).toUpperCase() +
                    source.droppableId.slice(1);
                  const toListType =
                    destination.droppableId.charAt(0).toUpperCase() +
                    destination.droppableId.slice(1);

                  try {
                    // Call the move API
                    const token = localStorage.getItem("token");
                    const response = await fetch(
                      `http://localhost:8080/api/default-lists/move`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: token,
                        },
                        body: JSON.stringify({
                          showID: showID,
                          fromListType: fromListType,
                          toListType: toListType,
                        }),
                      }
                    );

                    if (response.ok) {
                      // Update local state after successful API call
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

                      // Refresh the lists to get updated data
                      fetchLists();
                    } else {
                      console.error("Failed to move show between lists");
                      alert("Failed to move show. Please try again.");
                    }
                  } catch (error) {
                    console.error("Error moving show:", error);
                    alert("Failed to move show. Please try again.");
                  }
                }
              }}
            >
              <div style={{ display: "flex", gap: 16 }}>
                {["watching", "finished", "dropped"].map((status) => (
                  <div key={status} style={{ flex: 1 }}>
                    <h4>{status.charAt(0).toUpperCase() + status.slice(1)}</h4>
                    <div
                      style={{
                        minHeight: 400,
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: 8,
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
                              gap: 8,
                              minHeight: 350,
                              background: snapshot.isDraggingOver
                                ? "#f0f0f0"
                                : "transparent",
                              borderRadius: 4,
                              padding: 4,
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
                                          ...draggableProvided.draggableProps
                                            .style,
                                        }}
                                      >
                                        <img
                                          src={
                                            poster ||
                                            `data:image/svg+xml;utf8,${encodeURIComponent(
                                              `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='68'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='8' fill='%23666'>No Image</text></svg>`
                                            )}`
                                          }
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
                    // Save all three default lists
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

      {/* Edit bio modal */}
      {editingBio && (
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
          onClick={() => setEditingBio(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 500,
              background: "#fff",
              padding: 24,
              borderRadius: 8,
            }}
          >
            <h3 style={{ color: "#6c2eb6", marginTop: 0 }}>Edit Bio</h3>
            <textarea
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Tell us about yourself..."
              style={{
                width: "100%",
                minHeight: 120,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: "1em",
                resize: "vertical",
              }}
              maxLength={500}
            />
            <div style={{ fontSize: "0.8em", color: "#666", marginTop: 4 }}>
              {bioText.length}/500 characters
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");
                    const response = await fetch(
                      "http://localhost:8080/api/profile",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: token,
                        },
                        body: JSON.stringify({ bio: bioText }),
                      }
                    );

                    if (response.ok) {
                      setProfile((prev) => ({ ...prev, bio: bioText }));
                      setEditingBio(false);
                    } else {
                      throw new Error("Failed to update bio");
                    }
                  } catch (e) {
                    console.error("Error updating bio:", e);
                    alert("Failed to update bio");
                  }
                }}
                style={{ ...interactiveButton }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingBio(false)}
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

      {/* Profile Header Section */}
      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
            position: "relative",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#6c2eb6",
              textAlign: "center",
              flex: 1,
            }}
          >
            {profile.userID.username}'s Profile
          </h2>
          {isSignedIn && !isOwnProfile && (
            <button
              onClick={isFollowing ? handleUnfollow : handleFollow}
              style={{
                ...interactiveButton,
                backgroundColor: isFollowing ? "#dc3545" : "#007bff",
                position: "absolute",
                right: 0,
              }}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        {/* Profile Info - Single Column */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h3 style={{ color: "#6c2eb6", textAlign: "center", margin: 0 }}>
              Bio
            </h3>
            {isSignedIn && isOwnProfile && (
              <button
                onClick={() => {
                  setEditingBio(true);
                  setBioText(profile.bio || "");
                }}
                style={{
                  ...interactiveButton,
                  padding: "4px 8px",
                  background: "#ffd700",
                  color: "#6c2eb6",
                  fontSize: "0.8em",
                }}
              >
                Edit
              </button>
            )}
          </div>
          <p style={{ textAlign: "center" }}>{profile.bio || "No bio yet."}</p>

          <h3 style={{ color: "#6c2eb6", textAlign: "center" }}>
            Watch Statistics
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <strong>Watching:</strong> {profile.watchStats.watching}
            </div>
            <div style={{ textAlign: "center" }}>
              <strong>Finished:</strong> {profile.watchStats.finished}
            </div>
            <div style={{ textAlign: "center" }}>
              <strong>Dropped:</strong> {profile.watchStats.dropped}
            </div>
            <div style={{ textAlign: "center" }}>
              <strong>Total Watch Time:</strong>{" "}
              {profile.watchStats.totalWatchTime} minutes
            </div>
          </div>

          <h3 style={{ color: "#6c2eb6", textAlign: "center" }}>Social</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <strong>Followers:</strong> {profile.followers?.length || 0}
            </div>
            <div style={{ textAlign: "center" }}>
              <strong>Following:</strong> {profile.following?.length || 0}
            </div>
          </div>
        </div>
      </section>

      {/* My Lists Section */}
      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <h2 style={{ marginTop: 0, color: "#6c2eb6" }}>
          {profile.userID.username}'s Lists
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            justifyItems: "center",
          }}
        >
          {/* Default Lists */}
          {defaultLists.map((list) => renderListCard(list, true))}
          {/* User Lists */}
          {userLists.map((list) => renderListCard(list, false))}
        </div>
      </section>

      <section
        style={{
          ...popularShowsSection,
          padding: 24,
          margin: "24px auto",
          paddingBottom: 48,
        }}
      >
        <h2 style={{ marginTop: 0, color: "#6c2eb6" }}>Activity</h2>

        {/* Tab Navigation - Only show for own profile when signed in */}
        {isSignedIn && isOwnProfile && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "1px solid #ddd",
              }}
            >
              <button
                onClick={() => setActivityTab("recent")}
                style={{
                  padding: "12px 24px",
                  background: activityTab === "recent" ? "#6c2eb6" : "#fff",
                  color: activityTab === "recent" ? "#fff" : "#6c2eb6",
                  border: "none",
                  borderBottom:
                    activityTab === "recent"
                      ? "2px solid #6c2eb6"
                      : "2px solid transparent",
                  cursor: "pointer",
                  fontSize: "1em",
                  fontWeight: activityTab === "recent" ? "bold" : "normal",
                }}
              >
                Recent Activity
              </button>
              <button
                onClick={() => setActivityTab("following")}
                style={{
                  padding: "12px 24px",
                  background: activityTab === "following" ? "#6c2eb6" : "#fff",
                  color: activityTab === "following" ? "#fff" : "#6c2eb6",
                  border: "none",
                  borderBottom:
                    activityTab === "following"
                      ? "2px solid #6c2eb6"
                      : "2px solid transparent",
                  cursor: "pointer",
                  fontSize: "1em",
                  fontWeight: activityTab === "following" ? "bold" : "normal",
                }}
              >
                Following
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activityTab === "recent" && (
          <div>
            {activityLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p>Loading activity...</p>
              </div>
            ) : activityData && activityData.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {activityData.map((activity, index) => {
                  const getActivityTitle = () => {
                    switch (activity.action) {
                      case "left_review":
                        const showMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const showTitle = showMeta
                          ? showMeta.name ||
                            showMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Left a Review on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {showTitle}
                            </span>
                          </span>
                        );
                      case "left_reply":
                        return (
                          <span>
                            Left a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#reply-${activity.enrichedData.replyID}`
                                )
                              }
                            >
                              Reply
                            </span>{" "}
                            in response to{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/user/${activity.enrichedData.parentUserID}`
                                )
                              }
                            >
                              {activity.enrichedData.parentUsername}
                            </span>
                          </span>
                        );
                      case "created_list":
                        return "Created a List";
                      case "liked_review":
                        const likedReviewShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const likedReviewShowTitle = likedReviewShowMeta
                          ? likedReviewShowMeta.name ||
                            likedReviewShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Liked a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#review-${activity.enrichedData.reviewID}`
                                )
                              }
                            >
                              Review
                            </span>{" "}
                            on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {likedReviewShowTitle}
                            </span>
                          </span>
                        );
                      case "liked_reply":
                        const likedReplyShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const likedReplyShowTitle = likedReplyShowMeta
                          ? likedReplyShowMeta.name ||
                            likedReplyShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Liked a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#reply-${activity.enrichedData.replyID}`
                                )
                              }
                            >
                              Reply
                            </span>{" "}
                            on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {likedReplyShowTitle}
                            </span>
                          </span>
                        );
                      case "added_to_watching":
                        const watchingShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const watchingShowTitle = watchingShowMeta
                          ? watchingShowMeta.name ||
                            watchingShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {watchingShowTitle}
                            </span>{" "}
                            to Watching
                          </span>
                        );
                      case "added_to_finished":
                        const finishedShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const finishedShowTitle = finishedShowMeta
                          ? finishedShowMeta.name ||
                            finishedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {finishedShowTitle}
                            </span>{" "}
                            to Finished
                          </span>
                        );
                      case "added_to_dropped":
                        const droppedShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const droppedShowTitle = droppedShowMeta
                          ? droppedShowMeta.name ||
                            droppedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {droppedShowTitle}
                            </span>{" "}
                            to Dropped
                          </span>
                        );
                      case "moved_from_watching_to_finished":
                        const moveToFinishedShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToFinishedShowTitle = moveToFinishedShowMeta
                          ? moveToFinishedShowMeta.name ||
                            moveToFinishedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToFinishedShowTitle}
                            </span>{" "}
                            from Watching to Finished
                          </span>
                        );
                      case "moved_from_watching_to_dropped":
                        const moveToDroppedShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToDroppedShowTitle = moveToDroppedShowMeta
                          ? moveToDroppedShowMeta.name ||
                            moveToDroppedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToDroppedShowTitle}
                            </span>{" "}
                            from Watching to Dropped
                          </span>
                        );
                      case "moved_from_finished_to_watching":
                        const moveToWatchingShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToWatchingShowTitle = moveToWatchingShowMeta
                          ? moveToWatchingShowMeta.name ||
                            moveToWatchingShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToWatchingShowTitle}
                            </span>{" "}
                            from Finished to Watching
                          </span>
                        );
                      case "moved_from_finished_to_dropped":
                        const moveFinishedToDroppedShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveFinishedToDroppedShowTitle =
                          moveFinishedToDroppedShowMeta
                            ? moveFinishedToDroppedShowMeta.name ||
                              moveFinishedToDroppedShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveFinishedToDroppedShowTitle}
                            </span>{" "}
                            from Finished to Dropped
                          </span>
                        );
                      case "moved_from_dropped_to_watching":
                        const moveDroppedToWatchingShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveDroppedToWatchingShowTitle =
                          moveDroppedToWatchingShowMeta
                            ? moveDroppedToWatchingShowMeta.name ||
                              moveDroppedToWatchingShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveDroppedToWatchingShowTitle}
                            </span>{" "}
                            from Dropped to Watching
                          </span>
                        );
                      case "moved_from_dropped_to_finished":
                        const moveDroppedToFinishedShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveDroppedToFinishedShowTitle =
                          moveDroppedToFinishedShowMeta
                            ? moveDroppedToFinishedShowMeta.name ||
                              moveDroppedToFinishedShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveDroppedToFinishedShowTitle}
                            </span>{" "}
                            from Dropped to Finished
                          </span>
                        );
                      case "removed_from_favorites":
                        const removedFavoriteShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const removedFavoriteShowTitle = removedFavoriteShowMeta
                          ? removedFavoriteShowMeta.name ||
                            removedFavoriteShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Removed{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {removedFavoriteShowTitle}
                            </span>{" "}
                            from Favorites
                          </span>
                        );
                      case "added_favorite":
                        const favoriteShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const favoriteShowTitle = favoriteShowMeta
                          ? favoriteShowMeta.name ||
                            favoriteShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {favoriteShowTitle}
                            </span>{" "}
                            to Favorites
                          </span>
                        );
                      case "removed_from_list":
                        const removedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const removedListShowTitle = removedListShowMeta
                          ? removedListShowMeta.name ||
                            removedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Removed{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {removedListShowTitle}
                            </span>{" "}
                            from a list
                          </span>
                        );
                      case "added_to_list":
                        const addedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const addedListShowTitle = addedListShowMeta
                          ? addedListShowMeta.name ||
                            addedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {addedListShowTitle}
                            </span>{" "}
                            to{" "}
                            <span>
                              {activity.enrichedData.listName || "a list"}
                            </span>
                          </span>
                        );
                      case "readded_to_list":
                        const readdedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const readdedListShowTitle = readdedListShowMeta
                          ? readdedListShowMeta.name ||
                            readdedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            Re-added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {readdedListShowTitle}
                            </span>{" "}
                            to a list
                          </span>
                        );
                      default:
                        return activity.action.replace("_", " ").toUpperCase();
                    }
                  };

                  const getActivityContent = () => {
                    if (!activity.enrichedData) return activity.details || "";

                    switch (activity.action) {
                      case "left_review":
                        return (
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              <strong>Rating:</strong>{" "}
                              {"⭐".repeat(activity.enrichedData.rating)}
                            </div>
                            {activity.enrichedData.comment && (
                              <div>
                                <strong>Review:</strong>{" "}
                                <span style={{ fontStyle: "italic" }}>
                                  "
                                  {activity.enrichedData.comment.length > 100
                                    ? `${activity.enrichedData.comment.substring(
                                        0,
                                        100
                                      )}...`
                                    : activity.enrichedData.comment}
                                  "
                                </span>
                              </div>
                            )}
                          </div>
                        );

                      case "left_reply":
                        return (
                          <div>
                            {activity.enrichedData.comment && (
                              <div>
                                <strong>Reply:</strong>{" "}
                                <span style={{ fontStyle: "italic" }}>
                                  "
                                  {activity.enrichedData.comment.length > 100
                                    ? `${activity.enrichedData.comment.substring(
                                        0,
                                        100
                                      )}...`
                                    : activity.enrichedData.comment}
                                  "
                                </span>
                              </div>
                            )}
                          </div>
                        );

                      case "created_list":
                        return (
                          <div>
                            <span
                              style={{
                                color: "#6c2eb6",
                                fontWeight: "bold",
                              }}
                            >
                              {activity.enrichedData.name}
                            </span>
                          </div>
                        );

                      case "liked_review":
                      case "liked_reply":
                      case "added_to_watching":
                      case "added_to_finished":
                      case "added_to_dropped":
                      case "added_favorite":
                      case "moved_from_watching_to_finished":
                      case "moved_from_watching_to_dropped":
                      case "moved_from_finished_to_watching":
                      case "moved_from_finished_to_dropped":
                      case "moved_from_dropped_to_watching":
                      case "moved_from_dropped_to_finished":
                      case "removed_from_favorites":
                      case "readded_to_favorites":
                      case "removed_from_list":
                      case "added_to_list":
                      case "readded_to_list":
                        return null;

                      default:
                        return activity.details || "";
                    }
                  };

                  return (
                    <div
                      key={activity._id || index}
                      style={{
                        padding: 16,
                        marginBottom: 12,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        backgroundColor: "#fff",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: 8,
                          color: "#6c2eb6",
                          fontSize: "1.1em",
                        }}
                      >
                        {getActivityTitle()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9em",
                          color: "#666",
                          marginBottom: 8,
                        }}
                        title={new Date(activity.timestamp).toLocaleString()}
                      >
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: "0.95em", lineHeight: 1.4 }}>
                        {getActivityContent()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#666", textAlign: "center", padding: 40 }}>
                <p>No recent activity yet.</p>
                <p style={{ fontSize: "0.9em" }}>
                  Start interacting with shows to see your activity here!
                </p>
              </div>
            )}
          </div>
        )}

        {activityTab === "following" && (
          <div>
            {followingActivityLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <p>Loading following activity...</p>
              </div>
            ) : followingActivityData && followingActivityData.length > 0 ? (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {followingActivityData.map((activity, index) => {
                  const getActivityTitle = () => {
                    const username =
                      activity.enrichedData?.username ||
                      activity.username ||
                      "Unknown User";
                    switch (activity.action) {
                      case "left_review":
                        const showMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const showTitle = showMeta
                          ? showMeta.name ||
                            showMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            left a review on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {showTitle}
                            </span>
                          </span>
                        );
                      case "left_reply":
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            left a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#reply-${activity.enrichedData.replyID}`
                                )
                              }
                            >
                              reply
                            </span>{" "}
                            in response to{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/user/${activity.enrichedData.parentUserID}`
                                )
                              }
                            >
                              {activity.enrichedData.parentUsername}
                            </span>
                          </span>
                        );
                      case "created_list":
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            created a list
                          </span>
                        );
                      case "liked_review":
                        const likedReviewShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const likedReviewShowTitle = likedReviewShowMeta
                          ? likedReviewShowMeta.name ||
                            likedReviewShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            liked a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#review-${activity.enrichedData.reviewID}`
                                )
                              }
                            >
                              review
                            </span>{" "}
                            on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {likedReviewShowTitle}
                            </span>
                          </span>
                        );
                      case "liked_reply":
                        const likedReplyShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const likedReplyShowTitle = likedReplyShowMeta
                          ? likedReplyShowMeta.name ||
                            likedReplyShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            liked a{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}#reply-${activity.enrichedData.replyID}`
                                )
                              }
                            >
                              reply
                            </span>{" "}
                            on{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {likedReplyShowTitle}
                            </span>
                          </span>
                        );
                      case "added_to_watching":
                        const watchingShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const watchingShowTitle = watchingShowMeta
                          ? watchingShowMeta.name ||
                            watchingShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {watchingShowTitle}
                            </span>{" "}
                            to Watching
                          </span>
                        );
                      case "added_to_finished":
                        const finishedShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const finishedShowTitle = finishedShowMeta
                          ? finishedShowMeta.name ||
                            finishedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {finishedShowTitle}
                            </span>{" "}
                            to Finished
                          </span>
                        );
                      case "added_to_dropped":
                        const droppedShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const droppedShowTitle = droppedShowMeta
                          ? droppedShowMeta.name ||
                            droppedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {droppedShowTitle}
                            </span>{" "}
                            to Dropped
                          </span>
                        );
                      case "moved_from_watching_to_finished":
                        const moveToFinishedShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToFinishedShowTitle = moveToFinishedShowMeta
                          ? moveToFinishedShowMeta.name ||
                            moveToFinishedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToFinishedShowTitle}
                            </span>{" "}
                            from Watching to Finished
                          </span>
                        );
                      case "moved_from_watching_to_dropped":
                        const moveToDroppedShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToDroppedShowTitle = moveToDroppedShowMeta
                          ? moveToDroppedShowMeta.name ||
                            moveToDroppedShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToDroppedShowTitle}
                            </span>{" "}
                            from Watching to Dropped
                          </span>
                        );
                      case "moved_from_finished_to_watching":
                        const moveToWatchingShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveToWatchingShowTitle = moveToWatchingShowMeta
                          ? moveToWatchingShowMeta.name ||
                            moveToWatchingShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveToWatchingShowTitle}
                            </span>{" "}
                            from Finished to Watching
                          </span>
                        );
                      case "moved_from_finished_to_dropped":
                        const moveFinishedToDroppedShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveFinishedToDroppedShowTitle =
                          moveFinishedToDroppedShowMeta
                            ? moveFinishedToDroppedShowMeta.name ||
                              moveFinishedToDroppedShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveFinishedToDroppedShowTitle}
                            </span>{" "}
                            from Finished to Dropped
                          </span>
                        );
                      case "moved_from_dropped_to_watching":
                        const moveDroppedToWatchingShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveDroppedToWatchingShowTitle =
                          moveDroppedToWatchingShowMeta
                            ? moveDroppedToWatchingShowMeta.name ||
                              moveDroppedToWatchingShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveDroppedToWatchingShowTitle}
                            </span>{" "}
                            from Dropped to Watching
                          </span>
                        );
                      case "moved_from_dropped_to_finished":
                        const moveDroppedToFinishedShowMeta = activity
                          .enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const moveDroppedToFinishedShowTitle =
                          moveDroppedToFinishedShowMeta
                            ? moveDroppedToFinishedShowMeta.name ||
                              moveDroppedToFinishedShowMeta.title ||
                              activity.enrichedData.showID
                            : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            moved{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {moveDroppedToFinishedShowTitle}
                            </span>{" "}
                            from Dropped to Finished
                          </span>
                        );
                      case "removed_from_favorites":
                        const removedFavoriteShowMeta = activity.enrichedData
                          .showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const removedFavoriteShowTitle = removedFavoriteShowMeta
                          ? removedFavoriteShowMeta.name ||
                            removedFavoriteShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            removed{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {removedFavoriteShowTitle}
                            </span>{" "}
                            from Favorites
                          </span>
                        );
                      case "added_favorite":
                        const favoriteShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const favoriteShowTitle = favoriteShowMeta
                          ? favoriteShowMeta.name ||
                            favoriteShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {favoriteShowTitle}
                            </span>{" "}
                            to Favorites
                          </span>
                        );
                      case "removed_from_list":
                        const removedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const removedListShowTitle = removedListShowMeta
                          ? removedListShowMeta.name ||
                            removedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            removed{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {removedListShowTitle}
                            </span>{" "}
                            from a list
                          </span>
                        );
                      case "added_to_list":
                        const addedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const addedListShowTitle = addedListShowMeta
                          ? addedListShowMeta.name ||
                            addedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {addedListShowTitle}
                            </span>{" "}
                            to{" "}
                            <span>
                              {activity.enrichedData.listName || "a list"}
                            </span>
                          </span>
                        );
                      case "readded_to_list":
                        const readdedListShowMeta = activity.enrichedData.showID
                          ? showsMeta[activity.enrichedData.showID]
                          : null;
                        const readdedListShowTitle = readdedListShowMeta
                          ? readdedListShowMeta.name ||
                            readdedListShowMeta.title ||
                            activity.enrichedData.showID
                          : activity.enrichedData.showID || "Unknown Show";
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            re-added{" "}
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(
                                  `/shows/${activity.enrichedData.showID}`
                                )
                              }
                            >
                              {readdedListShowTitle}
                            </span>{" "}
                            to a list
                          </span>
                        );
                      default:
                        return (
                          <span>
                            <span
                              style={{
                                color: "#6c2eb6",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                navigate(`/user/${activity.userID}`)
                              }
                            >
                              {username}
                            </span>{" "}
                            {activity.action.replace("_", " ")}
                          </span>
                        );
                    }
                  };

                  const getActivityContent = () => {
                    if (!activity.enrichedData) return activity.details || "";

                    switch (activity.action) {
                      case "left_review":
                        return (
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              <strong>Rating:</strong>{" "}
                              {"⭐".repeat(activity.enrichedData.rating)}
                            </div>
                            {activity.enrichedData.comment && (
                              <div>
                                <strong>Review:</strong>{" "}
                                <span style={{ fontStyle: "italic" }}>
                                  "
                                  {activity.enrichedData.comment.length > 100
                                    ? `${activity.enrichedData.comment.substring(
                                        0,
                                        100
                                      )}...`
                                    : activity.enrichedData.comment}
                                  "
                                </span>
                              </div>
                            )}
                          </div>
                        );

                      case "left_reply":
                        return (
                          <div>
                            {activity.enrichedData.comment && (
                              <div>
                                <strong>Reply:</strong>{" "}
                                <span style={{ fontStyle: "italic" }}>
                                  "
                                  {activity.enrichedData.comment.length > 100
                                    ? `${activity.enrichedData.comment.substring(
                                        0,
                                        100
                                      )}...`
                                    : activity.enrichedData.comment}
                                  "
                                </span>
                              </div>
                            )}
                          </div>
                        );

                      case "created_list":
                        return (
                          <div>
                            <span
                              style={{
                                color: "#6c2eb6",
                                fontWeight: "bold",
                              }}
                            >
                              {activity.enrichedData.name}
                            </span>
                          </div>
                        );

                      case "liked_review":
                      case "liked_reply":
                      case "added_to_watching":
                      case "added_to_finished":
                      case "added_to_dropped":
                      case "added_favorite":
                      case "moved_from_watching_to_finished":
                      case "moved_from_watching_to_dropped":
                      case "moved_from_finished_to_watching":
                      case "moved_from_finished_to_dropped":
                      case "moved_from_dropped_to_watching":
                      case "moved_from_dropped_to_finished":
                      case "removed_from_favorites":
                      case "readded_to_favorites":
                      case "removed_from_list":
                      case "readded_to_list":
                        return null;

                      default:
                        return activity.details || "";
                    }
                  };

                  return (
                    <div
                      key={activity._id || index}
                      style={{
                        padding: 16,
                        marginBottom: 12,
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        backgroundColor: "#fff",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: 8,
                          color: "#6c2eb6",
                          fontSize: "1.1em",
                        }}
                      >
                        {getActivityTitle()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9em",
                          color: "#666",
                          marginBottom: 8,
                        }}
                        title={new Date(activity.timestamp).toLocaleString()}
                      >
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: "0.95em", lineHeight: 1.4 }}>
                        {getActivityContent()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#666", textAlign: "center", padding: 40 }}>
                <p>No recent activity from users you follow yet.</p>
                <p style={{ fontSize: "0.9em" }}>
                  Follow other users to see their activity in this feed!
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
