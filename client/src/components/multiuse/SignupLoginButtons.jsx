import React from "react";
import { Navigate, useNavigate } from "react-router";

export default function SignupLoginButtons() {
  // hooks
  const navigate = useNavigate();
  return (
    <nav>
      <ul>
        <li onClick={() => navigate(`/signup`)}>Sign Up</li>
        <li onClick={() => navigate(`/login`)}>Log In</li>
      </ul>
    </nav>
  );
}
