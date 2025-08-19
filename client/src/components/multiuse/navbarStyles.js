export const navContainer = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  width: "100%",
  padding: "12px 0",
  background: "#f8f8f8",
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
  transition: "background 0.2s, box-shadow 0.2s",
  userSelect: "none",
};

export const navItemHover = {
  background: "#e0e0e0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const navItemActive = {
  background: "#d1d1d1",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
};
