import React from "react";
import {
  heroSection,
  mainBlurb,
  popularShowsSection,
  reviewsSection,
  faqSection,
} from "./homeStyles";

export default function Home() {
  return (
    <div style={{ background: "#0a174e", minHeight: "100vh", width: "100vw" }}>
      <section style={heroSection}>
        <div style={mainBlurb}>
          Welcome to ShowPal! Discover, track, and review your favorite TV
          shows.
        </div>
        <div style={popularShowsSection}>
          <h2>Recent Popular Shows</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>Show 1: The Great Adventure</li>
            <li>Show 2: Mystery Nights</li>
            <li>Show 3: Comedy Central</li>
          </ul>
        </div>
      </section>
      <section style={reviewsSection}>
        <h2>Recent Reviews</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>"Loved the suspense in Mystery Nights!" - User123</li>
          <li>"Comedy Central had me laughing all night." - TVFan</li>
        </ul>
      </section>
      <section style={faqSection}>
        <h2>Frequently Asked Questions</h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            textAlign: "left",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <li>
            <strong>How do I add shows to my lists?</strong>
            <br />
            Find the page for the show you want to add. There are three dots
            that will bring up a menu to add and remove that show from any of
            your lists!{" "}
          </li>
          <li>
            <strong>Can I write reviews?</strong>
            <br />
            Yes! Visit any show page and leave your thoughts, along with a
            rating.
          </li>
          <li>
            <strong>Is ShowPal free?</strong>
            <br />
            Absolutely. Enjoy tracking and reviewing shows at no cost.
          </li>
        </ul>
      </section>
    </div>
  );
}
