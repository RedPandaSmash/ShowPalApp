import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { checkIsSignedIn } from "../../utils/auth";
import {
  signupContainer,
  signupHeading,
  signupForm,
  signupInput,
  signupButton,
  signupButtonHover,
} from "./signupStyles";

export default function SignUp() {
  const navigate = useNavigate();

  useEffect(() => {
    checkIsSignedIn().then((signedIn) => {
      if (signedIn) navigate("/");
    });
  }, [navigate]);

  const [form, setForm] = useState({
    username: "",
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
    const res = await fetch("http://localhost:8080/api/users/signup", {
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
      window.dispatchEvent(
        new StorageEvent("storage", { key: "token", newValue: data.token })
      );
      navigate("/");
    } else {
      alert(data.message);
      // reset form after failed submission
      setForm({
        username: "",
        email: "",
        password: "",
      });
    }
  };
  const [buttonHover, setButtonHover] = useState(false);

  return (
    <div style={signupContainer}>
      <h1 style={signupHeading}>Sign Up</h1>
      <form style={signupForm} onSubmit={handleSubmit}>
        <input
          style={signupInput}
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
        />
        <input
          style={signupInput}
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          style={signupInput}
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button
          type="submit"
          style={buttonHover ? { ...signupButton, ...signupButtonHover } : signupButton}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
