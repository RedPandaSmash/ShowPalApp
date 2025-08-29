import React from "react";
import { useParams } from "react-router";

export default function UserPage() {
  const { userId } = useParams();
  return (
    <section style={{ padding: 24 }}>
      <h2>User Page</h2>
      <p>This will display profile info for user ID: {userId}</p>
      <p>Work in progress — profile details will be implemented later.</p>
    </section>
  );
}
