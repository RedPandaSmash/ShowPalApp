import React, { useState } from "react";
import { footerContainer } from "./footerStyles";
import { interactiveItem, interactiveHover } from "./interactiveStyles";

export default function Footer() {
  const [hovered, setHovered] = useState(null);
  const items = [
    { label: "© 2025 ShowPal" },
    { label: "Contact" },
    { label: "Privacy" },
    { label: "Terms" },
  ];
  return (
    <footer style={footerContainer}>
      {items.map((item, idx) => (
        <span
          key={item.label}
          style={{
            ...interactiveItem,
            ...(hovered === idx ? interactiveHover : {}),
            color:
              hovered === idx ? interactiveHover.color : interactiveItem.color,
          }}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          {item.label}
        </span>
      ))}
    </footer>
  );
}
