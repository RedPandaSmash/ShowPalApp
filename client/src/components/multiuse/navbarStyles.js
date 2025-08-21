export const navContainer = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  width: "100%",
  padding: "12px 0",
  background: "#0a174e",
  color: "#fff",
};

export const navList = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  gap: "24px",
  listStyle: "none",
  margin: 0,
  padding: 0,
};

export const navItem = {
  cursor: "pointer",
  padding: "8px 16px",
  borderRadius: "6px",
  transition: "background 0.2s, box-shadow 0.2s, color 0.2s",
  userSelect: "none",
  color: "#fff",
};

export const navItemHover = {
  color: "#6c2eb6", // royal purple
  background: "#ffd700", // yellow highlight
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const navItemActive = {
  background: "#ffd700", // yellow highlight
  color: "#6c2eb6", // royal purple
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};
