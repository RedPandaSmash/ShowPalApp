import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from '../../context/AuthContext';
import {
  loginContainer,
  loginHeading,
  loginForm,
  loginInput,
  loginButton,
  loginButtonHover,
} from "./loginStyles";

export default function LogIn() {
  const navigate = useNavigate();

  const { refresh } = useAuth();
  useEffect(() => {
    refresh().then(() => {});
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
  const [buttonHover, setButtonHover] = useState(false);

  return (
    <div style={loginContainer}>
      <h1 style={loginHeading}>Log In</h1>
      <form style={loginForm} onSubmit={handleSubmit}>
        <input
          style={loginInput}
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          style={loginInput}
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button
          type="submit"
          style={buttonHover ? { ...loginButton, ...loginButtonHover } : loginButton}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
        >
          Log In
        </button>
      </form>
    </div>
  );
}
