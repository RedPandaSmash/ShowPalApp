import React from "react";
import { useNavigate } from "react-router";

export default function Navbar() {
  // hooks
  const navigate = useNavigate();
  return (
    <nav>
      <ul>
        <li onClick={() => navigate(`/`)}>Home (Logo)</li>
        <li onClick={() => navigate(`/shows`)}>TV Shows</li>
        <li onClick={() => navigate(`/lists`)}>Lists</li>
      </ul>
    </nav>
  );
}
