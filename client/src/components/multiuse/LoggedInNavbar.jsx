import React, { useState } from "react";
import { navContainer, navList } from "./navbarStyles";
import {
  interactiveItem,
  interactiveHover,
  interactiveActive,
} from "./interactiveStyles";

export default function LoggedInNavbar() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

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
            ...(hovered ? interactiveHover : {}),
            ...(active ? interactiveActive : {}),
          }}
          onClick={() => setShowConfirm(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
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
