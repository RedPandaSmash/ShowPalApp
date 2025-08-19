import React, { useEffect } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { checkIsSignedIn } from "../../utils/auth";

export default function LogIn() {
  const navigate = useNavigate();

  useEffect(() => {
    checkIsSignedIn().then((signedIn) => {
      if (signedIn) navigate("/");
    });
  }, [navigate]);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    // prevent default form submission
    e.preventDefault();

    // send API request to register user/
    const res = await fetch("http://localhost:8080/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      // Manually dispatch storage event for same-tab update
      window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: data.token }));
      navigate("/");
    } else {
      alert(data.message);
      // reset form after failed submission
      setForm({
        email: "",
        password: "",
      });
    }
  };
  return (
    <div>
      <h1>Log In</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
