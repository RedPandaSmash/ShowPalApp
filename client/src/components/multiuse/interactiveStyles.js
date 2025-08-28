// Shared interactive item styles used by navbar, logged-in navbar, signup/login buttons, and footer
export const interactiveItem = {
  cursor: "pointer",
  padding: "8px 16px",
  borderRadius: 6,
  transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
  userSelect: "none",
  color: "#fff",
  background: "transparent",
  display: "inline-block",
};

export const interactiveHover = {
  color: "#6c2eb6", // royal purple
  background: "#ffd700", // yellow
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const interactiveActive = {
  background: "#ffd700",
  color: "#6c2eb6",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};

// Permanent clickable button style (yellow background, purple text)
export const interactiveButton = {
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: 6,
  background: "#ffd700",
  color: "#6c2eb6",
  border: "none",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};
