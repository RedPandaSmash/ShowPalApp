import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  navContainer,
  navList,
  navItem,
  navItemHover,
  navItemActive,
} from "./navbarStyles";

export default function SignupLoginButtons() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);
  const items = [
    { label: "Sign Up", path: "/signup" },
    { label: "Log In", path: "/login" },
  ];
  return (
    <nav style={navContainer}>
      <ul style={navList}>
        {items.map((item, idx) => (
          <li
            key={item.label}
            style={{
              ...navItem,
              ...(hovered === idx ? navItemHover : {}),
              ...(active === idx ? navItemActive : {}),
            }}
            onClick={() => navigate(item.path)}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            onMouseDown={() => setActive(idx)}
            onMouseUp={() => setActive(null)}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </nav>
  );
}
