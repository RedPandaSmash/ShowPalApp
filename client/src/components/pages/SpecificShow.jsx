import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { popularShowsSection } from "./homeStyles";

export default function SpecificShow() {
  const { showID } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchShow = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/api/shows/${showID}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setShow(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load show");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchShow();
    return () => {
      mounted = false;
    };
  }, [showID]);

  if (loading) return <div style={{ padding: 24 }}>Loading show...</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;
  if (!show) return <div style={{ padding: 24 }}>No show found.</div>;

  const poster = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : null;

  return (
    <section style={{ padding: 24, color: "#fff" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div
        style={{
          ...popularShowsSection,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          color: "#000",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={show.name || show.original_name}
            style={{ width: 300, borderRadius: 8 }}
          />
        ) : null}
        <div style={{ textAlign: "left" }}>
          <h1 style={{ marginTop: 0 }}>{show.name || show.original_name}</h1>
          <p>{show.overview || "No description available."}</p>
          <p>
            <strong>First air date:</strong> {show.first_air_date || "N/A"}
          </p>
          <p>
            <strong>Seasons:</strong> {show.number_of_seasons ?? "N/A"}
          </p>
          <p>
            <strong>Episodes:</strong> {show.number_of_episodes ?? "N/A"}
          </p>
        </div>
      </div>
    </section>
  );
}
