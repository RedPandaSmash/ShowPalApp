import React, { useState } from "react";
import { useNavigate } from "react-router";
import { navContainer, navList } from "./navbarStyles";
import {
  interactiveItem,
  interactiveHover,
  interactiveActive,
} from "./interactiveStyles";
import { useAuth } from "../../context/AuthContext";

export default function LoggedInNavbar() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "token", newValue: null })
    );
    setShowConfirm(false);
  };

  return (
    <nav style={navContainer}>
      <ul style={navList}>
        <li
          style={{
            ...interactiveItem,
            ...(hoveredItem === "profile" ? interactiveHover : {}),
            ...(activeItem === "profile" ? interactiveActive : {}),
          }}
          onClick={() => {
            if (userId) navigate(`/user/${userId}`);
          }}
          onMouseEnter={() => setHoveredItem("profile")}
          onMouseLeave={() => setHoveredItem(null)}
          onMouseDown={() => setActiveItem("profile")}
          onMouseUp={() => setActiveItem(null)}
        >
          My Profile
        </li>
        <li
          style={{
            ...interactiveItem,
            ...(hoveredItem === "logout" ? interactiveHover : {}),
            ...(activeItem === "logout" ? interactiveActive : {}),
          }}
          onClick={() => setShowConfirm(true)}
          onMouseEnter={() => setHoveredItem("logout")}
          onMouseLeave={() => setHoveredItem(null)}
          onMouseDown={() => setActiveItem("logout")}
          onMouseUp={() => setActiveItem(null)}
        >
          Logout
        </li>
      </ul>
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <p style={{ color: "#000" }}>Are you sure you want to log out?</p>
            <button
              onClick={handleLogout}
              style={{
                ...interactiveItem,
                marginRight: 8,
                color: "#000",
                background: "#ffd700",
              }}
            >
              Log Out
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{ ...interactiveItem, color: "#000" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
