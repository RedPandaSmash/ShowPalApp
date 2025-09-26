import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({
  isSignedIn: false,
  userId: null,
  refresh: () => {},
});

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState(null);

  const refresh = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsSignedIn(false);
      setUserId(null);
      return;
    }
    try {
      const res = await fetch("/api/users/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setIsSignedIn(false);
        setUserId(null);
        return;
      }
      const data = await res.json();
      if (data && data.valid && data.decoded && data.decoded.id) {
        setIsSignedIn(true);
        setUserId(data.decoded.id);
      } else {
        setIsSignedIn(false);
        setUserId(null);
      }
    } catch (err) {
      setIsSignedIn(false);
      setUserId(null);
    }
  };

  useEffect(() => {
    refresh();
    const onStorage = (e) => {
      if (e.key === "token") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ isSignedIn, userId, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
