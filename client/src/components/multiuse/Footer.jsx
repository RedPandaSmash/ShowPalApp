import React, { useState } from "react";
import { footerContainer, footerItem, footerItemHover } from "./footerStyles";

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
            ...footerItem,
            ...(hovered === idx ? footerItemHover : {}),
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
