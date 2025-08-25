import React, { useState } from "react";
import { useNavigate } from "react-router";
import { navContainer, navList, navItemActive } from "./navbarStyles";
import {
  interactiveItem,
  interactiveHover,
  interactiveActive,
} from "./interactiveStyles";

export default function Navbar() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);
  const items = [
    { label: "Home (Logo)", path: "/" },
    { label: "TV Shows", path: "/shows" },
    { label: "Lists", path: "/lists" },
  ];
  return (
    <nav style={navContainer}>
      <ul style={navList}>
        {items.map((item, idx) => (
          <li
            key={item.label}
            style={{
              ...interactiveItem,
              ...(hovered === idx ? interactiveHover : {}),
              ...(active === idx ? interactiveActive : {}),
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
