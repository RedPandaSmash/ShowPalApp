// Utility to check if user is signed in by verifying token with backend
export async function checkIsSignedIn() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const res = await fetch("http://localhost:8080/api/users/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return !!data.valid;
  } catch {
    return false;
  }
}
