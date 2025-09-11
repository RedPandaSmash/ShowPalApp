export const footerContainer = {
  position: "static",
  left: 0,
  bottom: 0,
  width: "100%",
  color: "#fff",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  padding: window.innerWidth <= 480 ? "12px 0" : "16px 0",
  zIndex: 100,
  fontSize: window.innerWidth <= 480 ? "0.9rem" : "1rem",
};

export const footerItem = {
  margin: window.innerWidth <= 480 ? "0 8px" : "0 16px",
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
  color: "#fff",
  padding: "6px 10px", // keep padding constant so hover doesn't shift layout
  background: "transparent",
  borderRadius: 6,
  display: "inline-block",
};

export const footerItemHover = {
  color: "#6c2eb6", // royal purple
  background: "#ffd700", // yellow box
};
