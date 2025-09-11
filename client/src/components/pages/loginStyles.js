export const loginContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "80vh",
  padding: window.innerWidth <= 480 ? "0 16px" : "0 20px",
};

export const loginHeading = {
  color: "#fff",
  textAlign: "center",
  fontSize: window.innerWidth <= 480 ? "1.5rem" : "2rem",
  fontWeight: "bold",
  marginBottom: window.innerWidth <= 480 ? "24px" : "32px",
  marginTop: window.innerWidth <= 480 ? "24px" : "32px",
};

export const loginForm = {
  background: "#ffd700",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  padding:
    window.innerWidth <= 480 ? "24px 20px 20px 20px" : "32px 32px 24px 32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: window.innerWidth <= 480 ? "280px" : "320px",
  maxWidth: "400px",
  width: "100%",
};

export const loginInput = {
  width: "100%",
  fontSize: window.innerWidth <= 480 ? "1rem" : "1.1rem",
  padding: window.innerWidth <= 480 ? "10px 14px" : "12px 16px",
  marginBottom: window.innerWidth <= 480 ? "16px" : "20px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  outline: "none",
  boxSizing: "border-box",
};

export const loginButton = {
  width: "100%",
  background: "#6c2eb6",
  color: "#ffd700",
  fontSize: window.innerWidth <= 480 ? "1.1rem" : "1.2rem",
  fontWeight: "bold",
  padding: window.innerWidth <= 480 ? "12px 0" : "14px 0",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: window.innerWidth <= 480 ? "8px" : "12px",
  transition: "background 0.2s, color 0.2s",
};

export const loginButtonHover = {
  background: "#4b1c7a",
  color: "#ffd700",
};
